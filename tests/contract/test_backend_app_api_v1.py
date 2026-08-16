from __future__ import annotations

import uuid
import asyncio

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend_app.db.models import AuditEvent, Document, Project, ProjectDraft, ProjectDraftDocument, ProjectTag
from backend_app.db.session import get_sessionmaker
from backend_app.main import app
from backend_app.modules.monitoring.service import MonitoringService

client = TestClient(app)


def auth_headers(email: str = "produtor@sinarca.com.br", password: str = "produtor") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def auth_headers_for_new_role(role: str, organization: str) -> dict[str, str]:
    suffix = uuid.uuid4().hex[:10]
    email = f"{role}.{suffix}@sinarca.com.br"
    password = "senha-super-secreta"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": f"{role.title()} {suffix}",
            "email": email,
            "document": f"doc-{suffix}",
            "password": password,
            "role": role,
        },
    )
    assert response.status_code == 201
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
    organization_response = client.patch(
        "/api/v1/auth/me",
        json={"organization": organization},
        headers=headers,
    )
    assert organization_response.status_code == 200
    return headers


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


def five_tag_payload(prefix: str) -> list[dict[str, object]]:
    payload = tag_payload(prefix)
    payload.append(
        {
            "tag_uid": f"{prefix}-5",
            "cmac": f"cmac-{prefix}-5",
            "latitude": -10.110000,
            "longitude": -48.330000,
            "vertex_label": "E",
        }
    )
    return payload


def optional_qtag_vertex_payload(prefix: str) -> list[dict[str, object]]:
    payload = tag_payload(prefix)
    payload[1] = {
        "has_qtag": False,
        "latitude": -10.100000,
        "longitude": -48.320000,
        "vertex_label": "B",
    }
    payload[2] = {
        "has_qtag": False,
        "latitude": -10.120000,
        "longitude": -48.320000,
        "vertex_label": "C",
    }
    return payload


def colinear_tag_payload(prefix: str) -> list[dict[str, object]]:
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


def project_payload(prefix: str, tags: list[dict[str, object]] | None = None, public_marketplace: bool | None = None) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": f"Projeto Teste {prefix}",
        "description": "Projeto criado pelo contrato persistente da API v1.",
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
    }
    if tags is not None:
        payload["tags"] = tags
    if public_marketplace is not None:
        payload["public_marketplace"] = public_marketplace
    return payload


def create_project_for_workflow(prefix: str | None = None, *, public_marketplace: bool | None = None) -> dict[str, object]:
    unique_prefix = prefix or f"workflow-{uuid.uuid4().hex[:10]}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix), public_marketplace=public_marketplace),
        headers=auth_headers(),
    )
    assert response.status_code == 201
    return response.json()["project"]


CERTIFIER_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n"


def upload_certification_minimum_documents(friendly_id: str) -> None:
    for document_type, filename in (("LEGAL_OWNERSHIP", "matricula.pdf"), ("FOREST_INVENTORY", "inventario.pdf")):
        # Mantem conteudo distinto para exercitar duas evidencias reais no dossie
        # minimo; a deduplicacao idempotente agora tambem considera document_type.
        content = CERTIFIER_PDF_BYTES + document_type.encode()
        response = client.post(
            f"/api/v1/projects/{friendly_id}/documents",
            data={"document_type": document_type},
            files={"file": (filename, content, "application/pdf")},
            headers=auth_headers(),
        )
        assert response.status_code == 201, response.text


