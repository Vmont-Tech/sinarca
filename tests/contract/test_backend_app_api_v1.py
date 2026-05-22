from __future__ import annotations

import uuid
import asyncio

from fastapi.testclient import TestClient

from backend_app.db.session import get_sessionmaker
from backend_app.main import app
from backend_app.modules.monitoring.service import MonitoringService
from backend_app.modules.profiles.repository import reset_profile_repository

client = TestClient(app)


def setup_function() -> None:
    reset_profile_repository()


def auth_headers(email: str = "produtor@sinarca.com.br", password: str = "produtor") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def tag_payload(prefix: str) -> list[dict[str, object]]:
    return [
        {
            "tag_uid": f"{prefix}-{index}",
            "cmac": f"cmac-{prefix}-{index}",
            "latitude": -10.10 - (index * 0.01),
            "longitude": -48.30 - (index * 0.01),
            "vertex_label": label,
        }
        for index, label in enumerate(["A", "B", "C", "D"], start=1)
    ]


def project_payload(prefix: str, tags: list[dict[str, object]] | None = None) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": f"Projeto Teste {prefix}",
        "description": "Projeto criado pelo contrato persistente da API v1.",
        "project_type": "reforestation",
        "producer_id": "prod-001",
        "certifier_id": "std-001",
        "location": {
            "city": "Porto Nacional",
            "state": "Tocantins",
            "stateId": "to",
            "bioma": "Cerrado",
            "coordinates": {"lat": -10.70, "lng": -48.41, "svgX": 392, "svgY": 292},
        },
    }
    if tags is not None:
        payload["tags"] = tags
    return payload


def create_project_for_workflow(prefix: str | None = None) -> dict[str, object]:
    unique_prefix = prefix or f"workflow-{uuid.uuid4().hex[:10]}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)),
        headers=auth_headers(),
    )
    assert response.status_code == 201
    return response.json()["project"]


def test_projects_collection_detail_catalogs_and_creation_use_persistent_api() -> None:
    collection_response = client.get("/api/v1/projects?limit=1000")

    assert collection_response.status_code == 200
    collection = collection_response.json()
    assert collection["success"] is True
    assert isinstance(collection["total"], int)
    assert collection["projects"]

    project = collection["projects"][0]
    for key in ["id", "friendlyId", "name", "description", "status", "methodology", "location", "metrics", "entities", "blockchain", "image", "timeline"]:
        assert key in project

    detail_response = client.get(f"/api/v1/projects/{project['friendlyId']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["project"]["friendlyId"] == project["friendlyId"]

    for route, key in [
        ("/api/v1/certifiers", "certifiers"),
        ("/api/v1/auditors", "auditors"),
        ("/api/v1/companies", "companies"),
    ]:
        response = client.get(route)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data[key]

    unique_prefix = f"contract-{uuid.uuid4().hex[:10]}"
    invalid_response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)[:2]),
        headers=auth_headers(),
    )
    assert invalid_response.status_code == 400
    assert "4 tags" in invalid_response.json()["detail"]

    create_response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)),
        headers=auth_headers(),
    )
    assert create_response.status_code == 201
    created = create_response.json()["project"]
    assert created["name"] == f"Projeto Teste {unique_prefix}"
    assert created["status"] == "AWAITING_CERTIFICATION"
    assert created["metrics"]["carbonStock"] > 0
    assert created["blockchain"]["initialHash"].startswith("baseline-")


def test_certifier_queue_and_decision_apply_role_guard_and_status_transition() -> None:
    project = create_project_for_workflow()

    queue_response = client.get("/api/v1/certifier/queue", headers=auth_headers("certificadora@sinarca.com.br", "certificadora"))
    assert queue_response.status_code == 200
    assert queue_response.json()["success"] is True

    forbidden = client.patch(
        f"/api/v1/certifier/projects/{project['friendlyId']}/decision",
        json={"decision": "APPROVE", "notes": "tentativa indevida"},
        headers=auth_headers("empresa@sinarca.com.br", "empresa"),
    )
    assert forbidden.status_code == 403

    approve_response = client.patch(
        f"/api/v1/certifier/projects/{project['friendlyId']}/decision",
        json={"decision": "APPROVE", "credit_potential": 1234, "notes": "Certificação aprovada"},
        headers=auth_headers("certificadora@sinarca.com.br", "certificadora"),
    )
    assert approve_response.status_code == 200
    data = approve_response.json()
    assert data["success"] is True
    assert data["new_status"] == "AWAITING_AUDIT"
    assert data["credit_potential"] == 1234


def test_audit_queue_verify_and_monitoring_anomaly_block_project() -> None:
    project = create_project_for_workflow()
    certifier_response = client.patch(
        f"/api/v1/certifier/projects/{project['friendlyId']}/decision",
        json={"decision": "APPROVE", "credit_potential": 900},
        headers=auth_headers("certificadora@sinarca.com.br", "certificadora"),
    )
    assert certifier_response.status_code == 200

    queue_response = client.get("/api/v1/audit/queue", headers=auth_headers("auditor@sinarca.com.br", "auditor"))
    assert queue_response.status_code == 200
    assert queue_response.json()["success"] is True

    approve_response = client.patch(
        f"/api/v1/audit/verify/{project['friendlyId']}",
        json={
            "status": "APPROVED",
            "laudo_texto": "Auditoria aprovada no teste de contrato",
            "latitude": -10.70,
            "longitude": -48.41,
            "evidencias_url": ["https://example.test/evidencia.jpg"],
            "assinatura_digital": "assinatura-auditor",
        },
        headers=auth_headers("auditor@sinarca.com.br", "auditor"),
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["new_status"] == "ACTIVE"

    async def evaluate() -> dict[str, object]:
        async with get_sessionmaker()() as session:
            return await MonitoringService(session).evaluate_anomaly(
                str(project["friendlyId"]),
                vegetation_cover_pct=1,
                ndvi_mean=0.1,
                confidence=0.99,
            )

    result = asyncio.run(evaluate())
    assert result["blocked"] is True
    assert result["new_status"] == "BLOCKED_AUDIT_REQUIRED"

    detail = client.get(f"/api/v1/projects/{project['friendlyId']}")
    assert detail.status_code == 200
    assert detail.json()["project"]["status"] == "BLOCKED_AUDIT_REQUIRED"
