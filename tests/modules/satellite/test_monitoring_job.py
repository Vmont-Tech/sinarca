from __future__ import annotations

import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend_app.adapters.satellite import IndexStatisticsDTO, SatelliteImageDTO, SceneDTO
from backend_app.core.config import Settings
from backend_app.db.models import (
    Project,
    ProjectEvent,
    SatelliteAnomaly,
    SatelliteEvidence,
    SatelliteJob,
    SatelliteObservation,
)
from backend_app.db.session import get_sessionmaker
from backend_app.main import app
from backend_app.modules.satellite.evidence import SatelliteEvidenceService
from backend_app.modules.satellite.monitoring import SatelliteMonitoringService, monitoring_window
from backend_app.modules.satellite.service import SatelliteService

client = TestClient(app)

# `tests/` has no `__init__.py`, so `from tests.test_project_boundaries import
# ...` does not resolve as a package import under this repo's pytest
# configuration. Per the fallback already used across Phase 04.1/04.2/05 test
# files, the HTTP fixtures are copied verbatim from
# tests/modules/satellite/test_historical_reconstruction.py rather than
# imported.
PRODUCER = ("produtor@sinarca.com.br", "produtor")

FIXED_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


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
        "name": f"Projeto Monitoramento Continuo {prefix}",
        "description": "Projeto criado pelo contrato de testes de monitoramento continuo.",
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
    project_boundaries."""
    payload = project_payload(prefix, tags=[])
    del payload["tags"]
    response = client.post("/api/v1/projects", json=payload, headers=auth_headers(*PRODUCER))
    assert response.status_code == 201, response.text
    return response.json()["project"]["friendlyId"]


async def _enqueue_and_get_monitoring_job(session, project: Project) -> SatelliteJob:
    job = await SatelliteService(session).enqueue_job(project, job_type="CONTINUOUS_MONITORING")
    await session.commit()
    return job


def _scene(year: int, month: int, cloud_coverage: float | None = 8.0, *, day: int = 15) -> SceneDTO:
    return SceneDTO(
        scene_id=f"S2_{year}{month:02d}_{day:02d}",
        observed_at=datetime(year, month, day, tzinfo=timezone.utc),
        cloud_coverage=cloud_coverage,
        processing_version="v1",
    )


def _stats(
    year: int,
    month: int,
    *,
    ndvi_mean: float = 0.55,
    nbr_mean: float = 0.20,
    ndmi_mean: float = 0.30,
    valid_pixel_percentage: float = 95.0,
) -> IndexStatisticsDTO:
    interval_from = datetime(year, month, 1, tzinfo=timezone.utc)
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    interval_to = datetime(next_year, next_month, 1, tzinfo=timezone.utc)
    return IndexStatisticsDTO(
        interval_from=interval_from,
        interval_to=interval_to,
        ndvi_mean=ndvi_mean,
        ndvi_min=max(0.0, ndvi_mean - 0.1),
        ndvi_max=min(1.0, ndvi_mean + 0.1),
        ndmi_mean=ndmi_mean,
        nbr_mean=nbr_mean,
        valid_pixel_percentage=valid_pixel_percentage,
    )


class FakeProvider:
    """Provider falso implementando o Protocol SatelliteProvider, sem HTTP."""

    def __init__(
        self,
        scenes: list[SceneDTO],
        statistics: list[IndexStatisticsDTO],
        *,
        raises: Exception | None = None,
        image_raises: Exception | None = None,
    ) -> None:
        self._scenes = scenes
        self._statistics = statistics
        self._raises = raises
        self._image_raises = image_raises
        self.get_image_calls = 0

    async def search_scenes(self, **kwargs):
        if self._raises is not None:
            raise self._raises
        return self._scenes

    async def get_statistics(self, **kwargs):
        if self._raises is not None:
            raise self._raises
        return self._statistics

    async def get_image(self, **kwargs):
        self.get_image_calls += 1
        if self._image_raises is not None:
            raise self._image_raises
        return SatelliteImageDTO(
            content=FIXED_PNG_BYTES,
            mime_type="image/png",
            captured_from=kwargs.get("date_from"),
            captured_to=kwargs.get("date_to"),
            width=kwargs.get("width", 512),
            height=kwargs.get("height", 512),
        )

    async def aclose(self) -> None:
        return None


class ExplodingProvider(FakeProvider):
    """Provider que explode se qualquer metodo publico for chamado -- usado
    para provar que o monitoramento NUNCA chama o provider sem active_boundary."""

    async def search_scenes(self, **kwargs):
        raise AssertionError("provider nao deveria ser chamado sem active_boundary")

    async def get_statistics(self, **kwargs):
        raise AssertionError("provider nao deveria ser chamado sem active_boundary")


# ----------------------------------------------------------------------
# Task 1 -- funcoes puras (monitoring_window)
# ----------------------------------------------------------------------


def test_monitoring_window_starts_at_last_observation() -> None:
    last = datetime(2026, 6, 1, tzinfo=timezone.utc)
    now = datetime(2026, 8, 17, tzinfo=timezone.utc)
    date_from, date_to = monitoring_window(last, now)
    assert date_from == last
    assert date_to == now


def test_monitoring_window_without_history_is_short_not_five_years() -> None:
    now = datetime(2026, 8, 17, tzinfo=timezone.utc)
    settings = Settings(satellite_monitoring_interval_hours=24)
    date_from, date_to = monitoring_window(None, now, settings)
    assert date_to == now
    assert (now - date_from) == timedelta(hours=48)
    assert (now - date_from).days < 365


def test_monitoring_window_end_is_now() -> None:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    _, date_to = monitoring_window(datetime(2025, 12, 1, tzinfo=timezone.utc), now)
    assert date_to == now


def test_monitoring_window_respects_interval_hours_setting() -> None:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    settings = Settings(satellite_monitoring_interval_hours=6)
    date_from, _ = monitoring_window(None, now, settings)
    assert (now - date_from) == timedelta(hours=12)


def test_monitoring_window_short_window_is_two_intervals() -> None:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    settings = Settings(satellite_monitoring_interval_hours=1)
    date_from, _ = monitoring_window(None, now, settings)
    assert (now - date_from) == timedelta(hours=2)


# ----------------------------------------------------------------------
# Task 1 -- integracao (Postgres local, provider falso)
# ----------------------------------------------------------------------


def test_cloudy_scene_is_never_persisted() -> None:
    prefix = f"cloudy-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1, 45.0)]  # acima do limite default de 20%
    statistics = [_stats(2026, 1)]

    async def run_job() -> tuple[str, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            observations = (
                await session.execute(
                    select(SatelliteObservation).where(SatelliteObservation.project_id == project.id)
                )
            ).scalars().all()
            return job.status, len(observations)

    status, count = asyncio.run(run_job())
    assert status == "COMPLETED"
    assert count == 0


def test_scene_at_exact_cloud_threshold_is_persisted() -> None:
    prefix = f"threshold-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1, 20.0)]  # exatamente no limite default de 20%
    statistics = [_stats(2026, 1)]

    async def run_job() -> tuple[str, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            observations = (
                await session.execute(
                    select(SatelliteObservation).where(SatelliteObservation.project_id == project.id)
                )
            ).scalars().all()
            return job.status, len(observations)

    status, count = asyncio.run(run_job())
    assert status == "COMPLETED"
    assert count == 1


def test_monitoring_job_is_idempotent_across_runs() -> None:
    prefix = f"monidem-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1), _stats(2026, 2)]

    async def run_first() -> int:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)
            return job.observations_persisted

    async def run_second() -> int:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)
            return job.observations_persisted

    first = asyncio.run(run_first())
    second = asyncio.run(run_second())
    assert first == 2
    assert second == 0


def test_monitoring_job_fails_closed_without_credentials() -> None:
    prefix = f"monfail-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)

    async def run_job() -> tuple[str, str | None, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            project_id = project.id  # capturado antes: rollback() expira todos os
            # objetos da sessao, nao so `job` -- ler project.id depois exigiria
            # lazy-load sincrono que o AsyncSession nao suporta fora de greenlet.
            job = await _enqueue_and_get_monitoring_job(session, project)

            provider = FakeProvider(
                [],
                [],
                raises=RuntimeError(
                    "Configuração Copernicus incompleta: COPERNICUS_CLIENT_ID, COPERNICUS_CLIENT_SECRET"
                ),
            )
            await SatelliteMonitoringService(session, provider).run(job)

            observations = (
                await session.execute(
                    select(SatelliteObservation).where(SatelliteObservation.project_id == project_id)
                )
            ).scalars().all()
            return job.status, job.error_message, len(observations)

    status, error_message, count = asyncio.run(run_job())
    assert status == "FAILED"
    assert error_message is not None and "Copernicus" in error_message
    assert count == 0


def test_monitoring_job_without_active_boundary_never_calls_provider() -> None:
    prefix = f"monnoaoi-{uuid_hex()}"
    friendly_id = _create_project_without_boundary(prefix)

    async def run_job() -> tuple[str, str | None]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = ExplodingProvider([], [])
            await SatelliteMonitoringService(session, provider).run(job)
            return job.status, job.error_message

    status, error_message = asyncio.run(run_job())
    assert status == "FAILED"
    assert error_message is not None and "active_boundary" in error_message


# ----------------------------------------------------------------------
# Task 2 -- anomalia, evento ANALYZED, trilha auditavel
# ----------------------------------------------------------------------


def test_ndvi_drop_creates_anomaly_and_analyzed_event() -> None:
    prefix = f"ndvidrop-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1, ndvi_mean=0.60), _stats(2026, 2, ndvi_mean=0.42)]  # queda de 30%

    async def run_job():
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            anomalies = (
                await session.execute(select(SatelliteAnomaly).where(SatelliteAnomaly.project_id == project.id))
            ).scalars().all()
            events = (
                await session.execute(select(ProjectEvent).where(ProjectEvent.project_id == project.id))
            ).scalars().all()
            return (
                job.status,
                job.anomalies_detected,
                len(anomalies),
                anomalies[0].status if anomalies else None,
                len(events),
                events[0].status if events else None,
                events[0].type if events else None,
            )

    status, anomalies_detected, anomaly_count, anomaly_status, event_count, event_status, event_type = asyncio.run(
        run_job()
    )
    assert status == "COMPLETED"
    assert anomalies_detected == 1
    assert anomaly_count == 1
    assert anomaly_status == "LINKED"
    assert event_count == 1
    assert event_status == "ANALYZED"
    assert event_type == "VEGETATION_LOSS"


def test_automatic_pipeline_never_reaches_confirmed() -> None:
    prefix = f"neverconfirmed-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    # queda severa (CRITICAL) para provar que nem severidade maxima chega a CONFIRMED
    statistics = [_stats(2026, 1, ndvi_mean=0.80), _stats(2026, 2, ndvi_mean=0.10)]

    async def run_job() -> tuple[str, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            confirmed = (
                await session.execute(
                    select(ProjectEvent).where(
                        ProjectEvent.project_id == project.id, ProjectEvent.status == "CONFIRMED"
                    )
                )
            ).scalars().all()
            events = (
                await session.execute(select(ProjectEvent).where(ProjectEvent.project_id == project.id))
            ).scalars().all()
            return events[0].severity if events else None, len(confirmed)

    severity, confirmed_count = asyncio.run(run_job())
    assert severity == "CRITICAL"
    assert confirmed_count == 0


def test_no_project_event_is_ever_deforestation() -> None:
    async def query_deforestation_count() -> int:
        async with get_sessionmaker()() as session:
            rows = (
                await session.execute(select(ProjectEvent).where(ProjectEvent.type == "DEFORESTATION"))
            ).scalars().all()
            return len(rows)

    assert asyncio.run(query_deforestation_count()) == 0


def test_event_appends_single_public_timeline_entry() -> None:
    prefix = f"timeline-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1, ndvi_mean=0.60), _stats(2026, 2, ndvi_mean=0.42)]

    async def run_job() -> tuple[int, int, str]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            timeline_before = len(project.timeline or [])
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            await session.refresh(project)
            timeline_after = len(project.timeline or [])
            desc = (project.timeline or [])[-1]["desc"]
            return timeline_before, timeline_after, desc

    before, after, desc = asyncio.run(run_job())
    assert after == before + 1
    assert "PRC-" not in desc
    assert "nota interna" not in desc.lower()


def test_second_run_does_not_duplicate_anomaly_event_or_timeline() -> None:
    prefix = f"nodup-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1, ndvi_mean=0.60), _stats(2026, 2, ndvi_mean=0.42)]

    async def run_once() -> tuple[int, int, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            anomalies = (
                await session.execute(select(SatelliteAnomaly).where(SatelliteAnomaly.project_id == project.id))
            ).scalars().all()
            events = (
                await session.execute(select(ProjectEvent).where(ProjectEvent.project_id == project.id))
            ).scalars().all()
            await session.refresh(project)
            return len(anomalies), len(events), len(project.timeline or [])

    first = asyncio.run(run_once())
    second = asyncio.run(run_once())
    assert first == second


def test_vegetation_recovery_is_low_severity() -> None:
    prefix = f"recovery-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1, ndvi_mean=0.40), _stats(2026, 2, ndvi_mean=0.55)]  # recuperacao de 37.5%

    async def run_job():
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            events = (
                await session.execute(select(ProjectEvent).where(ProjectEvent.project_id == project.id))
            ).scalars().all()
            return events[0].type if events else None, events[0].severity if events else None, events[
                0
            ].status if events else None

    event_type, severity, status = asyncio.run(run_job())
    assert event_type == "VEGETATION_RECOVERY"
    assert severity == "LOW"
    assert status == "ANALYZED"


# ----------------------------------------------------------------------
# Task 3 -- evidencia visual before/after (D-19)
# ----------------------------------------------------------------------


def test_before_after_is_only_captured_when_event_reaches_analyzed() -> None:
    prefix_flat = f"evinoevent-{uuid_hex()}"
    friendly_flat = _create_project_with_boundary(prefix_flat)
    flat_scenes = [_scene(2026, 1), _scene(2026, 2)]
    flat_statistics = [_stats(2026, 1, ndvi_mean=0.55), _stats(2026, 2, ndvi_mean=0.56)]  # sem queda relevante

    prefix_drop = f"evidrop-{uuid_hex()}"
    friendly_drop = _create_project_with_boundary(prefix_drop)
    drop_scenes = [_scene(2026, 1), _scene(2026, 2)]
    drop_statistics = [_stats(2026, 1, ndvi_mean=0.60), _stats(2026, 2, ndvi_mean=0.42)]

    async def run_flat() -> int:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_flat))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(flat_scenes, flat_statistics)
            await SatelliteMonitoringService(session, provider).run(job)
            return provider.get_image_calls

    async def run_drop() -> int:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_drop))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(drop_scenes, drop_statistics)
            await SatelliteMonitoringService(session, provider).run(job)
            return provider.get_image_calls

    assert asyncio.run(run_flat()) == 0
    assert asyncio.run(run_drop()) == 2


def test_before_after_capture_is_idempotent() -> None:
    prefix = f"eviidem-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1, ndvi_mean=0.60), _stats(2026, 2, ndvi_mean=0.42)]

    async def run_and_recapture() -> tuple[int, int]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)
            calls_after_first = provider.get_image_calls

            event = (
                await session.execute(select(ProjectEvent).where(ProjectEvent.project_id == project.id))
            ).scalars().one()
            evidence_service = SatelliteEvidenceService(session, provider)
            await evidence_service.capture_before_after(project, event)
            calls_after_second = provider.get_image_calls
            return calls_after_first, calls_after_second

    first, second = asyncio.run(run_and_recapture())
    assert first == 2
    assert second == 2  # segunda captura nao chama get_image de novo


def test_event_survives_image_capture_failure() -> None:
    prefix = f"evifail-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1, ndvi_mean=0.60), _stats(2026, 2, ndvi_mean=0.42)]

    async def run_job() -> tuple[str, str]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics, image_raises=RuntimeError("Process API indisponível"))
            await SatelliteMonitoringService(session, provider).run(job)

            event = (
                await session.execute(select(ProjectEvent).where(ProjectEvent.project_id == project.id))
            ).scalars().one()
            return job.status, event.status

    job_status, event_status = asyncio.run(run_job())
    assert job_status == "COMPLETED"
    assert event_status == "ANALYZED"


def test_satellite_evidence_hash_matches_image_bytes() -> None:
    prefix = f"evihash-{uuid_hex()}"
    friendly_id = _create_project_with_boundary(prefix)
    scenes = [_scene(2026, 1), _scene(2026, 2)]
    statistics = [_stats(2026, 1, ndvi_mean=0.60), _stats(2026, 2, ndvi_mean=0.42)]
    expected_hash = hashlib.sha256(FIXED_PNG_BYTES).hexdigest()

    async def run_job() -> list[str]:
        async with get_sessionmaker()() as session:
            project = (
                await session.execute(select(Project).where(Project.friendly_id == friendly_id))
            ).scalars().one()
            job = await _enqueue_and_get_monitoring_job(session, project)
            provider = FakeProvider(scenes, statistics)
            await SatelliteMonitoringService(session, provider).run(job)

            evidence_rows = (
                await session.execute(
                    select(SatelliteEvidence).where(SatelliteEvidence.project_id == project.id)
                )
            ).scalars().all()
            return [row.sha256_hash for row in evidence_rows]

    hashes = asyncio.run(run_job())
    assert len(hashes) == 2  # BEFORE_IMAGE + AFTER_IMAGE
    assert all(h == expected_hash for h in hashes)