def certifier_approve(friendly_id: str, credit_potential: float, *, notes: str = "Certificação aprovada") -> dict[str, object]:
    upload_certification_minimum_documents(friendly_id)
    response = client.patch(
        f"/api/v1/certifier/projects/{friendly_id}/decision",
        data={
            "decision": "APPROVE",
            "methodology": "AR-ACM0003",
            "credit_potential": str(credit_potential),
            "credit_potential_adjustment_reason": "Potencial ajustado para o cenário de contrato.",
            "notes": notes,
        },
        files={"certificate": ("certificado.pdf", CERTIFIER_PDF_BYTES, "application/pdf")},
        headers=auth_headers("certificadora@sinarca.com.br", "certificadora"),
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_projects_collection_detail_catalogs_and_creation_use_persistent_api() -> None:
    collection_response = client.get("/api/v1/projects?limit=1000")

    assert collection_response.status_code == 200
    collection = collection_response.json()
    assert collection["success"] is True
    assert isinstance(collection["total"], int)
    assert collection["projects"]

    project = collection["projects"][0]
    for key in [
        "id",
        "friendlyId",
        "name",
        "description",
        "status",
        "methodology",
        "location",
        "metrics",
        "entities",
        "blockchain",
        "image",
        "timeline",
        "lifecycle",
        "currentLifecycleStage",
    ]:
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

    inventory_response = client.get("/api/v1/inventory")
    assert inventory_response.status_code == 200
    inventory = inventory_response.json()["inventory"]
    assert len(inventory) == 27
    assert {item["uf"] for item in inventory} >= {"AC", "DF", "SP", "TO"}

    unique_prefix = f"contract-{uuid.uuid4().hex[:10]}"
    invalid_response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)[:2]),
        headers=auth_headers(),
    )
    assert invalid_response.status_code == 400
    assert "mínimo de 4" in invalid_response.json()["detail"]

    duplicated_vertices = tag_payload(f"{unique_prefix}-duplicated")
    duplicated_vertices[1]["vertex_label"] = "A"
    duplicated_response = client.post(
        "/api/v1/projects",
        json=project_payload(f"{unique_prefix}-duplicated", tags=duplicated_vertices),
        headers=auth_headers(),
    )
    assert duplicated_response.status_code == 400
    assert "não podem repetir" in duplicated_response.json()["detail"]

    colinear_response = client.post(
        "/api/v1/projects",
        json=project_payload(f"{unique_prefix}-colinear", tags=colinear_tag_payload(f"{unique_prefix}-colinear")),
        headers=auth_headers(),
    )
    assert colinear_response.status_code == 400
    assert "área" in colinear_response.json()["detail"]

    invalid_state_payload = project_payload(f"{unique_prefix}-invalid-state", tags=tag_payload(f"{unique_prefix}-invalid-state"))
    invalid_state_payload["location"]["state"] = "Estado Inexistente"
    invalid_state_payload["location"]["stateId"] = "xx"
    invalid_state_response = client.post(
        "/api/v1/projects",
        json=invalid_state_payload,
        headers=auth_headers(),
    )
    assert invalid_state_response.status_code == 400
    assert "catálogo de UFs" in invalid_state_response.json()["detail"]

    create_response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)),
        headers=auth_headers(),
    )
    assert create_response.status_code == 201
    created = create_response.json()["project"]
    assert created["name"] == f"Projeto Teste {unique_prefix}"
    assert created["location"]["state"] == "Tocantins"
    assert created["location"]["stateId"] == "to"
    assert created["status"] == "AWAITING_CERTIFICATION"
    assert created["publicMarketplace"] is False
    assert created["image"] == f"data:image/png;base64,{unique_prefix}"
    assert created["metrics"]["carbonStock"] > 0
    assert created["blockchain"]["initialHash"].startswith("baseline-")
    assert created["metadata"]["sun_validation_status"] == "BLOCKED_MISSING_CREDENTIALS"
    assert created["metadata"]["cmac_validation_status"] == "RECORDED_DECLARED_VALUE"
    assert created["metadata"]["baseline_source"] == "deterministic_baseline"
    assert created["metadata"]["sentinel_status"] == "BLOCKED_MISSING_PROVIDER_CREDENTIALS"
    assert created["currentLifecycleStage"]["code"] == "AWAITING_CERTIFICATION"
    assert created["currentLifecycleStage"]["label"] == "Certificação"
    assert [stage["code"] for stage in created["lifecycle"]] == [
        "CREATED",
        "AWAITING_CERTIFICATION",
        "TOKENIZED_LOCKED",
        "AWAITING_AUDIT",
        "AVAILABLE",
        "RESERVED",
        "RETIRED",
    ]
    assert created["lifecycle"][0]["state"] == "completed"
    assert created["lifecycle"][1]["state"] == "current"
    assert created["lifecycle"][2]["state"] == "pending"

    timeline_codes = [event.get("code") for event in created["timeline"]]
    assert timeline_codes == [
        "CREATED",
        "QTAGS_RECORDED",
        "BASELINE_CREATED",
        "DOCUMENTS_PENDING",
        "AWAITING_CERTIFICATION",
    ]

    five_tag_response = client.post(
        "/api/v1/projects",
        json=project_payload(f"{unique_prefix}-five", tags=five_tag_payload(f"{unique_prefix}-five")),
        headers=auth_headers(),
    )
    assert five_tag_response.status_code == 201
    five_tag_project = five_tag_response.json()["project"]
    dossier_response = client.get(f"/api/v1/projects/{five_tag_project['friendlyId']}/public-dossier")
    assert dossier_response.status_code == 200
    assert [tag["vertex"] for tag in dossier_response.json()["tags"]] == ["A", "B", "C", "D", "E"]

    optional_qtag_response = client.post(
        "/api/v1/projects",
        json=project_payload(f"{unique_prefix}-optional-qtag", tags=optional_qtag_vertex_payload(f"{unique_prefix}-optional-qtag")),
        headers=auth_headers(),
    )
    assert optional_qtag_response.status_code == 201
    optional_qtag_project = optional_qtag_response.json()["project"]
    optional_qtag_dossier_response = client.get(f"/api/v1/projects/{optional_qtag_project['friendlyId']}/public-dossier")
    assert optional_qtag_dossier_response.status_code == 200
    optional_qtag_tags = optional_qtag_dossier_response.json()["tags"]
    assert [tag["hasQtag"] for tag in optional_qtag_tags] == [True, False, False, True]
    assert optional_qtag_tags[1]["tagUid"] is None
    assert optional_qtag_tags[1]["cmac"] is None


