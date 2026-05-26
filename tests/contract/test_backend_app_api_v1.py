from __future__ import annotations

import uuid
import asyncio

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend_app.db.models import AuditEvent, Document
from backend_app.db.session import get_sessionmaker
from backend_app.main import app
from backend_app.modules.monitoring.service import MonitoringService

client = TestClient(app)


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


def test_project_monitoring_summary_comes_from_database() -> None:
    response = client.get("/api/v1/monitoring/projects/PRC-2024-002")

    assert response.status_code == 200
    payload = response.json()
    assert payload["project"]["friendlyId"] == "PRC-2024-002"
    assert payload["baseline"]["ndviMean"] == 0.681
    assert len(payload["tags"]) == 4


def activate_project_for_marketplace(prefix: str | None = None, credit_potential: int = 1200) -> dict[str, object]:
    project = create_project_for_workflow(prefix)
    certifier_response = client.patch(
        f"/api/v1/certifier/projects/{project['friendlyId']}/decision",
        json={"decision": "APPROVE", "credit_potential": credit_potential},
        headers=auth_headers("certificadora@sinarca.com.br", "certificadora"),
    )
    assert certifier_response.status_code == 200
    audit_response = client.patch(
        f"/api/v1/audit/verify/{project['friendlyId']}",
        json={"status": "APPROVED", "laudo_texto": "Auditoria aprovada para marketplace"},
        headers=auth_headers("auditor@sinarca.com.br", "auditor"),
    )
    assert audit_response.status_code == 200
    return project


def test_marketplace_buy_ledger_compensate_and_transactions_are_persistent() -> None:
    project = activate_project_for_marketplace(credit_potential=1200)

    marketplace_response = client.get("/api/v1/marketplace")
    assert marketplace_response.status_code == 200
    marketplace = marketplace_response.json()
    assert marketplace["success"] is True
    assert any(item["friendlyId"] == project["friendlyId"] for item in marketplace["credits"])

    company_headers = auth_headers("empresa@sinarca.com.br", "empresa")
    buy_response = client.post(
        "/api/v1/marketplace/buy",
        json={
            "project_id": project["id"],
            "buyer_id": "comp-001",
            "quantidade": 10,
            "unit_price_brl": 500,
            "idempotency_key": f"buy-{uuid.uuid4().hex}",
        },
        headers=company_headers,
    )
    assert buy_response.status_code == 200
    buy = buy_response.json()
    assert buy["success"] is True
    assert buy["message"] == "Compra registrada"
    assert buy["transaction"]["tipo_transacao"] == "PURCHASE"
    assert buy["transaction"]["ledger_mode"] == "OFFCHAIN_LEDGER_PURCHASE"
    assert buy["transaction"]["totalValue"] == 5000

    compensate_response = client.post(
        "/api/v1/marketplace/compensate",
        json={
            "buyer_id": "comp-001",
            "emissions_data": {"scope1": 2, "scope2": 1, "scope3": 1, "total": 4},
            "credits_to_use": [{"project_id": project["id"], "amount": 4}],
            "idempotency_key": f"retire-{uuid.uuid4().hex}",
        },
        headers=company_headers,
    )
    assert compensate_response.status_code == 200
    compensate = compensate_response.json()
    assert compensate["success"] is True
    assert compensate["message"] == "Compensação realizada com sucesso"
    assert compensate["certificate"]["emissionsCompensated"] == 4
    assert compensate["certificate"]["certificateUrl"]
    assert compensate["certificate"]["blockchainHash"]

    transactions_response = client.get("/api/v1/transactions", headers=company_headers)
    assert transactions_response.status_code == 200
    transactions = transactions_response.json()["transactions"]
    assert any(tx["type"] == "received" and tx["asset"] == project["name"] for tx in transactions)
    assert any(tx["type"] == "retired" and tx["asset"] == project["name"] for tx in transactions)


