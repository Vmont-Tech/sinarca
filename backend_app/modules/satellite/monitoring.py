from __future__ import annotations

# Phase 05 / SATM-06/SATM-10 -- Monitoramento continuo: janela incremental,
# deteccao/persistencia de anomalia, avanco DETECTED -> ANALYZED (Correlation
# Engine, D-18) e evidencia visual before/after (D-19, apenas em ANALYZED).
#
# Espelha a estrutura de HistoricalReconstructionService
# (backend_app/modules/satellite/historical_reconstruction.py): todo I/O e
# assincrono, nada de chamada bloqueante, e reaproveita select_monthly_scenes/
# join_statistics_to_scenes desse mesmo modulo em vez de duplicar a logica de
# composicao mensal.
#
# D-18: o pipeline automatico vai ate ANALYZED e PARA. As transicoes para
# CONFIRMED/DISMISSED exigem decisao humana (Plan 07) -- nao existe, em
# nenhum caminho deste arquivo, atribuicao desses dois estados.

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.satellite import SatelliteProvider
from backend_app.core.config import Settings, get_settings
from backend_app.db.models import (
    Project,
    ProjectEvent,
    ProjectTag,
    SatelliteAnomaly,
    SatelliteJob,
)
from backend_app.db.repositories import create_audit_event
from backend_app.modules.projects.service import ProjectsService
from backend_app.modules.satellite.anomaly_detector import (
    AnomalySignal,
    ObservationSnapshot,
    detect_anomalies,
)
from backend_app.modules.satellite import constants as satellite_constants
from backend_app.modules.satellite.historical_reconstruction import (
    join_statistics_to_scenes,
    select_monthly_scenes,
)
from backend_app.modules.satellite.service import SatelliteService

logger = logging.getLogger(__name__)


# D-21: mapa de titulos publicos, neutros, para a timeline do projeto.
# ATENCAO: project.timeline aparece TAMBEM no dossie publico (project_to_mrca)
# -- nunca escrever nota interna aqui.
SATELLITE_EVENT_TIMELINE_TITLES: dict[str, str] = {
    "VEGETATION_LOSS": "Perda de vegetação detectada por satélite",
    "VEGETATION_RECOVERY": "Recuperação de vegetação detectada por satélite",
    "POSSIBLE_FIRE": "Possível incêndio detectado por satélite",
}


def monitoring_window(
    last_observed_at: datetime | None, now: datetime, settings: Settings | None = None
) -> tuple[datetime, datetime]:
    """Janela incremental do monitoramento continuo (SATM-10).

    Com observacao anterior, comeca exatamente onde a ultima parou -- a
    idempotencia D-15 cobre a sobreposicao de borda. Sem observacao anterior,
    usa uma janela curta (2 ciclos) em vez dos 5 anos: reconstrucao historica
    e responsabilidade do HISTORICAL_RECONSTRUCTION, nunca deste job.
    """
    config = settings or get_settings()
    if last_observed_at is not None:
        return (last_observed_at, now)
    interval_hours = max(1, int(config.satellite_monitoring_interval_hours))
    return (now - timedelta(hours=interval_hours * 2), now)