def test_certifier_queue_and_decision_apply_role_guard_and_status_transition() -> None:
    project = create_project_for_workflow()

    queue_response = client.get("/api/v1/certifier/queue", headers=auth_headers("certificadora@sinarca.com.br", "certificadora"))
    assert queue_response.status_code == 200
    assert queue_response.json()["success"] is True

    forbidden = client.patch(
        f"/api/v1/certifier/projects/{project['friendlyId']}/decision",
        data={"decision": "APPROVE", "notes": "tentativa indevida"},
        headers=auth_headers("empresa@sinarca.com.br", "empresa"),
    )
    assert forbidden.status_code == 403

    data = certifier_approve(project["friendlyId"], 1234)
    assert data["success"] is True
    assert data["new_status"] == "CERTIFIED_AWAITING_TREASURY"
    assert data["credit_potential"] == 1234
    assert data["certificate"]["documentType"] == "CERTIFICATION_CERTIFICATE"


def test_audit_queue_verify_and_monitoring_anomaly_block_project() -> None:
    project = create_project_for_workflow()
    certifier_approve(project["friendlyId"], 900)

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


def activate_project_for_marketplace(
    prefix: str | None = None,
    credit_potential: int = 1200,
    *,
    public_marketplace: bool = True,
) -> dict[str, object]:
    project = create_project_for_workflow(prefix, public_marketplace=public_marketplace)
    certifier_approve(project["friendlyId"], credit_potential)
    audit_response = client.patch(
        f"/api/v1/audit/verify/{project['friendlyId']}",
        json={"status": "APPROVED", "laudo_texto": "Auditoria aprovada para marketplace"},
        headers=auth_headers("auditor@sinarca.com.br", "auditor"),
    )
    assert audit_response.status_code == 200
    return project


def test_public_marketplace_listing_requires_explicit_flag_and_ready_status() -> None:
    hidden_prefix = f"hidden-market-{uuid.uuid4().hex[:10]}"
    public_prefix = f"public-market-{uuid.uuid4().hex[:10]}"
    not_ready_prefix = f"public-draft-{uuid.uuid4().hex[:10]}"

    hidden_project = activate_project_for_marketplace(hidden_prefix, public_marketplace=False)
    public_project = activate_project_for_marketplace(public_prefix, public_marketplace=True)
    not_ready_project = create_project_for_workflow(not_ready_prefix, public_marketplace=True)

    assert hidden_project["publicMarketplace"] is False
    assert public_project["publicMarketplace"] is True
    assert not_ready_project["publicMarketplace"] is True

    public_projects_response = client.get("/api/v1/projects?public_marketplace=true&limit=1000")
    assert public_projects_response.status_code == 200
    public_project_ids = {item["friendlyId"] for item in public_projects_response.json()["projects"]}

    assert public_project["friendlyId"] in public_project_ids
    assert hidden_project["friendlyId"] not in public_project_ids
    assert not_ready_project["friendlyId"] not in public_project_ids

    marketplace_response = client.get("/api/v1/marketplace")
    assert marketplace_response.status_code == 200
    marketplace_ids = {item["friendlyId"] for item in marketplace_response.json()["credits"]}

    assert public_project["friendlyId"] in marketplace_ids
    assert hidden_project["friendlyId"] not in marketplace_ids
    assert not_ready_project["friendlyId"] not in marketplace_ids

    hidden_buy_response = client.post(
        "/api/v1/marketplace/buy",
        json={
            "project_id": hidden_project["id"],
            "buyer_id": "comp-001",
            "quantidade": 1,
            "unit_price_brl": 500,
            "idempotency_key": f"hidden-buy-{uuid.uuid4().hex}",
        },
        headers=auth_headers("empresa@sinarca.com.br", "empresa"),
    )
    assert hidden_buy_response.status_code == 400
    assert "não disponível no marketplace" in hidden_buy_response.json()["detail"]


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
    assert upload["storage_bucket"] == "projects"
    assert upload["storage_object_path"].startswith(f"projects/{project['friendlyId']}/documents/legal_ownership/")
    assert upload["storage_path"].startswith("supabase://projects/")
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
    assert document.storage_bucket == "projects"
    assert document.storage_object_path == upload["storage_object_path"]
    assert audit_event is not None
    assert audit_event.metadata_["friendly_id"] == project["friendlyId"]
    assert audit_event.metadata_["document_type"] == "LEGAL_OWNERSHIP"
    assert audit_event.metadata_["sha256"] == upload["sha256"]

    dossier_response = client.get(f"/api/v1/projects/{project['friendlyId']}/public-dossier")
    assert dossier_response.status_code == 200
    documents = dossier_response.json()["documents"]
    # Dossiê público minimizado (CERT-05/D-20/D-22): documentos internos como
    # LEGAL_OWNERSHIP não são expostos; só CERTIFICATION_CERTIFICATE aparece aqui.
    assert not any(item["type"] == "LEGAL_OWNERSHIP" for item in documents)


def test_project_document_upload_is_idempotent_for_same_project_file() -> None:
    project = create_project_for_workflow()
    endpoint = f"/api/v1/projects/{project['friendlyId']}/documents"
    pdf_content = b"%PDF-1.4\nproject repeated evidence " + uuid.uuid4().hex.encode()
    headers = auth_headers()

    first_upload = client.post(
        endpoint,
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )
    second_upload = client.post(
        endpoint,
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )

    assert first_upload.status_code == 201
    assert second_upload.status_code == 201
    first = first_upload.json()
    second = second_upload.json()
    assert second["id"] == first["id"]
    assert second["sha256"] == first["sha256"]
    assert second["storage_path"] == first["storage_path"]


