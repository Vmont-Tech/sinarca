from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend_app.main import app
from backend_app.modules.audit.signature import compute_audit_signature

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


# ---------------------------------------------------------------------------
# Task 2: compute_audit_signature (pure) + PATCH /audit/verify/{project_id}
# ---------------------------------------------------------------------------


def test_signature_stub_deterministic() -> None:
    signed_at = datetime(2026, 8, 16, 12, 0, 0, tzinfo=timezone.utc)

    def _sig(auditor_id="aud-1", project_id="proj-1", report_text="laudo", ts=signed_at, evidence_ids=("b", "a")):
        return compute_audit_signature(
            auditor_id=auditor_id, project_id=project_id, report_text=report_text, signed_at=ts, evidence_ids=list(evidence_ids)
        )

    first = _sig()
    second = _sig()
    assert first == second
    assert len(first) == 64
    assert all(char in "0123456789abcdef" for char in first)

    # ordem invertida da lista de evidence_ids nao altera o hash
    reordered = _sig(evidence_ids=("a", "b"))
    assert first == reordered

    # mudar qualquer um dos 5 componentes muda o hash
    assert first != _sig(auditor_id="aud-2")
    assert first != _sig(project_id="proj-2")
    assert first != _sig(report_text="outro laudo")
    assert first != _sig(ts=datetime(2026, 8, 17, 12, 0, 0, tzinfo=timezone.utc))
    assert first != _sig(evidence_ids=("a", "b", "c"))


def _verify(friendly_id: str, headers: dict[str, str], **overrides: object) -> object:
    payload: dict[str, object] = {
        "status": "APPROVED",
        "laudo_texto": "Auditoria de campo realizada sem pendências.",
        "evidencias_url": [],
        "assinatura_digital": "assinatura-digital-pendente",
    }
    payload.update(overrides)
    return client.patch(f"/api/v1/audit/verify/{friendly_id}", json=payload, headers=headers)


def test_verify_rejects_local_scheme_evidence() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = _verify(friendly_id, auth_headers(*ADMIN), evidencias_url=["local://auditoria/foto.png"])
    assert response.status_code == 400


def test_verify_rejects_unknown_document_id() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = _verify(friendly_id, auth_headers(*ADMIN), evidencias_url=[str(uuid.uuid4())])
    assert response.status_code == 400


def test_verify_rejects_document_from_other_project() -> None:
    admin_headers = auth_headers(*ADMIN)

    other_project = create_project()
    other_friendly_id = str(other_project["friendlyId"])
    other_upload = upload_evidence(
        other_friendly_id, filename="outro.png", content=PNG_BYTES, content_type="image/png", headers=admin_headers
    )
    assert other_upload.status_code == 201, other_upload.text
    foreign_document_id = other_upload.json()["id"]

    project = create_project()
    friendly_id = str(project["friendlyId"])
    response = _verify(friendly_id, admin_headers, evidencias_url=[foreign_document_id])
    assert response.status_code == 400


def test_verify_persists_document_ids_and_server_signature() -> None:
    admin_headers = auth_headers(*ADMIN)
    project = create_project()
    friendly_id = str(project["friendlyId"])

    upload_response = upload_evidence(
        friendly_id, filename="evidencia.pdf", content=PDF_BYTES, content_type="application/pdf", headers=admin_headers
    )
    assert upload_response.status_code == 201, upload_response.text
    document_id = upload_response.json()["id"]

    response = _verify(
        friendly_id,
        admin_headers,
        evidencias_url=[document_id],
        assinatura_digital="assinatura-falsa-do-cliente",
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["evidencias_url"] == [document_id]
    assert body["assinatura_tipo"] == "STUB_SHA256"
    assert len(body["assinatura_digital"]) == 64
    assert body["assinatura_digital"] != "assinatura-falsa-do-cliente"


def test_verify_signature_is_reproducible_from_response() -> None:
    admin_headers = auth_headers(*ADMIN)
    project = create_project()
    friendly_id = str(project["friendlyId"])

    upload_response = upload_evidence(
        friendly_id, filename="evidencia.pdf", content=PDF_BYTES, content_type="application/pdf", headers=admin_headers
    )
    document_id = upload_response.json()["id"]

    response = _verify(
        friendly_id,
        admin_headers,
        evidencias_url=[document_id],
        laudo_texto="Laudo reproduzivel de teste.",
    )
    assert response.status_code == 200, response.text
    body = response.json()

    recomputed = compute_audit_signature(
        auditor_id=_admin_actor_id(),
        project_id=friendly_id,
        report_text="Laudo reproduzivel de teste.",
        signed_at=datetime.fromisoformat(body["assinatura_verificavel_em"]),
        evidence_ids=[document_id],
    )
    assert recomputed == body["assinatura_digital"]


def _admin_actor_id() -> str:
    response = client.get("/api/v1/auth/me", headers=auth_headers(*ADMIN))
    assert response.status_code == 200, response.text
    return str(response.json()["id"])