class SatelliteMonitoringService:
    def __init__(
        self, session: AsyncSession, provider: SatelliteProvider, settings: Settings | None = None
    ) -> None:
        self.session = session
        self.provider = provider
        self.settings = settings or get_settings()

    async def run(self, job: SatelliteJob) -> None:
        satellite_service = SatelliteService(self.session)
        try:
            project = await self.session.get(Project, job.project_id)
            if project is None:
                await satellite_service.finish_job(
                    job, status="FAILED", error_message="Projeto nao encontrado para o job"
                )
                return

            boundary = await ProjectsService(self.session).boundary_item(str(project.id))
            if boundary is None or boundary.get("active") is None:
                await satellite_service.finish_job(
                    job,
                    status="FAILED",
                    error_message=(
                        "Projeto sem active_boundary (Phase 04.1): monitoramento não "
                        "pode definir a AOI"
                    ),
                )
                return
            aoi = boundary["active"]

            last = await satellite_service.latest_observation(project.id)
            date_from, date_to = monitoring_window(
                last.observed_at if last else None, datetime.now(timezone.utc), self.settings
            )
            job.window_start = date_from
            job.window_end = date_to

            # D-11: duas chamadas por projeto, em serie. O scheduler ja
            # processa projetos em serie; nenhuma chamada concorrente ao
            # provider acontece dentro deste metodo.
            scenes = await self.provider.search_scenes(
                aoi=aoi,
                date_from=date_from,
                date_to=date_to,
                max_cloud_coverage=self.settings.satellite_max_cloud_coverage_pct,
            )
            statistics = await self.provider.get_statistics(
                aoi=aoi,
                date_from=date_from,
                date_to=date_to,
                aggregation_interval="P1M",
                max_cloud_coverage=self.settings.satellite_max_cloud_coverage_pct,
            )

            scenes_by_month = select_monthly_scenes(
                scenes, max_cloud_coverage=self.settings.satellite_max_cloud_coverage_pct
            )
            rows = join_statistics_to_scenes(statistics, scenes_by_month)

            # D-13: maxCloudCoverage BLOQUEIA a observacao. Nao existe
            # observacao "com ressalva".
            rows = [
                row
                for row in rows
                if row.get("cloud_coverage") is not None
                and row["cloud_coverage"] <= self.settings.satellite_max_cloud_coverage_pct
            ]

            persisted = await satellite_service.persist_observations(project, rows)
            anomalies = await self.detect_and_persist_anomalies(project)
            await satellite_service.apply_baseline_from_observations(project)
            await satellite_service.finish_job(
                job,
                status="COMPLETED",
                observations_persisted=persisted,
                anomalies_detected=len(anomalies),
            )
        except Exception as exc:  # noqa: BLE001 -- fail-closed, job nunca propaga (poller continua)
            await self.session.rollback()
            # rollback() expira todos os atributos do objeto `job` -- um GET
            # simples (ex. job.project_id dentro de finish_job) dispararia um
            # lazy-load sincrono, que o AsyncSession nao pode executar fora de
            # um contexto greenlet (MissingGreenlet). refresh() e async-safe
            # porque usa a identity key ja conhecida, sem precisar ler um
            # atributo expirado primeiro.
            await self.session.refresh(job)
            await satellite_service.finish_job(job, status="FAILED", error_message=str(exc)[:500])

    # ------------------------------------------------------------------
    # Anomalia + evento (SATM-06, D-17/D-18/D-21) -- Task 2
    # ------------------------------------------------------------------

    async def detect_and_persist_anomalies(self, project: Project) -> list[SatelliteAnomaly]:
        observations = await SatelliteService(self.session).list_observations(project.id, limit=100000)
        if len(observations) < 2:
            return []

        snapshots = [
            ObservationSnapshot(
                observed_at=obs.observed_at,
                ndvi_mean=float(obs.ndvi_mean) if obs.ndvi_mean is not None else None,
                ndmi_mean=float(obs.ndmi_mean) if obs.ndmi_mean is not None else None,
                nbr_mean=float(obs.nbr_mean) if obs.nbr_mean is not None else None,
                cloud_coverage=float(obs.cloud_coverage) if obs.cloud_coverage is not None else None,
                valid_pixel_percentage=(
                    float(obs.valid_pixel_percentage) if obs.valid_pixel_percentage is not None else None
                ),
            )
            for obs in observations
        ]
        # O modulo puro do Plan 04 faz toda a regra; NENHUMA comparacao de
        # NDVI acontece neste arquivo.
        signals = detect_anomalies(snapshots, self.settings)
        if not signals:
            return []

        boundary = await ProjectsService(self.session).boundary_item(str(project.id))
        active_area_ha = (boundary or {}).get("declaredAreaHa")

        persisted: list[SatelliteAnomaly] = []
        for idx, signal in signals:
            current = observations[idx]
            previous = observations[idx - 1]

            # Area afetada = area ativa do projeto ponderada pela queda
            # relativa do indice. NAO e um calculo de sequestro/estoque em
            # massa de CO2 (fora de escopo por D-23/Bible): e uma ordem de
            # grandeza para a revisao humana dimensionar o incidente.
            affected_area = (
                round(active_area_ha * max(0.0, signal.drop_ratio), 4) if active_area_ha else None
            )

            stmt = (
                pg_insert(SatelliteAnomaly.__table__)
                .values(
                    project_id=project.id,
                    observation_id=current.id,
                    previous_observation_id=previous.id,
                    index_name=signal.index_name,
                    value_before=Decimal(str(signal.value_before)),
                    value_after=Decimal(str(signal.value_after)),
                    drop_ratio=Decimal(str(signal.drop_ratio)),
                    severity=signal.severity,
                    confidence=Decimal(str(signal.confidence)),
                    affected_area_ha=Decimal(str(affected_area)) if affected_area is not None else None,
                    status="PENDING_ANALYSIS",
                    reason=signal.reason,
                    detected_at=current.observed_at,
                    metadata={"event_type": signal.event_type, **signal.metadata},
                )
                .on_conflict_do_nothing(index_elements=["project_id", "observation_id", "index_name"])
                .returning(SatelliteAnomaly.__table__.c.id)
            )
            result = await self.session.execute(stmt)
            inserted_row = result.first()
            await self.session.flush()
            if inserted_row is None:
                # Anomalia ja existente (conflito) e simplesmente pulada --
                # sem update, sem evento novo.
                continue

            anomaly = await self.session.get(SatelliteAnomaly, inserted_row.id)

            await create_audit_event(
                self.session,
                action="SATELLITE_ANOMALY_DETECTED",
                entity_type="projects",
                entity_id=project.id,
                metadata={
                    "anomaly_id": str(anomaly.id),
                    "index": signal.index_name,
                    "severity": signal.severity,
                    "drop_ratio": signal.drop_ratio,
                    "observed_at": current.observed_at.isoformat(),
                },
            )

            await self.correlate_and_create_event(project, anomaly, signal)
            persisted.append(anomaly)

        return persisted

    async def correlate_and_create_event(
        self, project: Project, anomaly: SatelliteAnomaly, signal: AnomalySignal
    ) -> ProjectEvent | None:
        # D-18: o pipeline automatico vai ate ANALYZED e PARA. As transicoes
        # para CONFIRMED e DISMISSED exigem decisao humana (Plan 07). Nao
        # existe, em nenhum ramo deste metodo, atribuicao desses estados.
        if (
            signal.event_type not in satellite_constants.PROJECT_EVENT_TYPES
            or signal.event_type in satellite_constants.FORBIDDEN_AUTOMATIC_EVENT_TYPES
        ):
            raise ValueError(f"Tipo de evento não permitido automaticamente: {signal.event_type}")

        ndvi_before = Decimal(str(signal.value_before)) if signal.index_name == "NDVI" else None
        ndvi_after = Decimal(str(signal.value_after)) if signal.index_name == "NDVI" else None

        stmt = (
            pg_insert(ProjectEvent.__table__)
            .values(
                project_id=project.id,
                anomaly_id=anomaly.id,
                type=signal.event_type,
                status="DETECTED",
                severity=signal.severity,
                confidence=Decimal(str(signal.confidence)),
                affected_area_ha=anomaly.affected_area_ha,
                ndvi_before=ndvi_before,
                ndvi_after=ndvi_after,
                summary=signal.reason,
                detected_at=anomaly.detected_at,
                metadata={},
            )
            # project_events_anomaly_idx (migration 202608180001) e um indice
            # PARCIAL (where anomaly_id is not null) -- o Postgres so infere
            # o indice do ON CONFLICT se o predicado for repetido aqui.
            .on_conflict_do_nothing(
                index_elements=["anomaly_id"],
                index_where=ProjectEvent.__table__.c.anomaly_id.isnot(None),
            )
            .returning(ProjectEvent.__table__.c.id)
        )
        result = await self.session.execute(stmt)
        inserted_row = result.first()
        await self.session.flush()
        if inserted_row is None:
            # Evento ja existe para esta anomalia (conflito no indice unico).
            return None

        event = await self.session.get(ProjectEvent, inserted_row.id)

        await create_audit_event(
            self.session,
            action="SATELLITE_EVENT_DETECTED",
            entity_type="projects",
            entity_id=project.id,
            metadata={"event_id": str(event.id), "type": event.type, "severity": event.severity},
        )

        # Correlacao (leve, sem intervencao humana -- o que D-18 chama de
        # "cruza com historico e QTAGs").
        confirmed_count = (
            await self.session.execute(
                select(func.count())
                .select_from(ProjectEvent)
                .where(ProjectEvent.project_id == project.id, ProjectEvent.status == "CONFIRMED")
            )
        ).scalar_one()

        stale_cutoff = anomaly.detected_at - timedelta(days=180)
        active_tags = (
            await self.session.execute(
                select(ProjectTag).where(ProjectTag.project_id == project.id, ProjectTag.status == "ACTIVE")
            )
        ).scalars().all()
        stale_qtags = [
            tag.tag_uid or tag.vertex_label
            for tag in active_tags
            if tag.last_seen_at is not None and tag.last_seen_at < stale_cutoff
        ]

        consecutive_drops = await self._count_consecutive_prior_drops(project, anomaly)

        correlation = {
            "confirmed_events_count": int(confirmed_count),
            "stale_qtags": stale_qtags,
            "consecutive_drops": consecutive_drops,
        }
        # A correlacao enriquece a explicacao mostrada ao revisor humano; ela
        # NAO altera severidade nem status. Elevar severidade automaticamente
        # seria decidir sem humano (D-18).
        event.metadata_ = {**(event.metadata_ or {}), "correlation": correlation}

        assert "ANALYZED" in satellite_constants.PROJECT_EVENT_TRANSITIONS[event.status]
        event.status = "ANALYZED"
        event.analyzed_at = datetime.now(timezone.utc)

        await create_audit_event(
            self.session,
            action="SATELLITE_EVENT_ANALYZED",
            entity_type="projects",
            entity_id=project.id,
            before_data={"status": "DETECTED"},
            after_data={"status": "ANALYZED"},
            metadata={
                "event_id": str(event.id),
                "type": event.type,
                "severity": event.severity,
                "correlation": correlation,
            },
        )

        # D-21: sem provedor de push/e-mail nesta fase. A notificacao e o
        # registro persistido e visivel: audit_events + timeline do projeto,
        # que produtor, certificadora e auditor ja consultam hoje.
        # ATENCAO: project.timeline aparece TAMBEM no dossie publico
        # (project_to_mrca), entao a descricao e publica e neutra.
        project.timeline = [
            *(project.timeline or []),
            {
                "title": SATELLITE_EVENT_TIMELINE_TITLES[event.type],
                "date": event.detected_at.date().isoformat(),
                "status": "active",
                "desc": (
                    "Monitoramento Sentinel-2 registrou variação relevante de vegetação; "
                    f"evento em análise técnica (severidade {event.severity.lower()})."
                ),
            },
        ]

        anomaly.status = "LINKED"

        # A captura de evidencia visual (Task 3) so existe a partir do Plan
        # 06 Task 3; ate la (e em qualquer falha do provider/Storage), o
        # evento permanece ANALYZED e o job permanece COMPLETED -- falha de
        # imagem NUNCA derruba o evento nem o job.
        try:
            from backend_app.modules.satellite.evidence import SatelliteEvidenceService

            await SatelliteEvidenceService(self.session, self.provider, self.settings).capture_before_after(
                project, event
            )
        except Exception:
            logger.exception("Falha ao capturar evidencia visual before/after (best-effort)")

        await self.session.flush()
        return event

    async def _count_consecutive_prior_drops(self, project: Project, anomaly: SatelliteAnomaly) -> int:
        """Conta quantas anomalias consecutivas anteriores (mesmo projeto,
        mesmo indice) ja eram queda -- persistencia do sinal, apenas contexto
        explicativo para o revisor humano (D-18). Nao altera severidade nem
        status."""
        prior = (
            await self.session.execute(
                select(SatelliteAnomaly)
                .where(
                    SatelliteAnomaly.project_id == project.id,
                    SatelliteAnomaly.index_name == anomaly.index_name,
                    SatelliteAnomaly.detected_at <= anomaly.detected_at,
                )
                .order_by(SatelliteAnomaly.detected_at.desc())
            )
        ).scalars().all()
        count = 0
        for item in prior:
            if item.drop_ratio is not None and item.drop_ratio > 0:
                count += 1
            else:
                break
        return count
