from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from backend_app.main import app

client = TestClient(app)

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n"
NOT_A_PDF_BYTES = b"MZ\x90\x00 este arquivo nao e um PDF"

CERTIFIER = ("certificadora@sinarca.com.br", "certificadora")
PRODUCER = ("produtor@sinarca.com.br", "produtor")
COMPANY = ("empresa@sinarca.com.br", "empresa")


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
        "name": f"Projeto Bancada Certificadora {prefix}",
        "description": "Projeto criado pelo contrato de testes da bancada de certificacao.",
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
    unique_prefix = prefix or f"workbench-{uuid.uuid4().hex[:10]}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    return response.json()["project"]


def upload_minimum_documents(friendly_id: str) -> None:
    """Sobe LEGAL_OWNERSHIP e FOREST_INVENTORY para satisfazer o dossie minimo (D-03)."""
    for document_type, filename in (("LEGAL_OWNERSHIP", "matricula.pdf"), ("FOREST_INVENTORY", "inventario.pdf")):
        response = client.post(
            f"/api/v1/projects/{friendly_id}/documents",
            data={"document_type": document_type},
            files={"file": (filename, PDF_BYTES, "application/pdf")},
            headers=auth_headers(*PRODUCER),
        )
        assert response.status_code == 201, response.text


def create_certifiable_project(prefix: str | None = None) -> dict[str, object]:
    project = create_project(prefix)
    upload_minimum_documents(str(project["friendlyId"]))
    return project


def approve_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "decision": "APPROVE",
        "methodology": "AR-ACM0003",
        "credit_potential": "1200.0",
        "credit_potential_adjustment_reason": "Ajuste conservador sobre o potencial sugerido.",
        "notes": "Certificacao aprovada no teste de integracao.",
    }
    payload.update(overrides)
    return payload


def test_review_dossier_endpoint() -> None:
    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])

    response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/review",
        headers=auth_headers(*CERTIFIER),
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    for key in ("project", "baseline", "tags", "documents", "dossier", "calculation", "certifications", "pendencies"):
        assert key in payload, f"chave ausente: {key}"

    assert payload["dossier"]["complete"] is True
    assert len(payload["tags"]) == 4
    assert payload["calculation"]["suggestedCreditPotential"] > 0

    forbidden_response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/review",
        headers=auth_headers(*COMPANY),
    )
    assert forbidden_response.status_code == 403


def test_decision_requires_structured_fields() -> None:
    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])
    decision_url = f"/api/v1/certifier/projects/{friendly_id}/decision"

    missing_category_response = client.patch(
        decision_url,
        data={"decision": "REJECT"},
        headers=auth_headers(*CERTIFIER),
    )
    assert missing_category_response.status_code == 400

    missing_notes_response = client.patch(
        decision_url,
        data={"decision": "REJECT", "rejection_category": "DOCUMENTACAO_INCOMPLETA"},
        headers=auth_headers(*CERTIFIER),
    )
    assert missing_notes_response.status_code == 400

    valid_reject_response = client.patch(
        decision_url,
        data={
            "decision": "REJECT",
            "rejection_category": "DOCUMENTACAO_INCOMPLETA",
            "description": "Documentacao incompleta identificada na revisao.",
            "notes": "Faltam documentos obrigatorios do dossie.",
        },
        headers=auth_headers(*CERTIFIER),
    )
    assert valid_reject_response.status_code == 200, valid_reject_response.text
    assert valid_reject_response.json()["new_status"] == "SUSPENDED"

    project_two = create_certifiable_project()
    friendly_id_two = str(project_two["friendlyId"])
    unadjusted_approve_response = client.patch(
        f"/api/v1/certifier/projects/{friendly_id_two}/decision",
        data={
            "decision": "APPROVE",
            "methodology": "AR-ACM0003",
            "credit_potential": "999999.0",
            "notes": "Aprovacao sem justificativa de ajuste.",
        },
        headers=auth_headers(*CERTIFIER),
    )
    assert unadjusted_approve_response.status_code == 400


def test_approve_requires_real_pdf() -> None:
    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])
    decision_url = f"/api/v1/certifier/projects/{friendly_id}/decision"

    no_certificate_response = client.patch(
        decision_url,
        data=approve_payload(),
        headers=auth_headers(*CERTIFIER),
    )
    assert no_certificate_response.status_code == 400

    review_after_no_certificate = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/review",
        headers=auth_headers(*CERTIFIER),
    )
    assert review_after_no_certificate.json()["certifications"] == []

    wrong_mime_response = client.patch(
        decision_url,
        data=approve_payload(),
        files={"certificate": ("cert.txt", PDF_BYTES, "text/plain")},
        headers=auth_headers(*CERTIFIER),
    )
    assert wrong_mime_response.status_code == 415

    fake_pdf_response = client.patch(
        decision_url,
        data=approve_payload(),
        files={"certificate": ("cert.pdf", NOT_A_PDF_BYTES, "application/pdf")},
        headers=auth_headers(*CERTIFIER),
    )
    assert fake_pdf_response.status_code == 400

    real_pdf_response = client.patch(
        decision_url,
        data=approve_payload(),
        files={"certificate": ("cert.pdf", PDF_BYTES, "application/pdf")},
        headers=auth_headers(*CERTIFIER),
    )
    assert real_pdf_response.status_code == 200, real_pdf_response.text
    real_payload = real_pdf_response.json()
    assert real_payload["certificate"]["sha256"]
    assert real_payload["certificate"]["documentType"] == "CERTIFICATION_CERTIFICATE"


