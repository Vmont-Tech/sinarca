from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend_app.db.models import CreditAdjustmentPendency, EnvironmentalCredit, Project, ProjectEvent
from backend_app.db.session import get_sessionmaker
from backend_app.main import app
from backend_app.modules.satellite.service import SatelliteService

client = TestClient(app)

# `tests/` has no `__init__.py` (pytest config in this repo does not resolve
# package-style imports), so HTTP fixtures are copied verbatim from
# tests/modules/satellite/test_monitoring_job.py rather than imported --
# same fallback already documented across Phase 04.1/04.2/05 test files.
PRODUCER = ("produtor@sinarca.com.br", "produtor")
CERTIFIER = ("certificadora@sinarca.com.br", "certificadora")
AUDITOR = ("auditor@sinarca.com.br", "auditor")
ADMIN = ("admin@sinarca.com.br", "admin")


def auth_headers(email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


# create_project chama detect_and_persist_conflicts automaticamente (Phase
# 04.2); reutilizar as mesmas 4 coordenadas fixas de
# tests/modules/satellite/test_monitoring_job.py faria todo projeto deste
# arquivo se sobrepor 100% aos demais -- inclusive com projetos deixados por
# execucoes anteriores deste mesmo arquivo (Postgres local persiste entre
# runs) -- criando um Conflict GEOSPATIAL_OVERLAP CRITICAL espurio que
# contaminaria os testes de severidade/Auto Hold (sinal indesejado somado ao
# sinal satelital sob teste). Um deslocamento aleatorio grande em lat/lng
# (area de espalhamento >> tamanho do retangulo) torna a colisao, mesmo
# contra runs anteriores, desprezivel sem exigir nenhuma limpeza de dados.
def tag_payload(prefix: str) -> list[dict[str, object]]:
    lat_offset = random.uniform(0, 70)
    lng_offset = random.uniform(0, 100)
    points = [
        ("A", -10.100000 - lat_offset, -48.300000 - lng_offset),
        ("B", -10.100000 - lat_offset, -48.320000 - lng_offset),
        ("C", -10.120000 - lat_offset, -48.320000 - lng_offset),
        ("D", -10.120000 - lat_offset, -48.300000 - lng_offset),
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
        "name": f"Projeto Incidente Satelital {prefix}",
        "description": "Projeto criado pelo contrato de testes de decisao/incidente satelital.",
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


def _create_project(prefix: str) -> str:
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    return response.json()["project"]["friendlyId"]


async def _seed_event(
    friendly_id: str,
    *,
    status_value: str = "ANALYZED",
    severity: str = "HIGH",
    event_type: str = "VEGETATION_LOSS",
    affected_area_ha: float | None = 12.5,
) -> str:
    """Insere um ProjectEvent diretamente via ORM -- mais rapido e
    deterministico que rodar o job completo (fixture explicitamente
    autorizada pelo plano, Task 2 <action> item 3)."""
    async with get_sessionmaker()() as session:
        project = (
            await session.execute(select(Project).where(Project.friendly_id == friendly_id))
        ).scalars().one()
        now = datetime.now(timezone.utc)
        event = ProjectEvent(
            project_id=project.id,
            type=event_type,
            status=status_value,
            severity=severity,
            confidence=Decimal("80"),
            affected_area_ha=Decimal(str(affected_area_ha)) if affected_area_ha is not None else None,
            summary="Evento de teste (fixture direta)",
            detected_at=now,
            analyzed_at=now if status_value != "DETECTED" else None,
        )
        session.add(event)
        await session.flush()
        event_id = str(event.id)
        await session.commit()
        return event_id


async def _event_snapshot(event_id: str) -> dict[str, object]:
    async with get_sessionmaker()() as session:
        event = (
            await session.execute(select(ProjectEvent).where(ProjectEvent.id == uuid.UUID(event_id)))
        ).scalars().one()
        return {
            "status": event.status,
            "decidedAt": event.decided_at,
            "clearedAt": event.cleared_at,
            "decisionNotes": event.decision_notes,
        }


async def _project_snapshot(friendly_id: str) -> dict[str, object]:
    async with get_sessionmaker()() as session:
        project = (
            await session.execute(select(Project).where(Project.friendly_id == friendly_id))
        ).scalars().one()
        timeline = list(project.timeline or [])
        return {
            "integrityStatus": project.integrity_status,
            "status": project.status,
            "carbonStock": project.carbon_stock,
            "timelineLen": len(timeline),
            "timelineLast": timeline[-1] if timeline else None,
            "timelineAll": timeline,
        }


async def _seed_available_credit(friendly_id: str) -> None:
    async with get_sessionmaker()() as session:
        project = (
            await session.execute(select(Project).where(Project.friendly_id == friendly_id))
        ).scalars().one()
        session.add(
            EnvironmentalCredit(
                project_id=project.id,
                vintage="2026",
                quantity_total=Decimal("100"),
                quantity_available=Decimal("100"),
                quantity_retired=Decimal("0"),
                status="AVAILABLE",
            )
        )
        await session.commit()


async def _credit_snapshot(friendly_id: str) -> list[dict[str, object]]:
    async with get_sessionmaker()() as session:
        project = (
            await session.execute(select(Project).where(Project.friendly_id == friendly_id))
        ).scalars().one()
        rows = (
            await session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
        ).scalars().all()
        return [{"status": row.status, "quantityAvailable": row.quantity_available} for row in rows]


async def _pendency_snapshot(friendly_id: str) -> list[dict[str, object]]:
    async with get_sessionmaker()() as session:
        project = (
            await session.execute(select(Project).where(Project.friendly_id == friendly_id))
        ).scalars().one()
        rows = (
            await session.execute(
                select(CreditAdjustmentPendency).where(CreditAdjustmentPendency.project_id == project.id)
            )
        ).scalars().all()
        return [{"id": str(row.id), "status": row.status} for row in rows]


async def _resolve_pendency(pendency_id: str) -> None:
    async with get_sessionmaker()() as session:
        pendency = await session.get(CreditAdjustmentPendency, uuid.UUID(pendency_id))
        pendency.status = "RESOLVED"
        pendency.resolved_at = datetime.now(timezone.utc)
        await session.commit()


async def _raise_pendency_directly(friendly_id: str, event_id: str) -> str | None:
    """Chama SatelliteService.raise_credit_adjustment_pendency diretamente
    (fora do endpoint HTTP de decisao, que bloqueia redecidir um evento
    terminal) para provar a idempotencia do indice parcial unico por
    project_event_id (D-23)."""
    async with get_sessionmaker()() as session:
        project = (
            await session.execute(select(Project).where(Project.friendly_id == friendly_id))
        ).scalars().one()
        event = (
            await session.execute(select(ProjectEvent).where(ProjectEvent.id == uuid.UUID(event_id)))
        ).scalars().one()
        pendency = await SatelliteService(session).raise_credit_adjustment_pendency(
            project, event, actor_id="debug", actor_profile_id=None
        )
        await session.commit()
        return str(pendency.id) if pendency is not None else None


def _decide(friendly_id: str, event_id: str, *, decision: str, notes: str, auth=None):
    return client.patch(
        f"/api/v1/projects/{friendly_id}/environmental-events/{event_id}/decision",
        json={"decision": decision, "notes": notes},
        headers=auth or auth_headers(*CERTIFIER),
    )


def _clear(friendly_id: str, event_id: str, *, notes: str, auth=None):
    return client.patch(
        f"/api/v1/projects/{friendly_id}/environmental-events/{event_id}/clear",
        json={"notes": notes},
        headers=auth or auth_headers(*CERTIFIER),
    )


# ----------------------------------------------------------------------
# Task 2 -- decisao humana, Auto Hold, desbloqueio (SATM-08, D-18/D-20/D-22)
# ----------------------------------------------------------------------


def test_confirm_analyzed_event_creates_risk_signal() -> None:
    prefix = f"signal-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="HIGH"))

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Confirmado após revisão em campo.")
    assert response.status_code == 200, response.text
    codes = [s["code"] for s in response.json()["integrity"]["signals"]]
    assert "SATELLITE_ANOMALY_CONFIRMED_HIGH" in codes


def test_confirm_critical_event_triggers_auto_hold() -> None:
    # Nao manufatura nenhum sinal auxiliar: a origem do projeto ja registra
    # Claims LAND_POSSESSION/RIGHT_TO_OPERATE em DECLARED (create_origination_claims),
    # que sozinhas somam ~40 de peso base (LAND_CLAIM_UNVERIFIED +
    # CLAIM_EVIDENCE_PENDING + POSSESSION_WITHOUT_TITLE). Combinadas com o
    # sinal satelital CRITICAL (50) cruzam o limiar de Auto Hold (score > 80)
    # -- exatamente o cenario "projeto que ja tem outros sinais" do plano.
    prefix = f"autohold-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="CRITICAL"))

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Incidente crítico confirmado em campo.")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["integrity"]["integrityStatus"] == "ON_HOLD"
    assert body["integrity"]["riskScore"] > 80

    snapshot = asyncio.run(_project_snapshot(friendly_id))
    assert snapshot["integrityStatus"] == "ON_HOLD"


def test_auto_hold_from_satellite_never_changes_operational_status() -> None:
    prefix = f"opstatus-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    before = asyncio.run(_project_snapshot(friendly_id))
    event_id = asyncio.run(_seed_event(friendly_id, severity="CRITICAL"))

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Incidente crítico confirmado em campo.")
    assert response.status_code == 200, response.text

    after = asyncio.run(_project_snapshot(friendly_id))
    assert after["integrityStatus"] == "ON_HOLD"
    assert after["status"] == before["status"]


def test_detected_event_cannot_be_confirmed_directly() -> None:
    prefix = f"nodetected-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, status_value="DETECTED", severity="HIGH"))

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Tentativa inválida.")
    assert response.status_code == 400
    assert "ANALYZED" in response.json()["detail"]

    snapshot = asyncio.run(_event_snapshot(event_id))
    assert snapshot["status"] == "DETECTED"


def test_terminal_event_cannot_be_decided_again() -> None:
    prefix = f"terminal-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="LOW"))

    first = _decide(friendly_id, event_id, decision="DISMISSED", notes="Sem relevância.")
    assert first.status_code == 200, first.text

    second = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Nova tentativa.")
    assert second.status_code == 400


def test_medium_severity_confirmation_does_not_block() -> None:
    prefix = f"medium-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="MEDIUM"))

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Confirmado, severidade média.")
    assert response.status_code == 200, response.text
    body = response.json()
    codes = [s["code"] for s in body["integrity"]["signals"]]
    assert not any(code.startswith("SATELLITE_ANOMALY_CONFIRMED") for code in codes)
    assert body["integrity"]["integrityStatus"] != "ON_HOLD"


def test_clear_review_removes_signal_and_lifts_auto_hold() -> None:
    prefix = f"clear-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="CRITICAL"))

    confirmed = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Confirmado.")
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["integrity"]["integrityStatus"] == "ON_HOLD"

    cleared = _clear(friendly_id, event_id, notes="Revisão em campo concluída; vegetação recuperada.")
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["integrity"]["integrityStatus"] != "ON_HOLD"

    snapshot = asyncio.run(_event_snapshot(event_id))
    assert snapshot["clearedAt"] is not None


def test_clear_requires_confirmed_event() -> None:
    prefix = f"clearreq-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="HIGH"))

    response = _clear(friendly_id, event_id, notes="Tentativa sem confirmação prévia.")
    assert response.status_code == 400


def test_event_decision_is_org_scoped() -> None:
    prefix = f"orgscope-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="HIGH"))

    # Produtor nao decide sobre o proprio incidente (T-05-42).
    producer_attempt = _decide(
        friendly_id, event_id, decision="CONFIRMED", notes="Produtor tentando decidir.", auth=auth_headers(*PRODUCER)
    )
    assert producer_attempt.status_code == 403

    # Sem token -> 401.
    no_auth = client.patch(
        f"/api/v1/projects/{friendly_id}/environmental-events/{event_id}/decision",
        json={"decision": "CONFIRMED", "notes": "Sem token."},
    )
    assert no_auth.status_code == 401

    # Evento de outro projeto -> 404 (nunca aceitar event_id cruzado).
    other_friendly_id = _create_project(f"{prefix}-other")
    cross_project = _decide(
        other_friendly_id, event_id, decision="CONFIRMED", notes="Evento de outro projeto.", auth=auth_headers(*CERTIFIER)
    )
    assert cross_project.status_code == 404


def test_decision_timeline_entry_never_contains_internal_notes() -> None:
    prefix = f"timelinenotes-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="HIGH"))
    secret_note = "NOTA-INTERNA-CONFIDENCIAL-XYZ"

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes=secret_note)
    assert response.status_code == 200, response.text

    snapshot = asyncio.run(_project_snapshot(friendly_id))
    assert secret_note not in str(snapshot["timelineAll"])
    assert secret_note not in str(snapshot["timelineLast"])


# ----------------------------------------------------------------------
# Task 3 -- pendencia de recalculo de credito, indisponibilizacao (SATM-09,
# D-23)
# ----------------------------------------------------------------------


def test_confirmed_event_raises_credit_pendency_and_blocks_credits() -> None:
    prefix = f"pendency-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    asyncio.run(_seed_available_credit(friendly_id))
    event_id = asyncio.run(_seed_event(friendly_id, severity="HIGH", affected_area_ha=8.25))

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Incidente confirmado em campo.")
    assert response.status_code == 200, response.text

    pendencies = asyncio.run(_pendency_snapshot(friendly_id))
    assert len(pendencies) == 1
    assert pendencies[0]["status"] == "OPEN"

    credits = asyncio.run(_credit_snapshot(friendly_id))
    assert len(credits) == 1
    assert credits[0]["status"] == "SUSPENDED"
    assert credits[0]["quantityAvailable"] == Decimal("0")

    list_response = client.get(
        f"/api/v1/projects/{friendly_id}/credit-adjustment-pendencies", headers=auth_headers(*CERTIFIER)
    )
    assert list_response.status_code == 200, list_response.text
    body = list_response.json()
    assert body["total"] == 1
    assert body["pendencies"][0]["category"] == "SATELLITE_INCIDENT"
    assert "ha" in body["pendencies"][0]["description"] or "área" in body["pendencies"][0]["description"]


def test_confirmation_never_changes_carbon_stock() -> None:
    prefix = f"carbonstock-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    before = asyncio.run(_project_snapshot(friendly_id))
    event_id = asyncio.run(_seed_event(friendly_id, severity="CRITICAL", affected_area_ha=15.0))

    response = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Incidente crítico confirmado.")
    assert response.status_code == 200, response.text

    after = asyncio.run(_project_snapshot(friendly_id))
    assert after["carbonStock"] == before["carbonStock"]


def test_pendency_is_not_duplicated_on_repeated_confirmation() -> None:
    prefix = f"nodup-pendency-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    event_id = asyncio.run(_seed_event(friendly_id, severity="HIGH", affected_area_ha=5.0))

    first_id = asyncio.run(_raise_pendency_directly(friendly_id, event_id))
    second_id = asyncio.run(_raise_pendency_directly(friendly_id, event_id))

    assert first_id is not None
    assert second_id is None  # ON CONFLICT DO NOTHING -- nunca duplicada

    pendencies = asyncio.run(_pendency_snapshot(friendly_id))
    assert len(pendencies) == 1


def test_clear_with_open_pendency_does_not_unlock_credits() -> None:
    prefix = f"openpendency-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    asyncio.run(_seed_available_credit(friendly_id))
    event_id = asyncio.run(_seed_event(friendly_id, severity="CRITICAL", affected_area_ha=9.0))

    confirmed = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Confirmado.")
    assert confirmed.status_code == 200, confirmed.text
    assert asyncio.run(_credit_snapshot(friendly_id))[0]["status"] == "SUSPENDED"

    cleared = _clear(friendly_id, event_id, notes="Revisão registrada, mas pendência de crédito ainda em aberto.")
    assert cleared.status_code == 200, cleared.text

    credits = asyncio.run(_credit_snapshot(friendly_id))
    assert credits[0]["status"] == "SUSPENDED"
    assert credits[0]["quantityAvailable"] == Decimal("0")


def test_resolved_pendency_plus_clear_unlocks_credits() -> None:
    prefix = f"resolvedpendency-{uuid_hex()}"
    friendly_id = _create_project(prefix)
    asyncio.run(_seed_available_credit(friendly_id))
    event_id = asyncio.run(_seed_event(friendly_id, severity="CRITICAL", affected_area_ha=9.0))

    confirmed = _decide(friendly_id, event_id, decision="CONFIRMED", notes="Confirmado.")
    assert confirmed.status_code == 200, confirmed.text

    pendencies = asyncio.run(_pendency_snapshot(friendly_id))
    assert len(pendencies) == 1
    asyncio.run(_resolve_pendency(pendencies[0]["id"]))

    cleared = _clear(friendly_id, event_id, notes="Revisão concluída, pendência de crédito já resolvida.")
    assert cleared.status_code == 200, cleared.text

    credits = asyncio.run(_credit_snapshot(friendly_id))
    assert credits[0]["status"] == "AVAILABLE"
    assert credits[0]["quantityAvailable"] == Decimal("100")
