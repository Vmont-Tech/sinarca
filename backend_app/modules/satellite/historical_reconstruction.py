from __future__ import annotations

# Phase 05 / D-12/D-13/D-15/SATM-05 -- Reconstrucao historica de 5 anos, com
# composicao mensal por menor cloud cover. Todo I/O deste modulo e assincrono
# (httpx.AsyncClient dentro do provider, AsyncSession do SQLAlchemy) --
# RESEARCH Pitfall 3: nenhuma chamada bloqueante pode entrar aqui, senao o
# event loop do servidor inteiro trava durante o job.

from datetime import datetime, timedelta
from typing import Any, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.satellite import IndexStatisticsDTO, SatelliteProvider, SceneDTO
from backend_app.core.config import Settings, get_settings
from backend_app.db.models import Project, SatelliteJob
from backend_app.modules.projects.service import ProjectsService
from backend_app.modules.satellite.service import SatelliteService


def reconstruction_window(reference: datetime, settings: Settings | None = None) -> tuple[datetime, datetime]:
    """D-12: 5 anos anteriores a projects.created_at, configuravel."""
    config = settings or get_settings()
    years = max(1, int(config.satellite_historical_years))
    # timedelta(days=365*anos) em vez de dateutil.relativedelta: o repo nao
    # depende de dateutil e a diferenca de dias bissextos e irrelevante para
    # uma janela de composicao mensal.
    return (reference - timedelta(days=365 * years), reference)


def select_monthly_scenes(
    scenes: Sequence[SceneDTO], *, max_cloud_coverage: float
) -> dict[tuple[int, int], SceneDTO]:
    """D-13: melhor observacao do mes = menor cloudCoverage abaixo do limite.

    Cena sem cloud_coverage conhecida e tratada como a pior candidata
    (float('inf')) -- so vence se for a unica do mes. Mes sem cena elegivel
    simplesmente nao existe no resultado: NUNCA interpolar ou estimar.
    """
    eligible = [
        scene
        for scene in scenes
        if scene.cloud_coverage is None or scene.cloud_coverage <= max_cloud_coverage
    ]

    by_month: dict[tuple[int, int], SceneDTO] = {}
    for scene in eligible:
        key = (scene.observed_at.year, scene.observed_at.month)
        current = by_month.get(key)
        if current is None:
            by_month[key] = scene
            continue
        current_cc = current.cloud_coverage if current.cloud_coverage is not None else float("inf")
        candidate_cc = scene.cloud_coverage if scene.cloud_coverage is not None else float("inf")
        if candidate_cc < current_cc:
            by_month[key] = scene
    return by_month


def join_statistics_to_scenes(
    statistics: Sequence[IndexStatisticsDTO],
    scenes_by_month: dict[tuple[int, int], SceneDTO],
) -> list[dict[str, Any]]:
    """Casa a estatistica mensal com a cena escolhida do mesmo (ano, mes).

    A Statistical API agrega por intervalo e nao devolve sceneId; a chave de
    idempotencia D-15 exige um scene_id real, por isso o STAC e consultado em
    paralelo e o join acontece aqui. Intervalo sem cena (ou cena sem
    intervalo) e descartado -- nunca inventar scene_id sintetico.
    """
    rows: list[dict[str, Any]] = []
    for stat in statistics:
        key = (stat.interval_from.year, stat.interval_from.month)
        scene = scenes_by_month.get(key)
        if scene is None:
            continue
        rows.append(
            {
                "scene_id": scene.scene_id,
                "processing_version": scene.processing_version,
                "observed_at": scene.observed_at,
                "cloud_coverage": scene.cloud_coverage,
                "ndvi_mean": stat.ndvi_mean,
                "ndvi_min": stat.ndvi_min,
                "ndvi_max": stat.ndvi_max,
                "ndmi_mean": stat.ndmi_mean,
                "nbr_mean": stat.nbr_mean,
                "valid_pixel_percentage": stat.valid_pixel_percentage,
                "metadata": {
                    "interval_from": stat.interval_from.isoformat(),
                    "interval_to": stat.interval_to.isoformat(),
                    "platform": scene.platform,
                    "scene_cloud_cover": scene.cloud_coverage,
                },
            }
        )
    return rows


class HistoricalReconstructionService:
    def __init__(
        self,
        session: AsyncSession,
        provider: SatelliteProvider,
        settings: Settings | None = None,
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
                        "Projeto sem active_boundary (Phase 04.1): reconstrução "
                        "histórica não pode definir a AOI"
                    ),
                )
                return
            aoi = boundary["active"]

            date_from, date_to = reconstruction_window(project.created_at, self.settings)
            job.window_start = date_from
            job.window_end = date_to

            # Uma unica janela de 5 anos por chamada (STAC + Statistical com
            # aggregationInterval P1M) em vez de 60 chamadas mensais: mesma
            # cobertura, ~2 requests em vez de ~120 (D-11).
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

            persisted = await satellite_service.persist_observations(project, rows)
            await satellite_service.apply_baseline_from_observations(project)
            await satellite_service.finish_job(job, status="COMPLETED", observations_persisted=persisted)
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