def test_approve_creates_treasury_authorization() -> None:
    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])

    approve_response = client.patch(
        f"/api/v1/certifier/projects/{friendly_id}/decision",
        data=approve_payload(),
        files={"certificate": ("cert.pdf", PDF_BYTES, "application/pdf")},
        headers=auth_headers(*CERTIFIER),
    )
    assert approve_response.status_code == 200, approve_response.text
    approve_payload_response = approve_response.json()
    assert approve_payload_response["new_status"] == "CERTIFIED_AWAITING_TREASURY"
    assert approve_payload_response["statusLabels"] == [
        "Certificação aprovada",
        "Mint autorizado",
        "Aguardando tesouraria",
    ]

    treasury_response = client.get(
        "/api/v1/treasury/authorizations",
        headers=auth_headers(*CERTIFIER),
    )
    assert treasury_response.status_code == 200, treasury_response.text
    treasury_items = treasury_response.json()
    matching = [item for item in treasury_items if item["projectId"] == friendly_id]
    assert len(matching) == 1
    matched = matching[0]
    assert matched["approvedCreditPotential"] == float(approve_payload()["credit_potential"])
    assert matched["methodology"]
    assert matched["certificate"]["sha256"]

    history_response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/history",
        headers=auth_headers(*CERTIFIER),
    )
    assert history_response.status_code == 200, history_response.text
    actions = {item["action"] for item in history_response.json()}
    assert {"CERTIFICATION_APPROVED", "MINT_AUTHORIZED", "TREASURY_QUEUE_CREATED"} <= actions


def test_public_dossier_hides_internal_notes() -> None:
    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])

    approve_response = client.patch(
        f"/api/v1/certifier/projects/{friendly_id}/decision",
        data=approve_payload(notes="NOTA INTERNA CONFIDENCIAL"),
        files={"certificate": ("cert.pdf", PDF_BYTES, "application/pdf")},
        headers=auth_headers(*CERTIFIER),
    )
    assert approve_response.status_code == 200, approve_response.text

    public_response = client.get(f"/api/v1/projects/{friendly_id}/public-dossier")
    assert public_response.status_code == 200, public_response.text
    assert "NOTA INTERNA CONFIDENCIAL" not in public_response.text

    payload = public_response.json()
    for certification in payload["certifications"]:
        assert "notes" not in certification

    document_types = {doc["type"] for doc in payload["documents"]}
    assert document_types <= {"CERTIFICATION_CERTIFICATE"}

    assert payload["certificate"]["sha256"]

    allowed_actions = {
        "CERTIFICATION_APPROVED",
        "CERTIFICATION_REJECTED",
        "CERTIFICATION_CERTIFICATE_ATTACHED",
        "MINT_AUTHORIZED",
        "TREASURY_QUEUE_CREATED",
    }
    for item in payload["certificationHistory"]:
        assert item["action"] in allowed_actions
        assert "metadata" not in item


def test_decisions_are_append_only() -> None:
    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])
    decision_url = f"/api/v1/certifier/projects/{friendly_id}/decision"

    first_response = client.patch(
        decision_url,
        data={
            "decision": "REQUEST_CHANGES",
            "rejection_category": "DOCUMENTACAO_INCOMPLETA",
            "description": "Falta matricula atualizada.",
            "notes": "Primeira solicitacao de ajuste.",
        },
        headers=auth_headers(*CERTIFIER),
    )
    assert first_response.status_code == 200, first_response.text

    second_response = client.patch(
        decision_url,
        data={
            "decision": "REQUEST_CHANGES",
            "rejection_category": "DOCUMENTACAO_INCOMPLETA",
            "description": "Inventario florestal precisa de revisao.",
            "notes": "Segunda solicitacao de ajuste, apos resposta do produtor.",
        },
        headers=auth_headers(*CERTIFIER),
    )
    assert second_response.status_code == 200, second_response.text

    history_response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/history",
        headers=auth_headers(*CERTIFIER),
    )
    assert history_response.status_code == 200, history_response.text
    actions = [item["action"] for item in history_response.json()]
    assert actions.count("CERTIFICATION_CHANGES_REQUESTED") == 2

    review_response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/review",
        headers=auth_headers(*CERTIFIER),
    )
    assert review_response.status_code == 200, review_response.text
    certifications = review_response.json()["certifications"]
    assert len(certifications) == 2
    assert certifications[0]["notes"] != certifications[1]["notes"]


