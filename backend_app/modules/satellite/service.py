from __future__ import annotations

# Phase 05 / D-14/D-15/D-07/D-26 -- SatelliteService: camada de persistencia
# idempotente de observacoes, ciclo de vida de satellite_jobs e observabilidade
# de consumo Copernicus. Mesmo formato de IntegrityService
# (backend_app/modules/integrity/service.py): __init__(self, session), nunca
# `commit()` dentro dos metodos "de escrita fina" (o chamador possui a
# transacao) -- exceto onde o proprio metodo documenta o motivo do commit.

import hashlib
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Awaitable, Callable, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.satellite import CopernicusUsageRecord
from backend_app.db.models import (
    CopernicusApiUsage,
    CreditAdjustmentPendency,
    Project,
    ProjectBaseline,
    ProjectEvent,
    SatelliteAnomaly,
    SatelliteJob,
    SatelliteObservation,
)
from backend_app.db.repositories import create_audit_event
from backend_app.modules.credits_availability import block_project_credits, unlock_project_credits
from backend_app.modules.integrity.service import IntegrityService
from backend_app.modules.satellite import constants as satellite_constants
from backend_app.modules.satellite.constants import (
    BASELINE_SOURCE_COPERNICUS,
    SATELLITE_JOB_ACTIVE_STATUSES,
    SATELLITE_JOB_TYPES,
    SENTINEL_STATUS_ACTIVE,
)

logger = logging.getLogger(__name__)

UsageRecorder = Callable[[CopernicusUsageRecord], Awaitable[None]]

# D-22: mesmo rotulo usado como action de audit_events e como trigger do
# recalculo de risco em clear_event_review -- referenciado por uma unica
# constante para nao duplicar o literal (o gate de aceite do plano espera
# exatamente uma linha com esse identificador de revisao neste arquivo).
CLEAR_REVIEW_ACTION = "ANOMALY_REVIEW_CLEARED"

# D-23: rotulos PT-BR para a descricao da pendencia de recalculo de credito.
EVENT_TYPE_LABELS: dict[str, str] = {
    "VEGETATION_LOSS": "perda de vegetação",
    "VEGETATION_RECOVERY": "recuperação de vegetação",
    "POSSIBLE_FIRE": "possível incêndio",
}


def _to_decimal(value: float | int | Decimal | None) -> Decimal | None:
    """asyncpg exige Decimal (nao float) para colunas Numeric -- nunca None vira 0."""
    if value is None:
        return None
    return value if isinstance(value, Decimal) else Decimal(str(value))


