from __future__ import annotations

import json
import uuid

from fastapi.testclient import TestClient

from backend_app.main import app

client = TestClient(app)

PDF_BYTES = b"%PDF-1.4\n" + b"\x00" * 64
PRODUCER = ("produtor@sinarca.com.br", "produtor")
ADMIN = ("admin@sinarca.com.br", "admin")


def test_health_uses_backend_app_runtime() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "sinarca-api",
        "version": "0.3.0-backend-app",
    }


def test_login_invalid_credentials() -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@sinarca.com.br",
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciais inválidas"


def test_register_login_and_auth_me_are_persistent() -> None:
    email = f"api.integration.{uuid.uuid4().hex[:8]}@sinarca.com.br"
    password = "senha-super-secreta"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Integração Persistente",
            "email": email,
            "document": "123.456.789-33",
            "password": password,
            "role": "company",
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password, "role": "company"},
    )
    token = login_response.json()["access_token"]
    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert register_response.status_code == 201
    assert login_response.status_code == 200
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email


def test_project_and_marketplace_data_come_from_api_database_contract() -> None:
    project_response = client.get("/api/v1/projects/PRC-2024-002")
    marketplace_response = client.get("/api/v1/marketplace")

    assert project_response.status_code == 200
    assert project_response.json()["project"]["friendlyId"] == "PRC-2024-002"
    assert marketplace_response.status_code == 200
    assert any(item["friendlyId"] == "PRC-2024-002" for item in marketplace_response.json()["credits"])


# ---------------------------------------------------------------------------
# Phase 05 / D-05: dossie publico minimiza a auditoria de campo
# ---------------------------------------------------------------------------


def _auth_headers(email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _tag_payload(prefix: str) -> list[dict[str, object]]:
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


def _create_project_for_dossier(prefix: str) -> dict[str, object]:
    payload = {
        "name": f"Projeto Dossie Auditoria {prefix}",
        "description": "Projeto criado para testar minimizacao do dossie publico.",
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
        "tags": _tag_payload(prefix),
    }
    response = client.post("/api/v1/projects", json=payload, headers=_auth_headers(*PRODUCER))
    assert response.status_code == 201, response.text
    return response.json()["project"]


def _run_audit_flow(friendly_id: str, *, report_text: str) -> None:
    admin_headers = _auth_headers(*ADMIN)
    upload_response = client.post(
        f"/api/v1/audit/{friendly_id}/evidence",
        files={"file": ("laudo.pdf", PDF_BYTES, "application/pdf")},
        headers=admin_headers,
    )
    assert upload_response.status_code == 201, upload_response.text
    document_id = upload_response.json()["id"]

    verify_response = client.patch(
        f"/api/v1/audit/verify/{friendly_id}",
        json={
            "status": "APPROVED",
            "laudo_texto": report_text,
            "latitude": -10.70,
            "longitude": -48.41,
            "evidencias_url": [document_id],
            "assinatura_digital": "assinatura-falsa-do-cliente",
        },
        headers=admin_headers,
    )
    assert verify_response.status_code == 200, verify_response.text


def test_public_dossier_audit_block_is_minimized() -> None:
    project = _create_project_for_dossier(f"dossier-{uuid.uuid4().hex[:10]}")
    friendly_id = str(project["friendlyId"])
    sentinel = "NOTA-INTERNA-CONFIDENCIAL-XYZ"
    _run_audit_flow(friendly_id, report_text=f"Laudo de campo com observacoes internas. {sentinel}")

    dossier_response = client.get(f"/api/v1/projects/{friendly_id}/public-dossier")
    assert dossier_response.status_code == 200, dossier_response.text
    dossier = dossier_response.json()

    audits = dossier["audits"]
    assert len(audits) >= 1
    audit_block = audits[0]
    assert audit_block["conclusion"] == "Auditoria de campo aprovada"
    assert audit_block["evidenceCount"] == 1
    assert audit_block["signatureKind"] == "STUB_SHA256"
    assert "reportText" not in audit_block
    assert "latitude" not in audit_block
    assert "longitude" not in audit_block
    assert "evidenceUrls" not in audit_block

    dossier_json = json.dumps(dossier)
    assert sentinel not in dossier_json
    assert "supabase://" not in json.dumps(audits)
    assert not any(
        isinstance(value, str) and len(value) == 64 and all(c in "0123456789abcdef" for c in value)
        for value in audit_block.values()
    )


def test_public_dossier_audit_signature_is_never_complete() -> None:
    project = _create_project_for_dossier(f"dossier-sig-{uuid.uuid4().hex[:10]}")
    friendly_id = str(project["friendlyId"])
    _run_audit_flow(friendly_id, report_text="Laudo padrao para checagem de assinatura.")

    dossier_response = client.get(f"/api/v1/projects/{friendly_id}/public-dossier")
    assert dossier_response.status_code == 200, dossier_response.text
    audits = dossier_response.json()["audits"]

    assert len(audits[0]["signaturePreview"]) <= 13
    assert "64 hex" not in json.dumps(audits)
    assert not any(
        isinstance(value, str) and len(value) == 64 and all(c in "0123456789abcdef" for c in value)
        for value in audits[0].values()
    )