def test_incomplete_dossier_blocks_decision_and_creates_pendency() -> None:
    project = create_project()
    friendly_id = str(project["friendlyId"])

    approve_response = client.patch(
        f"/api/v1/certifier/projects/{friendly_id}/decision",
        data=approve_payload(),
        files={"certificate": ("cert.pdf", PDF_BYTES, "application/pdf")},
        headers=auth_headers(*CERTIFIER),
    )
    assert approve_response.status_code == 400
    assert "Dossiê incompleto" in approve_response.json()["detail"]

    pendencies_response = client.get(
        f"/api/v1/projects/{friendly_id}/pendencies",
        headers=auth_headers(*PRODUCER),
    )
    assert pendencies_response.status_code == 200, pendencies_response.text
    open_pendencies = [item for item in pendencies_response.json() if item["status"] == "OPEN"]
    assert len(open_pendencies) >= 1

    review_response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/review",
        headers=auth_headers(*CERTIFIER),
    )
    assert review_response.status_code == 200, review_response.text
    assert review_response.json()["certifications"] == []


def test_correction_queue_split_and_producer_response() -> None:
    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])

    request_changes_response = client.patch(
        f"/api/v1/certifier/projects/{friendly_id}/decision",
        data={
            "decision": "REQUEST_CHANGES",
            "rejection_category": "DOCUMENTACAO_INCOMPLETA",
            "description": "Documento de matricula ilegivel.",
            "notes": "Solicitar reenvio do documento legivel.",
        },
        headers=auth_headers(*CERTIFIER),
    )
    assert request_changes_response.status_code == 200, request_changes_response.text

    main_queue_response = client.get(
        "/api/v1/certifier/queue?scope=main",
        headers=auth_headers(*CERTIFIER),
    )
    assert main_queue_response.status_code == 200, main_queue_response.text
    main_queue_payload = main_queue_response.json()
    main_friendly_ids = {item["friendlyId"] for item in main_queue_payload["items"]}
    assert friendly_id not in main_friendly_ids

    corrections_queue_response = client.get(
        "/api/v1/certifier/queue?scope=corrections",
        headers=auth_headers(*CERTIFIER),
    )
    assert corrections_queue_response.status_code == 200, corrections_queue_response.text
    corrections_queue_payload = corrections_queue_response.json()
    corrections_friendly_ids = {item["friendlyId"] for item in corrections_queue_payload["items"]}
    assert friendly_id in corrections_friendly_ids
    assert corrections_queue_payload["counts"]["corrections"] >= 1

    pendencies_response = client.get(
        f"/api/v1/projects/{friendly_id}/pendencies",
        headers=auth_headers(*PRODUCER),
    )
    assert pendencies_response.status_code == 200, pendencies_response.text
    pendency_id = pendencies_response.json()[0]["id"]

    respond_response = client.post(
        f"/api/v1/projects/{friendly_id}/pendencies/{pendency_id}/respond",
        json={"response": "Documento corrigido e reenviado."},
        headers=auth_headers(*PRODUCER),
    )
    assert respond_response.status_code == 200, respond_response.text

    main_queue_after_response = client.get(
        "/api/v1/certifier/queue?scope=main",
        headers=auth_headers(*CERTIFIER),
    )
    assert friendly_id in {item["friendlyId"] for item in main_queue_after_response.json()["items"]}

    corrections_queue_after_response = client.get(
        "/api/v1/certifier/queue?scope=corrections",
        headers=auth_headers(*CERTIFIER),
    )
    assert friendly_id not in {item["friendlyId"] for item in corrections_queue_after_response.json()["items"]}


def test_approve_rolls_back_when_treasury_package_fails(monkeypatch) -> None:
    from fastapi import HTTPException

    async def _raise_502(*args: object, **kwargs: object) -> None:
        raise HTTPException(status_code=502, detail="Não foi possível gravar o arquivo no Supabase Storage.")

    monkeypatch.setattr("backend_app.modules.certifier.service.upload_storage_object", _raise_502)

    project = create_certifiable_project()
    friendly_id = str(project["friendlyId"])

    approve_response = client.patch(
        f"/api/v1/certifier/projects/{friendly_id}/decision",
        data=approve_payload(),
        files={"certificate": ("cert.pdf", PDF_BYTES, "application/pdf")},
        headers=auth_headers(*CERTIFIER),
    )
    assert approve_response.status_code == 502

    review_response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/review",
        headers=auth_headers(*CERTIFIER),
    )
    assert review_response.status_code == 200, review_response.text
    assert review_response.json()["certifications"] == []

    project_response = client.get(f"/api/v1/projects/{friendly_id}")
    assert project_response.status_code == 200, project_response.text
    assert project_response.json()["project"]["status"] != "CERTIFIED_AWAITING_TREASURY"

    treasury_response = client.get(
        "/api/v1/treasury/authorizations",
        headers=auth_headers(*CERTIFIER),
    )
    assert treasury_response.status_code == 200, treasury_response.text
    assert friendly_id not in {item["projectId"] for item in treasury_response.json()}