def test_project_document_upload_allows_same_file_for_different_document_types() -> None:
    project = create_project_for_workflow()
    endpoint = f"/api/v1/projects/{project['friendlyId']}/documents"
    pdf_content = b"%PDF-1.4\nproject shared document role evidence " + uuid.uuid4().hex.encode()
    headers = auth_headers()

    legal_upload = client.post(
        endpoint,
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("dossie.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )
    inventory_upload = client.post(
        endpoint,
        data={"document_type": "FOREST_INVENTORY"},
        files={"file": ("dossie.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )

    assert legal_upload.status_code == 201
    assert inventory_upload.status_code == 201
    legal = legal_upload.json()
    inventory = inventory_upload.json()
    assert inventory["id"] != legal["id"]
    assert inventory["sha256"] == legal["sha256"]
    assert inventory["document_type"] == "FOREST_INVENTORY"
    assert inventory["storage_object_path"].startswith(f"projects/{project['friendlyId']}/documents/forest_inventory/")


def test_project_document_upload_allows_same_file_in_different_projects() -> None:
    first_project = create_project_for_workflow()
    second_project = create_project_for_workflow()
    pdf_content = b"%PDF-1.4\nshared project document evidence " + uuid.uuid4().hex.encode()
    headers = auth_headers()

    first_upload = client.post(
        f"/api/v1/projects/{first_project['friendlyId']}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )
    second_upload = client.post(
        f"/api/v1/projects/{second_project['friendlyId']}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )

    assert first_upload.status_code == 201
    assert second_upload.status_code == 201
    first = first_upload.json()
    second = second_upload.json()
    assert second["id"] != first["id"]
    assert second["sha256"] == first["sha256"]
    assert second["storage_path"] != first["storage_path"]
    assert second["storage_object_path"].startswith(f"projects/{second_project['friendlyId']}/documents/legal_ownership/")


def test_project_update_allows_pre_certification_fields_and_replaces_vertices() -> None:
    project = create_project_for_workflow()
    update_prefix = f"edit-{uuid.uuid4().hex[:10]}"
    payload = project_payload(update_prefix, tags=five_tag_payload(update_prefix), public_marketplace=True)
    payload["name"] = "Projeto editado antes da certificação"
    payload["description"] = "Edição validada antes da certificação."
    payload["area_hectares"] = 4321
    payload["carbon_stock"] = 98765
    payload["location"]["city"] = "Antonina"
    payload["location"]["state"] = "Paraná"
    payload["location"]["stateId"] = "pr"

    update_response = client.patch(
        f"/api/v1/projects/{project['friendlyId']}",
        json=payload,
        headers=auth_headers(),
    )

    assert update_response.status_code == 200
    updated = update_response.json()["project"]
    assert updated["friendlyId"] == project["friendlyId"]
    assert updated["name"] == "Projeto editado antes da certificação"
    assert updated["description"] == "Edição validada antes da certificação."
    assert updated["location"]["city"] == "Antonina"
    assert updated["location"]["stateId"] == "pr"
    assert updated["metrics"]["totalAreaHa"] == 4321
    assert updated["metrics"]["carbonStock"] == 98765
    assert updated["publicMarketplace"] is True
    assert updated["status"] == "AWAITING_CERTIFICATION"

    dossier_response = client.get(f"/api/v1/projects/{project['friendlyId']}/public-dossier")
    assert dossier_response.status_code == 200
    assert [tag["vertex"] for tag in dossier_response.json()["tags"]] == ["A", "B", "C", "D", "E"]

    async def persisted_project_and_tags() -> tuple[Project | None, list[ProjectTag], AuditEvent | None]:
        async with get_sessionmaker()() as session:
            persisted = (
                await session.execute(select(Project).where(Project.friendly_id == project["friendlyId"]))
            ).scalar_one_or_none()
            tags = list(
                (
                    await session.execute(select(ProjectTag).where(ProjectTag.project_id == persisted.id).order_by(ProjectTag.vertex_label))
                )
                .scalars()
                .all()
            ) if persisted else []
            audit = (
                await session.execute(
                    select(AuditEvent).where(
                        AuditEvent.action == "PROJECT_UPDATED",
                        AuditEvent.entity_id == persisted.id if persisted is not None else None,
                    )
                )
            ).scalar_one_or_none()
            return persisted, tags, audit

    persisted, persisted_tags, audit_event = asyncio.run(persisted_project_and_tags())
    assert persisted is not None
    assert persisted.city == "Antonina"
    assert persisted.state_id == "pr"
    assert [tag.vertex_label for tag in persisted_tags] == ["A", "B", "C", "D", "E"]
    assert audit_event is not None
    assert audit_event.metadata_["friendly_id"] == project["friendlyId"]

    activated = activate_project_for_marketplace(f"cannot-edit-{uuid.uuid4().hex[:8]}")
    locked_response = client.patch(
        f"/api/v1/projects/{activated['friendlyId']}",
        json=project_payload(f"locked-{uuid.uuid4().hex[:8]}", tags=tag_payload("locked")),
        headers=auth_headers(),
    )
    assert locked_response.status_code == 400
    assert "não pode ser editado diretamente" in locked_response.json()["detail"]


def test_project_update_and_edit_draft_enforce_project_organization_scope() -> None:
    project = create_project_for_workflow(f"owner-scope-{uuid.uuid4().hex[:8]}")
    other_producer_headers = auth_headers_for_new_role("producer", "Produtor sem vínculo com o projeto")
    other_certifier_headers = auth_headers_for_new_role("certifier", "Certificadora sem vínculo com o projeto")

    hijack_prefix = f"hijack-{uuid.uuid4().hex[:10]}"
    hijack_payload = project_payload(hijack_prefix, tags=tag_payload(hijack_prefix))
    hijack_payload["producer_id"] = None
    forbidden_update = client.patch(
        f"/api/v1/projects/{project['friendlyId']}",
        json=hijack_payload,
        headers=other_producer_headers,
    )
    assert forbidden_update.status_code == 403

    forbidden_draft = client.post(
        "/api/v1/project-drafts",
        json={
            "draft_kind": "EDIT",
            "target_project_id": project["friendlyId"],
            "current_step": "project",
            "payload": hijack_payload,
        },
        headers=other_producer_headers,
    )
    assert forbidden_draft.status_code == 403

    forbidden_document_upload = client.post(
        f"/api/v1/projects/{project['friendlyId']}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", b"%PDF-1.4\nregistro sem vinculo", "application/pdf")},
        headers=other_producer_headers,
    )
    assert forbidden_document_upload.status_code == 403

    denied_certifier_prefix = f"certifier-denied-{uuid.uuid4().hex[:10]}"
    certifier_payload = project_payload(denied_certifier_prefix, tags=tag_payload(denied_certifier_prefix))
    forbidden_certifier_update = client.patch(
        f"/api/v1/projects/{project['friendlyId']}",
        json=certifier_payload,
        headers=other_certifier_headers,
    )
    assert forbidden_certifier_update.status_code == 403

    linked_certifier_prefix = f"certifier-linked-{uuid.uuid4().hex[:10]}"
    linked_certifier_payload = project_payload(linked_certifier_prefix, tags=tag_payload(linked_certifier_prefix))
    linked_certifier_payload["name"] = "Projeto atualizado pela certificadora vinculada"
    linked_certifier_update = client.patch(
        f"/api/v1/projects/{project['friendlyId']}",
        json=linked_certifier_payload,
        headers=auth_headers("certificadora@sinarca.com.br", "certificadora"),
    )
    assert linked_certifier_update.status_code == 200
    assert linked_certifier_update.json()["project"]["name"] == "Projeto atualizado pela certificadora vinculada"

    admin_prefix = f"admin-edit-{uuid.uuid4().hex[:10]}"
    admin_payload = project_payload(admin_prefix, tags=tag_payload(admin_prefix))
    admin_payload["name"] = "Projeto atualizado pelo administrador"
    admin_update = client.patch(
        f"/api/v1/projects/{project['friendlyId']}",
        json=admin_payload,
        headers=auth_headers("admin@sinarca.com.br", "admin"),
    )
    assert admin_update.status_code == 200
    assert admin_update.json()["project"]["name"] == "Projeto atualizado pelo administrador"


def test_producer_project_listing_scope_mine_returns_only_own_organization_projects() -> None:
    owner_headers = auth_headers()
    owner_project = create_project_for_workflow(f"owner-list-{uuid.uuid4().hex[:8]}")
    portfolio_project = activate_project_for_marketplace(f"portfolio-list-{uuid.uuid4().hex[:8]}", public_marketplace=False)
    other_producer_headers = auth_headers_for_new_role("producer", "Produtor alternativo para listagem")

    other_prefix = f"other-list-{uuid.uuid4().hex[:10]}"
    other_payload = project_payload(other_prefix, tags=tag_payload(other_prefix))
    other_payload["producer_id"] = None
    other_project_response = client.post(
        "/api/v1/projects",
        json=other_payload,
        headers=other_producer_headers,
    )
    assert other_project_response.status_code == 201
    other_project = other_project_response.json()["project"]

    owner_list = client.get("/api/v1/projects?scope=mine&limit=1000", headers=owner_headers)
    owner_portfolio_list = client.get("/api/v1/projects?scope=mine&portfolio_only=true&limit=1000", headers=owner_headers)
    owner_default_panel_list = client.get("/api/v1/projects?limit=1000", headers=owner_headers)
    other_list = client.get("/api/v1/projects?scope=mine&limit=1000", headers=other_producer_headers)
    admin_list = client.get("/api/v1/projects?scope=mine&limit=1000", headers=auth_headers("admin@sinarca.com.br", "admin"))

    assert owner_list.status_code == 200
    assert owner_portfolio_list.status_code == 200
    assert owner_default_panel_list.status_code == 200
    assert other_list.status_code == 200
    assert admin_list.status_code == 200

    owner_ids = {item["friendlyId"] for item in owner_list.json()["projects"]}
    owner_portfolio_ids = {item["friendlyId"] for item in owner_portfolio_list.json()["projects"]}
    owner_default_panel_ids = {item["friendlyId"] for item in owner_default_panel_list.json()["projects"]}
    other_ids = {item["friendlyId"] for item in other_list.json()["projects"]}
    admin_ids = {item["friendlyId"] for item in admin_list.json()["projects"]}

    assert owner_project["friendlyId"] in owner_ids
    assert portfolio_project["friendlyId"] in owner_portfolio_ids
    assert owner_project["friendlyId"] not in owner_portfolio_ids
    assert other_project["friendlyId"] not in owner_portfolio_ids
    assert other_project["friendlyId"] not in owner_ids
    assert owner_project["friendlyId"] in owner_default_panel_ids
    assert other_project["friendlyId"] not in owner_default_panel_ids
    assert other_project["friendlyId"] in other_ids
    assert owner_project["friendlyId"] not in other_ids
    assert {owner_project["friendlyId"], other_project["friendlyId"]}.issubset(admin_ids)


def test_project_drafts_save_upload_submit_and_link_documents() -> None:
    headers = auth_headers()
    unique_prefix = f"draft-{uuid.uuid4().hex[:10]}"
    payload = project_payload(unique_prefix, tags=five_tag_payload(unique_prefix))

    create_response = client.post(
        "/api/v1/project-drafts",
        json={"current_step": "qtags", "payload": payload},
        headers=headers,
    )

    assert create_response.status_code == 201
    draft = create_response.json()["draft"]
    assert draft["status"] == "DRAFT"
    assert draft["currentStep"] == "qtags"
    assert draft["payload"]["name"] == payload["name"]
    assert draft["submittedProjectId"] is None
    draft_id = draft["id"]

    updated_payload = {**payload, "description": "Rascunho atualizado antes do envio final."}
    update_response = client.patch(
        f"/api/v1/project-drafts/{draft_id}",
        json={"current_step": "documents", "payload": updated_payload},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["draft"]["currentStep"] == "documents"
    assert update_response.json()["draft"]["payload"]["description"] == "Rascunho atualizado antes do envio final."

    list_response = client.get("/api/v1/project-drafts", headers=headers)
    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed["success"] is True
    assert any(item["id"] == draft_id for item in listed["drafts"])

    legal_pdf = b"%PDF-1.4\nrascunho documento legal " + uuid.uuid4().hex.encode()
    inventory_pdf = b"%PDF-1.4\nrascunho inventario florestal " + uuid.uuid4().hex.encode()
    legal_upload = client.post(
        f"/api/v1/project-drafts/{draft_id}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", legal_pdf, "application/pdf")},
        headers=headers,
    )
    inventory_upload = client.post(
        f"/api/v1/project-drafts/{draft_id}/documents",
        data={"document_type": "FOREST_INVENTORY"},
        files={"file": ("inventario.pdf", inventory_pdf, "application/pdf")},
        headers=headers,
    )

    assert legal_upload.status_code == 201
    assert inventory_upload.status_code == 201
    assert legal_upload.json()["storage_bucket"] == "projects"
    assert inventory_upload.json()["storage_bucket"] == "projects"
    assert legal_upload.json()["storage_object_path"].startswith(f"projects/drafts/{draft_id}/documents/legal_ownership/")
    assert inventory_upload.json()["storage_object_path"].startswith(f"projects/drafts/{draft_id}/documents/forest_inventory/")
    assert legal_upload.json()["storage_path"].startswith("supabase://projects/")
    assert inventory_upload.json()["storage_path"].startswith("supabase://projects/")

    get_response = client.get(f"/api/v1/project-drafts/{draft_id}", headers=headers)
    assert get_response.status_code == 200
    assert len(get_response.json()["draft"]["documents"]) == 2

    submit_response = client.post(f"/api/v1/project-drafts/{draft_id}/submit", headers=headers)

    assert submit_response.status_code == 200
    submitted = submit_response.json()
    assert submitted["draft"]["status"] == "SUBMITTED"
    assert submitted["draft"]["submittedProjectId"]
    project = submitted["project"]
    assert project["friendlyId"].startswith("PRC-")
    assert project["name"] == payload["name"]
    assert [item["code"] for item in project["timeline"]][:2] == ["CREATED", "QTAGS_RECORDED"]

    async def persisted_draft_and_documents() -> tuple[ProjectDraft | None, list[ProjectDraftDocument]]:
        async with get_sessionmaker()() as session:
            persisted_draft = (
                await session.execute(select(ProjectDraft).where(ProjectDraft.id == uuid.UUID(draft_id)))
            ).scalar_one_or_none()
            draft_documents = list(
                (
                    await session.execute(
                        select(ProjectDraftDocument).where(ProjectDraftDocument.draft_id == uuid.UUID(draft_id))
                    )
                )
                .scalars()
                .all()
            )
            return persisted_draft, draft_documents

    async def persisted_project_documents() -> list[Document]:
        async with get_sessionmaker()() as session:
            return list(
                (
                    await session.execute(
                        select(Document).where(
                            Document.project_id.in_(select(Project.id).where(Project.friendly_id == project["friendlyId"]))
                        )
                    )
                )
                .scalars()
                .all()
            )

    persisted_draft, draft_documents = asyncio.run(persisted_draft_and_documents())
    assert persisted_draft is not None
    assert persisted_draft.status == "SUBMITTED"
    assert persisted_draft.draft_kind == "CREATE"
    assert persisted_draft.submitted_project_id is not None
    assert len(draft_documents) == 2
    assert {document.storage_bucket for document in draft_documents} == {"projects"}

    project_documents = asyncio.run(persisted_project_documents())
    assert len(project_documents) == 2
    legal_ownership_doc = next(d for d in project_documents if d.document_type == "LEGAL_OWNERSHIP")
    forest_inventory_doc = next(d for d in project_documents if d.document_type == "FOREST_INVENTORY")
    assert legal_ownership_doc.storage_object_path.startswith(f"projects/{project['friendlyId']}/documents/legal_ownership/")
    assert forest_inventory_doc.storage_object_path.startswith(f"projects/{project['friendlyId']}/documents/forest_inventory/")

    dossier_response = client.get(f"/api/v1/projects/{project['friendlyId']}/public-dossier")
    assert dossier_response.status_code == 200
    dossier_documents = dossier_response.json()["documents"]
    # Dossiê público minimizado (CERT-05/D-20/D-22): documentos internos como
    # LEGAL_OWNERSHIP/FOREST_INVENTORY não são expostos publicamente; a vinculação
    # real (path/hash exatos) já foi verificada acima direto no banco.
    assert not ({"LEGAL_OWNERSHIP", "FOREST_INVENTORY"} & {item["type"] for item in dossier_documents})
    for item in dossier_documents:
        assert "storageBucket" not in item
        assert "storageObjectPath" not in item
        assert "metadata" not in item


def test_project_draft_document_upload_is_idempotent_for_same_draft_file() -> None:
    headers = auth_headers()
    unique_prefix = f"draft-repeat-{uuid.uuid4().hex[:10]}"
    payload = project_payload(unique_prefix, tags=five_tag_payload(unique_prefix))
    create_response = client.post(
        "/api/v1/project-drafts",
        json={"current_step": "documents", "payload": payload},
        headers=headers,
    )
    assert create_response.status_code == 201
    draft_id = create_response.json()["draft"]["id"]
    pdf_content = b"%PDF-1.4\nrascunho documento repetido " + uuid.uuid4().hex.encode()

    first_upload = client.post(
        f"/api/v1/project-drafts/{draft_id}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )
    second_upload = client.post(
        f"/api/v1/project-drafts/{draft_id}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )

    assert first_upload.status_code == 201
    assert second_upload.status_code == 201
    first = first_upload.json()
    second = second_upload.json()
    assert second["id"] == first["id"]
    assert second["sha256"] == first["sha256"]
    assert second["storage_path"] == first["storage_path"]

    get_response = client.get(f"/api/v1/project-drafts/{draft_id}", headers=headers)
    assert get_response.status_code == 200
    assert len(get_response.json()["draft"]["documents"]) == 1


def test_project_draft_document_upload_allows_same_file_in_different_drafts() -> None:
    headers = auth_headers()
    pdf_content = b"%PDF-1.4\nshared draft document evidence " + uuid.uuid4().hex.encode()
    draft_ids: list[str] = []

    for index in range(2):
        unique_prefix = f"draft-shared-{index}-{uuid.uuid4().hex[:10]}"
        payload = project_payload(unique_prefix, tags=five_tag_payload(unique_prefix))
        create_response = client.post(
            "/api/v1/project-drafts",
            json={"current_step": "documents", "payload": payload},
            headers=headers,
        )
        assert create_response.status_code == 201
        draft_ids.append(create_response.json()["draft"]["id"])

    first_upload = client.post(
        f"/api/v1/project-drafts/{draft_ids[0]}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )
    second_upload = client.post(
        f"/api/v1/project-drafts/{draft_ids[1]}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("registro.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )

    assert first_upload.status_code == 201
    assert second_upload.status_code == 201
    first = first_upload.json()
    second = second_upload.json()
    assert second["id"] != first["id"]
    assert second["sha256"] == first["sha256"]
    assert second["storage_path"] != first["storage_path"]
    assert second["storage_object_path"].startswith(f"projects/drafts/{draft_ids[1]}/documents/legal_ownership/")


def test_project_draft_document_upload_allows_same_file_for_different_document_types_and_submit() -> None:
    headers = auth_headers()
    unique_prefix = f"draft-shared-types-{uuid.uuid4().hex[:10]}"
    payload = project_payload(unique_prefix, tags=five_tag_payload(unique_prefix))
    create_response = client.post(
        "/api/v1/project-drafts",
        json={"current_step": "review", "payload": payload},
        headers=headers,
    )
    assert create_response.status_code == 201
    draft_id = create_response.json()["draft"]["id"]
    pdf_content = b"%PDF-1.4\nshared document used for legal and inventory " + uuid.uuid4().hex.encode()

    legal_upload = client.post(
        f"/api/v1/project-drafts/{draft_id}/documents",
        data={"document_type": "LEGAL_OWNERSHIP"},
        files={"file": ("dossie.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )
    inventory_upload = client.post(
        f"/api/v1/project-drafts/{draft_id}/documents",
        data={"document_type": "FOREST_INVENTORY"},
        files={"file": ("dossie.pdf", pdf_content, "application/pdf")},
        headers=headers,
    )

    assert legal_upload.status_code == 201
    assert inventory_upload.status_code == 201
    legal = legal_upload.json()
    inventory = inventory_upload.json()
    assert inventory["id"] != legal["id"]
    assert inventory["sha256"] == legal["sha256"]
    assert inventory["document_type"] == "FOREST_INVENTORY"
    assert inventory["storage_object_path"].startswith(f"projects/drafts/{draft_id}/documents/forest_inventory/")

    get_response = client.get(f"/api/v1/project-drafts/{draft_id}", headers=headers)
    assert get_response.status_code == 200
    draft_documents = get_response.json()["draft"]["documents"]
    assert {item["documentType"] for item in draft_documents} == {"LEGAL_OWNERSHIP", "FOREST_INVENTORY"}

    submit_response = client.post(f"/api/v1/project-drafts/{draft_id}/submit", headers=headers)
    assert submit_response.status_code == 200, submit_response.text
    project = submit_response.json()["project"]

    async def persisted_project_document_types() -> list[str]:
        async with get_sessionmaker()() as session:
            return list(
                (
                    await session.execute(
                        select(Document.document_type).where(
                            Document.project_id.in_(select(Project.id).where(Project.friendly_id == project["friendlyId"])),
                            Document.sha256_hash == legal["sha256"],
                        )
                    )
                )
                .scalars()
                .all()
            )

    assert sorted(asyncio.run(persisted_project_document_types())) == ["FOREST_INVENTORY", "LEGAL_OWNERSHIP"]


def test_project_edit_draft_submits_into_existing_project_without_creating_new_record() -> None:
    headers = auth_headers()
    project = create_project_for_workflow()
    edit_prefix = f"edit-draft-{uuid.uuid4().hex[:10]}"
    edit_payload = project_payload(edit_prefix, tags=five_tag_payload(edit_prefix))
    edit_payload["name"] = "Projeto editado por rascunho"

    draft_response = client.post(
        "/api/v1/project-drafts",
        json={
            "draft_kind": "EDIT",
            "target_project_id": project["friendlyId"],
            "current_step": "review",
            "payload": edit_payload,
        },
        headers=headers,
    )
    assert draft_response.status_code == 201
    draft = draft_response.json()["draft"]
    assert draft["draftKind"] == "EDIT"
    assert draft["targetProjectId"] == project["friendlyId"]

    submit_response = client.post(f"/api/v1/project-drafts/{draft['id']}/submit", headers=headers)
    assert submit_response.status_code == 200
    submitted = submit_response.json()
    assert submitted["draft"]["status"] == "SUBMITTED"
    assert submitted["project"]["friendlyId"] == project["friendlyId"]
    assert submitted["project"]["name"] == "Projeto editado por rascunho"


def test_project_draft_submit_revalidates_required_documents_and_geofence() -> None:
    headers = auth_headers()
    prefix = f"draft-invalid-{uuid.uuid4().hex[:10]}"

    missing_docs_response = client.post(
        "/api/v1/project-drafts",
        json={"current_step": "review", "payload": project_payload(prefix, tags=tag_payload(prefix))},
        headers=headers,
    )
    assert missing_docs_response.status_code == 201
    missing_docs_submit = client.post(
        f"/api/v1/project-drafts/{missing_docs_response.json()['draft']['id']}/submit",
        headers=headers,
    )
    assert missing_docs_submit.status_code == 400
    assert "documento legal" in missing_docs_submit.json()["detail"]
    assert "inventário florestal" in missing_docs_submit.json()["detail"]

    colinear_prefix = f"{prefix}-line"
    colinear_create = client.post(
        "/api/v1/project-drafts",
        json={"current_step": "review", "payload": project_payload(colinear_prefix, tags=colinear_tag_payload(colinear_prefix))},
        headers=headers,
    )
    assert colinear_create.status_code == 201
    draft_id = colinear_create.json()["draft"]["id"]

    for document_type, filename, content in [
        ("LEGAL_OWNERSHIP", "registro.pdf", b"%PDF-1.4\nregistro " + uuid.uuid4().hex.encode()),
        ("FOREST_INVENTORY", "inventario.pdf", b"%PDF-1.4\ninventario " + uuid.uuid4().hex.encode()),
    ]:
        upload_response = client.post(
            f"/api/v1/project-drafts/{draft_id}/documents",
            data={"document_type": document_type},
            files={"file": (filename, content, "application/pdf")},
            headers=headers,
        )
        assert upload_response.status_code == 201

    colinear_submit = client.post(f"/api/v1/project-drafts/{draft_id}/submit", headers=headers)
    assert colinear_submit.status_code == 400
    assert "área válida" in colinear_submit.json()["detail"]