def test_inventory_declare_and_secure_upload_persist_documents() -> None:
    headers = auth_headers("empresa@sinarca.com.br", "empresa")

    inventory_response = client.get("/api/v1/inventory", headers=headers)
    assert inventory_response.status_code == 200
    assert inventory_response.json()["success"] is True
    assert inventory_response.json()["inventory"]

    declaration_response = client.post(
        "/api/v1/inventory/declare",
        json={"escopo_1": 10, "escopo_2": 20, "escopo_3": 30},
        headers=headers,
    )
    assert declaration_response.status_code == 201
    declaration = declaration_response.json()
    assert declaration["success"] is True
    assert declaration["total_emissoes"] == 60
    assert declaration["recommended_offset_tco2e"] == 60

    unauthenticated_upload = client.post(
        "/api/v1/inventory/upload",
        files={"file": ("evidencia.pdf", b"%PDF-1.4\nsem auth", "application/pdf")},
    )
    assert unauthenticated_upload.status_code == 401

    spoofed_upload = client.post(
        "/api/v1/inventory/upload",
        files={"file": ("evidencia.pdf", b"not a pdf", "application/pdf")},
        headers=headers,
    )
    assert spoofed_upload.status_code == 400

    pdf_content = b"%PDF-1.4\n% contract evidence " + uuid.uuid4().hex.encode()
    upload_response = client.post(
        "/api/v1/inventory/upload",
        files={"file": ("evidencia.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )
    assert upload_response.status_code == 201
    upload = upload_response.json()
    assert upload["success"] is True
    assert upload["sha256"]
    assert upload["size_bytes"] == len(pdf_content)


def test_project_document_upload_requires_auth_and_validates_file_contract() -> None:
    project = create_project_for_workflow()
    endpoint = f"/api/v1/projects/{project['friendlyId']}/documents"

    unauthenticated_upload = client.post(
        endpoint,
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", b"%PDF-1.4\nsem auth", "application/pdf")},
    )
    assert unauthenticated_upload.status_code == 401

    unsupported_upload = client.post(
        endpoint,
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("malware.exe", b"MZ fake executable", "application/octet-stream")},
        headers=auth_headers(),
    )
    assert unsupported_upload.status_code == 415

    spoofed_upload = client.post(
        endpoint,
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", b"not a pdf", "application/pdf")},
        headers=auth_headers(),
    )
    assert spoofed_upload.status_code == 400


def test_project_document_upload_persists_project_link_and_audit_event() -> None:
    project = create_project_for_workflow()
    endpoint = f"/api/v1/projects/{project['friendlyId']}/documents"
    pdf_content = b"%PDF-1.4\nproject document evidence " + uuid.uuid4().hex.encode()

    upload_response = client.post(
        endpoint,
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=auth_headers(),
    )

    assert upload_response.status_code == 201
    upload = upload_response.json()
    assert upload["success"] is True
    assert upload["project_id"] == project["friendlyId"]
    assert upload["document_type"] == "LEGAL_OWNERSHIP"
    assert upload["sha256"]
    assert upload["storage_path"].startswith(f"projects/{project['friendlyId']}/documents/")
    assert upload["size_bytes"] == len(pdf_content)
    assert upload["mime_type"] == "application/pdf"
    assert upload["status"] == "UPLOADED"

    async def persisted_document_and_audit() -> tuple[Document | None, AuditEvent | None]:
        async with get_sessionmaker()() as session:
            document = (
                await session.execute(select(Document).where(Document.sha256_hash == upload["sha256"]))
            ).scalar_one_or_none()
            audit_event = (
                await session.execute(
                    select(AuditEvent).where(
                        AuditEvent.action == "PROJECT_DOCUMENT_UPLOADED",
                        AuditEvent.entity_id == document.id if document is not None else None,
                    )
                )
            ).scalar_one_or_none()
            return document, audit_event

    document, audit_event = asyncio.run(persisted_document_and_audit())
    assert document is not None
    assert str(document.project_id)
    assert document.storage_path == upload["storage_path"]
    assert audit_event is not None
    assert audit_event.metadata_["friendly_id"] == project["friendlyId"]
    assert audit_event.metadata_["document_type"] == "LEGAL_OWNERSHIP"
    assert audit_event.metadata_["sha256"] == upload["sha256"]
