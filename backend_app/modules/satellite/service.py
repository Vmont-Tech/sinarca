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

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.satellite import CopernicusUsageRecord
from backend_app.db.models import (
    CopernicusApiUsage,
    Project,
    ProjectBaseline,
    SatelliteJob,
    SatelliteObservation,
)
from backend_app.db.repositories import create_audit_event
from backend_app.modules.satellite.constants import (
    BASELINE_SOURCE_COPERNICUS,
    SATELLITE_JOB_ACTIVE_STATUSES,
    SATELLITE_JOB_TYPES,
    SENTINEL_STATUS_ACTIVE,
)

logger = logging.getLogger(__name__)

UsageRecorder = Callable[[CopernicusUsageRecord], Awaitable[None]]


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
