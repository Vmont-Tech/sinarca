from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend_app.adapters.satellite import IndexStatisticsDTO, SceneDTO
from backend_app.core.config import Settings
from backend_app.db.models import Project, SatelliteJob, SatelliteObservation
from backend_app.db.session import get_sessionmaker
from backend_app.main import app
from backend_app.modules.satellite.historical_reconstruction import (
    HistoricalReconstructionService,
    join_statistics_to_scenes,
    reconstruction_window,
    select_monthly_scenes,
)
from backend_app.modules.satellite.service import SatelliteService

client = TestClient(app)

# `tests/` has no `__init__.py`, so `from tests.test_project_boundaries import
# ...` does not resolve as a package import under this repo's pytest
# configuration. Per the fallback already used across Phase 04.1/04.2/05 test
# files, the HTTP fixtures are copied verbatim from
# tests/test_project_boundaries.py rather than imported.
PRODUCER = ("produtor@sinarca.com.br", "produtor")


def auth_headers(email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def tag_payload(prefix: str) -> list[dict[str, object]]:
    points = [
        ("A", -10.100000, -48.300000),
        ("B", -10.100000, -48.320000),
        ("C", -10.120000, -48.320000),
        ("D", -10.120000, -48.300000),
    ]
    return [
        {
            "tag_uid": f"{prefix}-{index}",
            "cmac": f"cmac-{prefix}-{index}",
            "latitude": latitude,
            "longitude": longitude,
            "vertex_label": label,
        }
        for index, (label, latitude, longitude) in enumerate(points, start=1)
    ]


def project_payload(prefix: str, tags: list[dict[str, object]]) -> dict[str, object]:
    return {
        "name": f"Projeto Reconstrucao Historica {prefix}",
        "description": "Projeto criado pelo contrato de testes de reconstrucao historica.",
        "project_type": "reforestation",
        "producer_id": "prod-001",
        "certifier_id": "std-001",
        "image_url": f"data:image/png;base64,{prefix}",
        "location": {
            "city": "Porto Nacional",
            "state": "Tocantins",
            "stateId": "to",
            "bioma": "Cerrado",
            "coordinates": {"lat": -10.70, "lng": -48.41, "svgX": 392, "svgY": 292},
        },
        "tags": tags,
    }


def uuid_hex() -> str:
    return uuid.uuid4().hex[:10]


def _create_project_with_boundary(prefix: str) -> str:
    """Cria um projeto real via HTTP (com active_boundary persistida via
    project_tags) e devolve o friendly_id."""
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    return response.json()["project"]["friendlyId"]


def _create_project_without_boundary(prefix: str) -> str:
    """Cria um projeto sem project_tags (tags omitido -> None), logo sem
    project_boundaries: persist_project_boundary devolve None para tags
    vazias/None (projects/service.py:1106)."""
    payload = project_payload(prefix, tags=[])
    del payload["tags"]
    response = client.post("/api/v1/projects", json=payload, headers=auth_headers(*PRODUCER))
    assert response.status_code == 201, response.text
    return response.json()["project"]["friendlyId"]


async def _fetch_pending_job(session, project: Project, job_type: str = "HISTORICAL_RECONSTRUCTION") -> SatelliteJob:
    """POST /api/v1/projects (Task 3 / D-14) ja enfileira o job
    HISTORICAL_RECONSTRUCTION dentro de create_project -- os testes de
    integracao buscam esse job auto-criado em vez de chamar enqueue_job de
    novo (que devolveria None, ja existe um job ativo)."""
    return (
        await session.execute(
            select(SatelliteJob).where(
                SatelliteJob.project_id == project.id,
                SatelliteJob.job_type == job_type,
                SatelliteJob.status == "PENDING",
            )
        )
    ).scalars().one()


def _months_range(start_year: int, start_month: int, count: int) -> list[tuple[int, int]]:
    year, month = start_year, start_month
    result: list[tuple[int, int]] = []
    for _ in range(count):
        result.append((year, month))
        month += 1
        if month > 12:
            month = 1
            year += 1
    return result


def _make_scene(year: int, month: int, cloud_coverage: float | None, *, day: int = 15) -> SceneDTO:
    return SceneDTO(
        scene_id=f"S2_{year}{month:02d}_{day:02d}",
        observed_at=datetime(year, month, day, tzinfo=timezone.utc),
        cloud_coverage=cloud_coverage,
        processing_version="v1",
    )


def _make_statistics(year: int, month: int) -> IndexStatisticsDTO:
    interval_from = datetime(year, month, 1, tzinfo=timezone.utc)
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    interval_to = datetime(next_year, next_month, 1, tzinfo=timezone.utc)
    return IndexStatisticsDTO(
        interval_from=interval_from,
        interval_to=interval_to,
        ndvi_mean=0.55,
        ndvi_min=0.40,
        ndvi_max=0.70,
        ndmi_mean=0.30,
        nbr_mean=0.20,
        valid_pixel_percentage=95.0,
    )


class FakeProvider:
    """Provider falso implementando o Protocol SatelliteProvider, sem HTTP."""

    def __init__(
        self,
        scenes: list[SceneDTO],
        statistics: list[IndexStatisticsDTO],
        *,
        raises: Exception | None = None,
    ) -> None:
        self._scenes = scenes
        self._statistics = statistics
        self._raises = raises

    async def search_scenes(self, **kwargs):
        if self._raises is not None:
            raise self._raises
        return self._scenes

    async def get_statistics(self, **kwargs):
        if self._raises is not None:
            raise self._raises
        return self._statistics

    async def get_image(self, **kwargs):
        raise NotImplementedError("get_image nao e usado pela reconstrucao historica (D-19)")

    async def aclose(self) -> None:
        return None


class ExplodingProvider(FakeProvider):
    """Provider que explode se qualquer metodo publico for chamado -- usado
    para provar que a reconstrucao NUNCA chama o provider sem active_boundary."""

    async def search_scenes(self, **kwargs):
        raise AssertionError("provider nao deveria ser chamado sem active_boundary")

    async def get_statistics(self, **kwargs):
        raise AssertionError("provider nao deveria ser chamado sem active_boundary")


# ----------------------------------------------------------------------
# Funcoes puras -- sem banco, sem event loop
# ----------------------------------------------------------------------


def test_select_monthly_scenes_picks_lowest_cloud_coverage() -> None:
    scenes = [
        _make_scene(2026, 1, 30.0, day=5),
        _make_scene(2026, 1, 10.0, day=15),
        _make_scene(2026, 1, 5.0, day=25),
    ]
    result = select_monthly_scenes(scenes, max_cloud_coverage=20.0)
    # Cena de 30% (acima do limite) e descartada; entre 10% e 5%, vence 5%.
    assert list(result.keys()) == [(2026, 1)]
    assert result[(2026, 1)].cloud_coverage == 5.0


def test_select_monthly_scenes_discards_above_threshold() -> None:
    scenes = [_make_scene(2026, 1, 35.0)]
    result = select_monthly_scenes(scenes, max_cloud_coverage=20.0)
    assert result == {}


def test_month_without_eligible_scene_is_never_interpolated() -> None:
    scenes = [_make_scene(2026, 1, 8.0), _make_scene(2026, 2, 90.0)]
    result = select_monthly_scenes(scenes, max_cloud_coverage=20.0)
    assert (2026, 1) in result
    assert (2026, 2) not in result


def test_select_monthly_scenes_none_cloud_coverage_wins_only_if_alone() -> None:
    result_alone = select_monthly_scenes([_make_scene(2026, 1, None)], max_cloud_coverage=20.0)
    assert result_alone[(2026, 1)].cloud_coverage is None

    result_with_known = select_monthly_scenes(
        [_make_scene(2026, 1, None, day=1), _make_scene(2026, 1, 15.0, day=20)],
        max_cloud_coverage=20.0,
    )
    assert result_with_known[(2026, 1)].cloud_coverage == 15.0


def test_join_statistics_to_scenes_matches_by_month() -> None:
    scenes_by_month = {(2026, 1): _make_scene(2026, 1, 10.0)}
    statistics = [_make_statistics(2026, 1), _make_statistics(2026, 2)]

    rows = join_statistics_to_scenes(statistics, scenes_by_month)

    assert len(rows) == 1
    assert rows[0]["scene_id"] == scenes_by_month[(2026, 1)].scene_id
    assert rows[0]["ndvi_mean"] == 0.55


def test_join_statistics_to_scenes_discards_scene_without_matching_interval() -> None:
    scenes_by_month = {(2026, 1): _make_scene(2026, 1, 10.0), (2026, 3): _make_scene(2026, 3, 12.0)}
    statistics = [_make_statistics(2026, 1)]  # sem estatistica para (2026, 3)

    rows = join_statistics_to_scenes(statistics, scenes_by_month)

    assert len(rows) == 1
    assert rows[0]["scene_id"] == scenes_by_month[(2026, 1)].scene_id


def test_reconstruction_window_respects_settings() -> None:
    settings = Settings(satellite_historical_years=5)
    reference = datetime(2026, 8, 17, tzinfo=timezone.utc)

    date_from, date_to = reconstruction_window(reference, settings)

    assert date_to == reference
    assert (reference - date_from).days == 365 * 5


# ----------------------------------------------------------------------
# Integracao -- Postgres local, provider falso
# ----------------------------------------------------------------------


def test_reconstruction_persists_sixty_monthly_observations() -> None:
    prefix = f"recon60-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    months = _months_range(2020, 1, 60)
    scenes = [_make_scene(year, month, 8.0) for year, month in months]
    statistics = [_make_statistics(year, month) for year, month in months]

    async def run_reconstruction() -> tuple[int, str]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            # create_project (Task 3 / D-14) ja enfileirou este job.
            job = await _fetch_pending_job(session, project)

            provider = FakeProvider(scenes, statistics)
            await HistoricalReconstructionService(session, provider).run(job)

            observations = (
                await session.execute(
                    select(SatelliteObservation).where(SatelliteObservation.project_id == project.id)
                )
            ).scalars().all()
            return len(observations), job.status

    count, status = asyncio.run(run_reconstruction())
    assert count == 60
    assert status == "COMPLETED"


def test_reconstruction_is_idempotent_on_second_run() -> None:
    prefix = f"reconidem-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    months = _months_range(2020, 1, 12)
    scenes = [_make_scene(year, month, 8.0) for year, month in months]
    statistics = [_make_statistics(year, month) for year, month in months]

    async def run_first_job() -> int:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            # create_project (Task 3 / D-14) ja enfileirou este primeiro job.
            job = await _fetch_pending_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await HistoricalReconstructionService(session, provider).run(job)
            return job.observations_persisted

    async def run_second_job() -> int:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            # O primeiro job ja esta COMPLETED -- enqueue_job aceita um novo.
            job = await SatelliteService(session).enqueue_job(project, job_type="HISTORICAL_RECONSTRUCTION")
            await session.commit()
            provider = FakeProvider(scenes, statistics)
            await HistoricalReconstructionService(session, provider).run(job)
            return job.observations_persisted

    first = asyncio.run(run_first_job())
    second = asyncio.run(run_second_job())

    assert first == 12
    assert second == 0


def test_reconstruction_fails_closed_without_provider_credentials() -> None:
    prefix = f"reconfail-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)

    async def run_reconstruction() -> tuple[str, str | None, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            project_id = project.id  # capturado antes do run(): a excecao dentro
            # do provider aciona rollback(), que expira TODOS os objetos da
            # sessao (nao so `job`) -- ler project.id depois exigiria um
            # lazy-load sincrono que o AsyncSession nao suporta fora de um
            # contexto greenlet.
            # create_project (Task 3 / D-14) ja enfileirou este job.
            job = await _fetch_pending_job(session, project)

            provider = FakeProvider(
                [],
                [],
                raises=RuntimeError(
                    "Configuração Copernicus incompleta: COPERNICUS_CLIENT_ID, COPERNICUS_CLIENT_SECRET"
                ),
            )
            await HistoricalReconstructionService(session, provider).run(job)

            observations = (
                await session.execute(
                    select(SatelliteObservation).where(SatelliteObservation.project_id == project_id)
                )
            ).scalars().all()
            return job.status, job.error_message, len(observations)

    status, error_message, observations_count = asyncio.run(run_reconstruction())
    assert status == "FAILED"
    assert error_message is not None and "Copernicus" in error_message
    assert observations_count == 0


def test_reconstruction_without_active_boundary_never_calls_provider() -> None:
    prefix = f"reconnoaoi-{uuid_hex()}"
    friendly_id = _create_project_without_boundary(prefix)

    async def run_reconstruction() -> tuple[str, str | None]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            # create_project (Task 3 / D-14) enfileira o job independente da
            # presenca de active_boundary -- a checagem acontece dentro de
            # run(), nao no enqueue.
            job = await _fetch_pending_job(session, project)

            provider = ExplodingProvider([], [])
            await HistoricalReconstructionService(session, provider).run(job)
            return job.status, job.error_message

    status, error_message = asyncio.run(run_reconstruction())
    assert status == "FAILED"
    assert error_message is not None
    assert "active_boundary" in error_message or "geometria" in error_message


def test_reconstruction_marks_baseline_source_as_copernicus() -> None:
    prefix = f"reconbaseline-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    months = _months_range(2020, 1, 6)
    scenes = [_make_scene(year, month, 8.0) for year, month in months]
    statistics = [_make_statistics(year, month) for year, month in months]

    async def run_reconstruction() -> tuple[str | None, str | None]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            # create_project (Task 3 / D-14) ja enfileirou este job.
            job = await _fetch_pending_job(session, project)

            provider = FakeProvider(scenes, statistics)
            await HistoricalReconstructionService(session, provider).run(job)

            await session.refresh(project)
            metadata = project.metadata_ or {}
            return metadata.get("baseline_source"), metadata.get("sentinel_status")

    baseline_source, sentinel_status = asyncio.run(run_reconstruction())
    assert baseline_source == "COPERNICUS"
    assert sentinel_status != "BLOCKED_MISSING_PROVIDER_CREDENTIALS"


# ----------------------------------------------------------------------
# SATM-10 -- create_project enfileira sem bloquear (Task 3, D-14)
# ----------------------------------------------------------------------


def test_create_project_enqueues_job_without_calling_provider(monkeypatch) -> None:
    def _explode(*args, **kwargs):
        raise AssertionError("build_copernicus_provider nao deveria ser chamado durante create_project")

    # create_project nunca deveria construir um provider Copernicus -- ele
    # apenas enfileira. Este monkeypatch prova isso: se o codigo do request
    # tentasse chamar o provider (regressao), o teste explodiria aqui.
    monkeypatch.setattr("backend_app.adapters.copernicus.build_copernicus_provider", _explode)
    monkeypatch.setattr("backend_app.modules.satellite.scheduler.build_copernicus_provider", _explode)

    prefix = f"reconenqueue-{uuid_hex()}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]

    async def count_pending_jobs() -> int:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            jobs = (
                await session.execute(
                    select(SatelliteJob).where(
                        SatelliteJob.project_id == project.id,
                        SatelliteJob.job_type == "HISTORICAL_RECONSTRUCTION",
                        SatelliteJob.status == "PENDING",
                    )
                )
            ).scalars().all()
            return len(jobs)

    assert asyncio.run(count_pending_jobs()) == 1


def test_create_project_response_time_is_not_blocked_by_reconstruction() -> None:
    prefix = f"recontime-{uuid_hex()}"
    started = time.perf_counter()

    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    elapsed = time.perf_counter() - started

    assert response.status_code == 201, response.text
    # Se a reconstrucao rodasse sincrona dentro do request, este teste
    # falharia por timeout muito antes de chegar a 5s.
    assert elapsed < 5.0


def test_enqueue_is_idempotent_for_active_job() -> None:
    prefix = f"reconidemenq-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)  # create_project ja enfileira 1 job PENDING

    async def enqueue_again_and_count_active() -> tuple[bool, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            second = await SatelliteService(session).enqueue_job(project, job_type="HISTORICAL_RECONSTRUCTION")
            await session.commit()

            active_jobs = (
                await session.execute(
                    select(SatelliteJob).where(
                        SatelliteJob.project_id == project.id,
                        SatelliteJob.job_type == "HISTORICAL_RECONSTRUCTION",
                        SatelliteJob.status.in_(("PENDING", "PROCESSING")),
                    )
                )
            ).scalars().all()
            return second is None, len(active_jobs)

    second_was_none, active_count = asyncio.run(enqueue_again_and_count_active())
    assert second_was_none is True
    assert active_count == 1
