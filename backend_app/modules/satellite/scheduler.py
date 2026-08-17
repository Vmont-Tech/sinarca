from __future__ import annotations

# Phase 05 / D-14 -- Primeira infraestrutura assincrona do backend.
#
# Desenho: "enfileirar" = inserir uma linha PENDING em satellite_jobs (feito
# dentro do request, em transacao); "executar" = um poller do APScheduler que
# consome a fila fora do ciclo request/response. Isso mantem SATM-10
# ("nao bloquear requests HTTP") satisfeito e faz o trabalho sobreviver a
# restart -- diferente de BackgroundTasks, que morre com o processo.

import logging
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.copernicus import build_copernicus_provider
from backend_app.adapters.satellite import SatelliteProvider
from backend_app.core.config import Settings, get_settings
from backend_app.db.models import Project, SatelliteJob, SatelliteObservation
from backend_app.db.session import get_sessionmaker
from backend_app.modules.satellite.historical_reconstruction import HistoricalReconstructionService
from backend_app.modules.satellite.monitoring import SatelliteMonitoringService
from backend_app.modules.satellite.service import SatelliteService

logger = logging.getLogger(__name__)

JobHandler = Callable[[AsyncSession, SatelliteProvider, SatelliteJob, Settings], Awaitable[None]]


async def _dispatch_historical_reconstruction(
    session: AsyncSession, provider: SatelliteProvider, job: SatelliteJob, settings: Settings
) -> None:
    await HistoricalReconstructionService(session, provider, settings).run(job)


async def _dispatch_continuous_monitoring(
    session: AsyncSession, provider: SatelliteProvider, job: SatelliteJob, settings: Settings
) -> None:
    await SatelliteMonitoringService(session, provider, settings).run(job)


JOB_DISPATCH: dict[str, JobHandler] = {
    "HISTORICAL_RECONSTRUCTION": _dispatch_historical_reconstruction,
    "CONTINUOUS_MONITORING": _dispatch_continuous_monitoring,
}


async def run_pending_satellite_jobs(settings: Settings | None = None) -> None:
    config = settings or get_settings()
    provider = None
    # Uma excecao nao tratada dentro de um job do APScheduler mata o
    # agendamento daquele job -- por isso o ciclo inteiro fica protegido e
    # apenas loga, nunca propaga para o scheduler.
    try:
        async with get_sessionmaker()() as session:
            jobs = await SatelliteService(session).claim_next_jobs(limit=config.satellite_monitoring_batch_size)
            if not jobs:
                return

            # UM provider por ciclo, reutilizado para todos os jobs do lote:
            # o token OAuth2 cacheado e o semaforo de 2 requests concorrentes
            # (D-11) so funcionam se a instancia for compartilhada.
            provider = build_copernicus_provider(usage_recorder=SatelliteService(session).usage_recorder_for())

            # D-11: quota gratuita permite 2 requests concorrentes. Processar
            # projetos em paralelo estouraria a quota mesmo com o semaforo do
            # adapter, porque cada projeto ja faz 2 chamadas.
            for job in jobs:
                handler = JOB_DISPATCH.get(job.job_type)
                if handler is None:
                    await SatelliteService(session).finish_job(
                        job, status="FAILED", error_message=f"job_type desconhecido: {job.job_type}"
                    )
                    continue
                await handler(session, provider, job, config)
    except Exception:
        logger.exception("Falha no ciclo de satellite_jobs pendentes")
    finally:
        if provider is not None:
            await provider.aclose()


async def enqueue_due_monitoring_jobs(settings: Settings | None = None) -> None:
    config = settings or get_settings()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=config.satellite_monitoring_interval_hours)
        async with get_sessionmaker()() as session:
            latest_observed_subquery = (
                select(
                    SatelliteObservation.project_id.label("project_id"),
                    func.max(SatelliteObservation.observed_at).label("latest_observed_at"),
                )
                .group_by(SatelliteObservation.project_id)
                .subquery()
            )
            due_projects = (
                await session.execute(
                    select(Project)
                    .join(latest_observed_subquery, latest_observed_subquery.c.project_id == Project.id)
                    .where(latest_observed_subquery.c.latest_observed_at < cutoff)
                    .limit(config.satellite_monitoring_batch_size)
                )
            ).scalars().all()

            satellite_service = SatelliteService(session)
            for project in due_projects:
                await satellite_service.enqueue_job(project, job_type="CONTINUOUS_MONITORING")
            await session.commit()
    except Exception:
        logger.exception("Falha ao enfileirar monitoramento satelital continuo")


def register_satellite_jobs(scheduler: AsyncIOScheduler, settings: Settings) -> None:
    if not settings.satellite_scheduler_enabled:
        logger.info("Scheduler satelital desabilitado por configuração")
        return

    scheduler.add_job(
        run_pending_satellite_jobs,
        "interval",
        seconds=settings.satellite_job_poll_seconds,
        id="satellite_pending_jobs",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=60,
    )
    scheduler.add_job(
        enqueue_due_monitoring_jobs,
        "interval",
        hours=settings.satellite_monitoring_interval_hours,
        id="satellite_monitoring_enqueue",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=3600,
    )
    # RESEARCH Pitfall 2 / Assumption A1: APScheduler in-process nao coordena
    # entre processos. Numero de workers Uvicorn de producao CONFIRMADO por
    # leitura direta nesta execucao (Plan 05):
    #   - Dockerfile.api: `CMD ["uvicorn", "backend_app.main:app", "--host",
    #     "0.0.0.0", "--port", "5680"]` -- sem flag `--workers`, logo o
    #     default do Uvicorn se aplica (1 worker).
    #   - docker-compose.dokploy.yml: servico `sinarca-api` sem
    #     `deploy.replicas`/`scale` -- default do Compose e 1 replica.
    #   => 1 worker de producao confirmado, sem duplicacao de scheduler.
    # Se um dia `--workers`/`replicas` > 1 for introduzido, o `skip_locked`
    # de claim_next_jobs evita processar o MESMO job duas vezes, mas N
    # pollers concorrentes ainda podem estourar a quota de 2 requests
    # concorrentes -- nesse caso, SATELLITE_SCHEDULER_ENABLED deve ficar
    # ligado em apenas uma replica, ou adotar SQLAlchemyJobStore (deferido).