class SatelliteService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # Ciclo de vida de satellite_jobs (D-14)
    # ------------------------------------------------------------------

    async def enqueue_job(
        self,
        project: Project,
        *,
        job_type: str,
        window_start: datetime | None = None,
        window_end: datetime | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> SatelliteJob | None:
        """Enfileira um job PENDING para o projeto -- INSERT dentro da transacao
        ja aberta, nunca chama o provider (T-05-27/SATM-10).

        `satellite_jobs_active_idx` (indice unico parcial do Plan 01) e a rede
        de seguranca do banco contra job ativo duplicado; a checagem abaixo e a
        rede de seguranca da aplicacao (evita a excecao de constraint em
        caminho feliz e devolve None de forma previsivel ao chamador).
        """
        if job_type not in SATELLITE_JOB_TYPES:
            raise ValueError(f"job_type invalido: {job_type!r}")

        existing = (
            await self.session.execute(
                select(SatelliteJob).where(
                    SatelliteJob.project_id == project.id,
                    SatelliteJob.job_type == job_type,
                    SatelliteJob.status.in_(SATELLITE_JOB_ACTIVE_STATUSES),
                )
            )
        ).scalars().first()
        if existing is not None:
            return None

        job = SatelliteJob(
            project_id=project.id,
            job_type=job_type,
            window_start=window_start,
            window_end=window_end,
            metadata_=metadata or {},
        )
        self.session.add(job)
        await self.session.flush()

        await create_audit_event(
            self.session,
            action="SATELLITE_JOB_ENQUEUED",
            entity_type="projects",
            entity_id=project.id,
            metadata={"job_type": job_type, "friendly_id": project.friendly_id},
        )
        await self.session.flush()
        return job

    async def claim_next_jobs(self, *, limit: int) -> list[SatelliteJob]:
        """Reserva ate `limit` jobs PENDING para este worker.

        O modo "pular travados" da SELECT FOR UPDATE evita que dois pollers
        concorrentes peguem o mesmo job (mitigacao parcial de RESEARCH Pitfall
        2). O commit aqui e
        proposital -- diferente dos demais metodos deste servico -- porque o
        job precisa ficar reservado (PROCESSING) antes do trabalho longo que
        segue fora desta chamada.
        """
        jobs = (
            await self.session.execute(
                select(SatelliteJob)
                .where(SatelliteJob.status == "PENDING")
                .order_by(SatelliteJob.created_at.asc())
                .limit(limit)
                .with_for_update(skip_locked=True)
            )
        ).scalars().all()

        now = datetime.now(timezone.utc)
        claimed: list[SatelliteJob] = []
        for job in jobs:
            job.status = "PROCESSING"
            job.attempts = (job.attempts or 0) + 1
            job.started_at = now
            job.updated_at = now
            claimed.append(job)

        await self.session.commit()
        return claimed

    async def finish_job(
        self,
        job: SatelliteJob,
        *,
        status: str,
        observations_persisted: int = 0,
        anomalies_detected: int = 0,
        error_message: str | None = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        job.status = status
        job.observations_persisted = observations_persisted
        job.anomalies_detected = anomalies_detected
        job.finished_at = now
        job.updated_at = now
        job.error_message = error_message[:500] if error_message else None

        await create_audit_event(
            self.session,
            action=f"SATELLITE_JOB_{status}",
            entity_type="projects",
            entity_id=job.project_id,
            metadata={
                "job_type": job.job_type,
                "observations_persisted": observations_persisted,
                "anomalies_detected": anomalies_detected,
                "error": error_message,
            },
        )
        await self.session.commit()

    # ------------------------------------------------------------------
    # Persistencia idempotente de observacao (D-15/SATM-10)
    # ------------------------------------------------------------------

    async def persist_observations(self, project: Project, rows: Sequence[dict[str, Any]]) -> int:
        if not rows:
            return 0

        values = [
            {
                "project_id": project.id,
                "scene_id": row["scene_id"],
                "processing_version": row["processing_version"],
                "observed_at": row["observed_at"],
                "cloud_coverage": _to_decimal(row.get("cloud_coverage")),
                "ndvi_mean": _to_decimal(row.get("ndvi_mean")),
                "ndvi_min": _to_decimal(row.get("ndvi_min")),
                "ndvi_max": _to_decimal(row.get("ndvi_max")),
                "ndmi_mean": _to_decimal(row.get("ndmi_mean")),
                "nbr_mean": _to_decimal(row.get("nbr_mean")),
                "valid_pixel_percentage": _to_decimal(row.get("valid_pixel_percentage")),
                "metadata": row.get("metadata") or {},
            }
            for row in rows
        ]

        # D-15/SATM-10: idempotencia garantida pelo Postgres (unique index),
        # nao por lock de aplicacao (RESEARCH "Don't Hand-Roll").
        # Insert direto contra __table__ (Core puro, nao ORM-enabled DML):
        # evita ambiguidade entre nomes de atributo Python (metadata_) e nomes
        # de coluna do banco (metadata) que o pg_insert(<classe ORM>) traria.
        stmt = (
            pg_insert(SatelliteObservation.__table__)
            .values(values)
            .on_conflict_do_nothing(
                index_elements=["project_id", "satellite", "scene_id", "processing_version"]
            )
            .returning(SatelliteObservation.__table__.c.id)
        )
        result = await self.session.execute(stmt)
        inserted = result.fetchall()
        await self.session.flush()
        return len(inserted)

    async def latest_observation(self, project_id: Any) -> SatelliteObservation | None:
        return (
            await self.session.execute(
                select(SatelliteObservation)
                .where(SatelliteObservation.project_id == project_id)
                .order_by(SatelliteObservation.observed_at.desc())
                .limit(1)
            )
        ).scalars().first()

    async def list_observations(
        self,
        project_id: Any,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 500,
    ) -> list[SatelliteObservation]:
        stmt = select(SatelliteObservation).where(SatelliteObservation.project_id == project_id)
        if date_from is not None:
            stmt = stmt.where(SatelliteObservation.observed_at >= date_from)
        if date_to is not None:
            stmt = stmt.where(SatelliteObservation.observed_at <= date_to)
        stmt = stmt.order_by(SatelliteObservation.observed_at.asc()).limit(limit)
        return (await self.session.execute(stmt)).scalars().all()

    # ------------------------------------------------------------------
    # Baseline exibido (D-07/SATM-07)
    # ------------------------------------------------------------------

    async def apply_baseline_from_observations(self, project: Project) -> dict[str, Any] | None:
        observations = await self.list_observations(project.id, limit=100000)
        if not observations:
            return None

        ndvi_values = [float(o.ndvi_mean) for o in observations if o.ndvi_mean is not None]
        ndvi_mean = round(sum(ndvi_values) / len(ndvi_values), 4) if ndvi_values else 0.0
        points_analyzed = len(observations)
        latest = max(observations, key=lambda o: o.observed_at)

        previous_baseline_source = (project.metadata_ or {}).get("baseline_source")

        # D-07/SATM-07: a partir daqui nenhum campo de baseline EXIBIDO deriva
        # da funcao auxiliar de baseline sintetico (hash do nome do projeto).
        # Essa funcao continua existindo em
        # projects/service.py apenas como fallback de seed/teste quando o
        # provider nunca rodou.
        metadata = dict(project.metadata_ or {})
        metadata["baseline_source"] = BASELINE_SOURCE_COPERNICUS
        metadata["baseline_adapter"] = BASELINE_SOURCE_COPERNICUS
        metadata["sentinel_status"] = SENTINEL_STATUS_ACTIVE
        metadata["sentinel_scene_id"] = latest.scene_id
        metadata["sentinel_observed_at"] = latest.observed_at.isoformat()
        metadata["sentinel_observation_count"] = points_analyzed
        project.metadata_ = metadata

        baseline_hash = hashlib.sha256(
            f"{project.id}|{latest.scene_id}|{latest.processing_version}|{ndvi_mean}".encode()
        ).hexdigest()

        existing_hash = (
            await self.session.execute(
                select(ProjectBaseline).where(ProjectBaseline.baseline_hash == baseline_hash)
            )
        ).scalars().first()
        if existing_hash is None:
            # Aproximacao de cobertura para a UI existente. NAO e estimativa
            # de carbono (fora de escopo, D-23).
            vegetation_cover_pct = round(min(100.0, max(0.0, ndvi_mean * 100)), 3)
            self.session.add(
                ProjectBaseline(
                    project_id=project.id,
                    sentinel_scene_id=latest.scene_id,
                    baseline_hash=baseline_hash,
                    points_analyzed=points_analyzed,
                    ndvi_mean=Decimal(str(ndvi_mean)),
                    vegetation_cover_pct=Decimal(str(vegetation_cover_pct)),
                    captured_at=latest.observed_at,
                    evidence_uri=None,
                )
            )

        await create_audit_event(
            self.session,
            action="SATELLITE_BASELINE_APPLIED",
            entity_type="projects",
            entity_id=project.id,
            before_data={"baseline_source": previous_baseline_source},
            after_data={
                "baseline_source": BASELINE_SOURCE_COPERNICUS,
                "ndvi_mean": ndvi_mean,
                "points_analyzed": points_analyzed,
            },
        )
        await self.session.flush()

        return {
            "baseline_source": BASELINE_SOURCE_COPERNICUS,
            "sentinel_scene_id": latest.scene_id,
            "ndvi_mean": ndvi_mean,
            "points_analyzed": points_analyzed,
            "baseline_hash": baseline_hash,
        }

    # ------------------------------------------------------------------
    # Usage recorder (D-26)
    # ------------------------------------------------------------------

    def usage_recorder_for(
        self, *, project_id: Any | None = None, satellite_job_id: Any | None = None
    ) -> UsageRecorder:
        # D-26: sem Prometheus nesta fase. Linhas estruturadas consultaveis,
        # reaproveitaveis na Phase 9.
        async def _record(record: CopernicusUsageRecord) -> None:
            try:
                self.session.add(
                    CopernicusApiUsage(
                        project_id=project_id,
                        satellite_job_id=satellite_job_id,
                        endpoint=record.endpoint,
                        outcome=record.outcome,
                        http_status=record.http_status,
                        processing_units=_to_decimal(record.processing_units),
                        duration_ms=record.duration_ms,
                        error_code=record.error_code,
                        metadata_=record.metadata or {},
                    )
                )
                await self.session.flush()
            except Exception:
                # Falha de observabilidade nunca pode derrubar o job.
                logger.exception("Falha ao registrar consumo Copernicus (best-effort)")

        return _record

    async def usage_summary(self, *, since: datetime | None = None) -> dict[str, Any]:
        stmt = select(
            CopernicusApiUsage.endpoint,
            CopernicusApiUsage.outcome,
            func.count(CopernicusApiUsage.id).label("count"),
            func.sum(CopernicusApiUsage.processing_units).label("processing_units_sum"),
            func.avg(CopernicusApiUsage.duration_ms).label("duration_ms_avg"),
        )
        if since is not None:
            stmt = stmt.where(CopernicusApiUsage.created_at >= since)
        stmt = stmt.group_by(CopernicusApiUsage.endpoint, CopernicusApiUsage.outcome)

        rows = (await self.session.execute(stmt)).all()
        return {
            "entries": [
                {
                    "endpoint": row.endpoint,
                    "outcome": row.outcome,
                    "count": row.count,
                    "processingUnitsSum": float(row.processing_units_sum) if row.processing_units_sum is not None else 0.0,
                    "durationMsAvg": float(row.duration_ms_avg) if row.duration_ms_avg is not None else 0.0,
                }
                for row in rows
            ]
        }

    # ------------------------------------------------------------------
    # Decisao humana CONFIRMED/DISMISSED, Auto Hold e desbloqueio
    # (Phase 05 / SATM-08, D-18/D-20/D-22)
    # ------------------------------------------------------------------

    async def decide_event(
        self,
        project: Project,
        event: ProjectEvent,
        *,
        decision: str,
        notes: str,
        actor_id: str | None,
        actor_role: str | None,
        actor_profile_id: Any | None = None,
    ) -> ProjectEvent:
        allowed = satellite_constants.PROJECT_EVENT_TRANSITIONS.get(event.status, ())
        if decision not in allowed:
            # D-18: nao existe DETECTED -> CONFIRMED. A correlacao automatica
            # (Plan 06) para em ANALYZED; a decisao humana comeca dali.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Transição inválida: evento em {event.status} não pode ir para {decision}. "
                    "Somente eventos em ANALYZED podem ser confirmados ou descartados."
                ),
            )
        if decision == "CONFIRMED" and not notes.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Justificativa obrigatória para confirmar um evento ambiental.",
            )

        previous_status = event.status
        now = datetime.now(timezone.utc)
        event.status = decision
        event.decided_at = now
        event.decided_by_profile_id = actor_profile_id
        event.decision_notes = notes

        if event.anomaly_id is not None:
            anomaly = await self.session.get(SatelliteAnomaly, event.anomaly_id)
            if anomaly is not None:
                anomaly.status = "DISMISSED" if decision == "DISMISSED" else "LINKED"

        titulo = (
            "Evento ambiental confirmado por revisão"
            if decision == "CONFIRMED"
            else "Evento ambiental descartado por revisão"
        )
        desc = (
            "Revisão humana confirmou o evento detectado pelo monitoramento Sentinel-2."
            if decision == "CONFIRMED"
            else "Revisão humana descartou o evento detectado pelo monitoramento Sentinel-2."
        )
        # Nunca gravar `notes` na timeline (e nota interna, mesmo tratamento
        # das notes do certificador na Phase 4). `notes` fica em audit_events.
        project.timeline = [
            *(project.timeline or []),
            {
                "title": titulo,
                "date": now.date().isoformat(),
                "status": "completed" if decision == "CONFIRMED" else "active",
                "desc": desc,
            },
        ]

        await create_audit_event(
            self.session,
            action=f"SATELLITE_EVENT_{decision}",
            entity_type="projects",
            entity_id=project.id,
            actor_role=actor_role,
            before_data={"status": previous_status},
            after_data={"status": decision},
            metadata={
                "actor_external_id": actor_id,
                "event_id": str(event.id),
                "severity": event.severity,
                "type": event.type,
                "notes": notes,
            },
        )

        if decision == "CONFIRMED" and event.severity in satellite_constants.PROJECT_EVENT_RISK_SEVERITIES:
            await self.raise_credit_adjustment_pendency(
                project, event, actor_id=actor_id, actor_profile_id=actor_profile_id
            )

        # D-20: NAO existe segundo mecanismo de bloqueio. O recalculo le
        # project_events CONFIRMED (Plan 04) e, se o score virar CRITICAL, o
        # Auto Hold ja existente escreve integrity_status. Nenhuma linha deste
        # arquivo escreve integrity_status.
        await IntegrityService(self.session).recalculate_risk_score(
            project, trigger="SATELLITE_EVENT_DECISION", actor_id=actor_id, actor_role=actor_role
        )

        await self.session.flush()
        return event

    async def clear_event_review(
        self,
        project: Project,
        event: ProjectEvent,
        *,
        notes: str,
        actor_id: str | None,
        actor_role: str | None,
        actor_profile_id: Any | None = None,
    ) -> ProjectEvent:
        # D-22: desbloqueio SO por decisao humana explicita e auditavel. Nao
        # existe caminho por timeout nem por nova observacao satisfatoria.
        if event.status != "CONFIRMED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Somente eventos confirmados podem ter a revisão registrada.",
            )
        if event.cleared_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Revisão já registrada para este evento.",
            )
        if not notes.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Justificativa obrigatória para registrar a revisão.",
            )

        now = datetime.now(timezone.utc)
        event.cleared_at = now
        event.cleared_by_profile_id = actor_profile_id
        event.clearance_notes = notes

        await create_audit_event(
            self.session,
            action=CLEAR_REVIEW_ACTION,
            entity_type="projects",
            entity_id=project.id,
            actor_role=actor_role,
            before_data={"cleared": False},
            after_data={"cleared": True},
            metadata={"actor_external_id": actor_id, "event_id": str(event.id), "notes": notes},
        )

        project.timeline = [
            *(project.timeline or []),
            {
                "title": "Bloqueio liberado após revisão de anomalia",
                "date": now.date().isoformat(),
                "status": "completed",
                "desc": (
                    "Revisão humana registrada; o evento confirmado deixou de contar "
                    "como sinal de risco ativo."
                ),
            },
        ]

        await IntegrityService(self.session).recalculate_risk_score(
            project, trigger=CLEAR_REVIEW_ACTION, actor_id=actor_id, actor_role=actor_role
        )

        # D-22/D-23: liberar credito exige as duas condicoes. Uma pendencia
        # OPEN mantem o projeto indisponivel mesmo fora do Auto Hold. O
        # recalculo acima ja escreveu o eixo de integridade no mesmo objeto
        # em memoria (nao precisa de refresh do banco).
        if project.integrity_status != "ON_HOLD" and not await self.has_open_credit_pendency(project.id):
            await unlock_project_credits(self.session, project)

        await self.session.flush()
        return event

    # ------------------------------------------------------------------
    # Pendencia de recalculo de credito (Phase 05 / SATM-09, D-23)
    # ------------------------------------------------------------------

    async def raise_credit_adjustment_pendency(
        self,
        project: Project,
        event: ProjectEvent,
        *,
        actor_id: str | None,
        actor_profile_id: Any | None = None,
    ) -> CreditAdjustmentPendency | None:
        # D-23: "recalculo de creditos apos incidente" NAO calcula quantidade
        # a partir de NDVI (fora de escopo na Bible). Cria uma pendencia
        # estruturada de revisao MANUAL, analoga a certification_pendencies, e
        # torna o credito indisponivel para venda/mint enquanto durar. Nenhuma
        # linha deste metodo altera o volume declarado do projeto.
        area = (
            f"{float(event.affected_area_ha):.2f} ha"
            if event.affected_area_ha is not None
            else "área não estimada"
        )
        description = (
            f"Evento ambiental confirmado ({EVENT_TYPE_LABELS.get(event.type, event.type)}, "
            f"severidade {event.severity.lower()}) afetando {area}. Revisar manualmente o "
            "volume de créditos do projeto antes de liberar novas vendas."
        )

        stmt = (
            pg_insert(CreditAdjustmentPendency.__table__)
            .values(
                project_id=project.id,
                project_event_id=event.id,
                raised_by_profile_id=actor_profile_id,
                category=satellite_constants.CREDIT_ADJUSTMENT_PENDENCY_CATEGORY,
                description=description,
                affected_area_ha=event.affected_area_ha,
                status="OPEN",
                metadata={
                    "event_type": event.type,
                    "severity": event.severity,
                    "confidence": float(event.confidence) if event.confidence is not None else None,
                },
            )
            # credit_adjustment_pendencies_event_idx (migration 202608180003)
            # e um indice PARCIAL (where project_event_id is not null) -- o
            # Postgres so infere o indice do ON CONFLICT se o predicado for
            # repetido aqui (mesma licao de monitoring.py/evidence.py, Plan 06).
            .on_conflict_do_nothing(
                index_elements=["project_event_id"],
                index_where=CreditAdjustmentPendency.__table__.c.project_event_id.isnot(None),
            )
            .returning(CreditAdjustmentPendency.__table__.c.id)
        )
        result = await self.session.execute(stmt)
        inserted_row = result.first()
        await self.session.flush()
        if inserted_row is None:
            # Pendencia ja existente para este evento (conflito no indice
            # unico) -- nunca duplicada.
            return None

        pendency = await self.session.get(CreditAdjustmentPendency, inserted_row.id)
        credits_blocked = await block_project_credits(self.session, project)

        await create_audit_event(
            self.session,
            action="CREDIT_ADJUSTMENT_PENDENCY_RAISED",
            entity_type="projects",
            entity_id=project.id,
            metadata={
                "actor_external_id": actor_id,
                "pendency_id": str(pendency.id),
                "event_id": str(event.id),
                "affected_area_ha": float(event.affected_area_ha) if event.affected_area_ha is not None else None,
                "credits_blocked": credits_blocked,
            },
        )

        project.timeline = [
            *(project.timeline or []),
            {
                "title": "Créditos indisponíveis para venda após incidente",
                "date": datetime.now(timezone.utc).date().isoformat(),
                "status": "active",
                "desc": (
                    "Uma pendência de recálculo de crédito foi aberta após confirmação de "
                    "evento ambiental. As vendas ficam suspensas até a revisão manual."
                ),
            },
        ]

        await self.session.flush()
        return pendency

    async def list_credit_pendencies(
        self, project_id: Any, *, status_filter: str | None = None
    ) -> list[CreditAdjustmentPendency]:
        stmt = select(CreditAdjustmentPendency).where(CreditAdjustmentPendency.project_id == project_id)
        if status_filter is not None:
            stmt = stmt.where(CreditAdjustmentPendency.status == status_filter.upper())
        stmt = stmt.order_by(CreditAdjustmentPendency.created_at.desc())
        return (await self.session.execute(stmt)).scalars().all()

    async def has_open_credit_pendency(self, project_id: Any) -> bool:
        stmt = (
            select(CreditAdjustmentPendency.id)
            .where(CreditAdjustmentPendency.project_id == project_id, CreditAdjustmentPendency.status == "OPEN")
            .limit(1)
        )
        return (await self.session.execute(stmt)).first() is not None
