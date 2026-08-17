from __future__ import annotations

import json
import uuid

from fastapi.testclient import TestClient

from backend_app.main import app

client = TestClient(app)

PDF_BYTES = b"%PDF-1.4\n" + b"\x00" * 64
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
MP4_BYTES = b"\x00\x00\x00\x18ftypisom" + b"\x00" * 64
FAKE_PNG_BYTES = b"%PDF-1.4\n" + b"\x00" * 64  # extensao .png, conteudo PDF

PRODUCER = ("produtor@sinarca.com.br", "produtor")
COMPANY = ("empresa@sinarca.com.br", "empresa")
AUDITOR = ("auditor@sinarca.com.br", "auditor")
ADMIN = ("admin@sinarca.com.br", "admin")

# PRC-2026-011 e o projeto seed de fila de auditoria (status AWAITING_AUDIT,
# auditor_organization_id = org de auditor@sinarca.com.br). Projetos criados
# via API sempre recebem o auditor_organization_id alfabeticamente primeiro
# (_get_first_organization_by_role), que nao tem perfil de login -- por isso
# o caminho feliz do papel "auditor" (nao-admin) precisa deste projeto seed;
# ADMIN contorna o guard org-scoped e serve para os demais casos.
AUDITOR_ASSIGNED_PROJECT = "PRC-2026-011"


def auth_headers(email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
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
        "name": f"Projeto Auditoria Campo {prefix}",
        "description": "Projeto criado pelo contrato de testes de auditoria de campo.",
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


def create_project(prefix: str | None = None) -> dict[str, object]:
    unique_prefix = prefix or f"audit-evidence-{uuid.uuid4().hex[:10]}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    return response.json()["project"]


def upload_evidence(
    friendly_id: str,
    *,
    filename: str,
    content: bytes,
    content_type: str,
    headers: dict[str, str],
):
    return client.post(
        f"/api/v1/audit/{friendly_id}/evidence",
        files={"file": (filename, content, content_type)},
        headers=headers,
    )


# ---------------------------------------------------------------------------
# Task 1: POST /audit/{project_id}/evidence
# ---------------------------------------------------------------------------


def test_upload_png_evidence_creates_real_document() -> None:
    response = upload_evidence(
        AUDITOR_ASSIGNED_PROJECT,
        filename="campo.png",
        content=PNG_BYTES,
        content_type="image/png",
        headers=auth_headers(*AUDITOR),
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["document_type"] == "AUDIT_EVIDENCE"
    assert len(payload["sha256"]) == 64
    assert payload["storage_path"].startswith("supabase://projects/")
    uuid.UUID(payload["id"])


def test_duplicate_upload_returns_same_document() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    headers = auth_headers(*ADMIN)

    first = upload_evidence(friendly_id, filename="a.png", content=PNG_BYTES, content_type="image/png", headers=headers)
    second = upload_evidence(friendly_id, filename="b.png", content=PNG_BYTES, content_type="image/png", headers=headers)

    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["sha256"] == second.json()["sha256"]


def test_accepted_upload_creates_visible_evidence() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    headers = auth_headers(*ADMIN)

    upload_response = upload_evidence(friendly_id, filename="laudo.pdf", content=PDF_BYTES, content_type="application/pdf", headers=headers)
    assert upload_response.status_code == 201, upload_response.text

    evidence_response = client.get(f"/api/v1/projects/{friendly_id}/evidence", headers=headers)
    assert evidence_response.status_code == 200, evidence_response.text
    evidence_items = evidence_response.json()["evidence"]
    assert any(item.get("documentId") == upload_response.json()["id"] for item in evidence_items)


def test_upload_disallowed_extension_returns_415() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = upload_evidence(
        friendly_id,
        filename="malicioso.exe",
        content=b"MZ\x90\x00",
        content_type="application/octet-stream",
        headers=auth_headers(*ADMIN),
    )
    assert response.status_code == 415


def test_upload_wrong_magic_bytes_returns_400() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = upload_evidence(
        friendly_id,
        filename="fake.png",
        content=FAKE_PNG_BYTES,
        content_type="image/png",
        headers=auth_headers(*ADMIN),
    )
    assert response.status_code == 400


def test_upload_valid_mp4_returns_video_mime() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = upload_evidence(
        friendly_id,
        filename="campo.mp4",
        content=MP4_BYTES,
        content_type="video/mp4",
        headers=auth_headers(*ADMIN),
    )
    assert response.status_code == 201, response.text
    assert response.json()["mime_type"] == "video/mp4"


def test_upload_above_limit_returns_413() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    oversized = PNG_BYTES + b"\x00" * (50 * 1024 * 1024)
    response = upload_evidence(
        friendly_id,
        filename="grande.png",
        content=oversized,
        content_type="image/png",
        headers=auth_headers(*ADMIN),
    )
    assert response.status_code == 413


def test_upload_requires_auditor_or_admin_role() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = upload_evidence(
        friendly_id,
        filename="campo.png",
        content=PNG_BYTES,
        content_type="image/png",
        headers=auth_headers(*COMPANY),
    )
    assert response.status_code == 403


def test_upload_requires_authentication() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = upload_evidence(friendly_id, filename="campo.png", content=PNG_BYTES, content_type="image/png", headers={})
    assert response.status_code == 401


def test_upload_rejects_auditor_from_different_organization() -> None:
    # Projeto novo recebe o auditor_organization_id alfabeticamente primeiro
    # (EcoVerify Global), que NAO e a organizacao de auditor@sinarca.com.br
    # (Vinícius Monteiro) -- guard org-scoped deve rejeitar.
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = upload_evidence(
        friendly_id,
        filename="campo.png",
        content=PNG_BYTES,
        content_type="image/png",
        headers=auth_headers(*AUDITOR),
    )
    assert response.status_code == 403


def test_audit_evidence_response_never_contains_local_scheme() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = upload_evidence(
        friendly_id,
        filename="campo.png",
        content=PNG_BYTES,
        content_type="image/png",
        headers=auth_headers(*ADMIN),
    )
    assert response.status_code == 201, response.text
    body = json.dumps(response.json())
    assert "local://" not in body
    assert "mock://" not in body
