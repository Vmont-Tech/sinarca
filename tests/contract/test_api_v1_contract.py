from __future__ import annotations

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from backend.main import (
    ACTIVE_SESSIONS,
    ALLOWED_UPLOAD_CONTENT_TYPES,
    PROJECTS,
    TRANSACTIONS,
    USERS,
    _ensure_demo_users,
    app,
)

client = TestClient(app)

BASELINE_PROJECTS = deepcopy(PROJECTS)
BASELINE_USERS = deepcopy(USERS)


@pytest.fixture(autouse=True)
def reset_state():
    USERS[:] = deepcopy(BASELINE_USERS)
    PROJECTS[:] = deepcopy(BASELINE_PROJECTS)
    TRANSACTIONS.clear()
    ACTIVE_SESSIONS.clear()
    _ensure_demo_users()


def test_health_contract():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "sinarca-api",
        "version": "0.2.0-integrated",
    }


def test_login_contract_returns_token_aliases():
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "empresa@sinarca.com.br",
            "dadoLogin": "empresa@sinarca.com.br",
            "password": "empresa",
            "role": "company",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token"]
    assert data["access_token"] == data["token"]
    assert data["refresh_token"]
    assert data["expires_at"]
    assert data["expires_in_seconds"] > 0
    assert data["user"]["role"] == "company"


def test_register_contract_blocks_admin_and_allows_producer():
    admin_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Admin Indevido",
            "email": "admin.indevido@sinarca.com.br",
            "document": "000.000.000-01",
            "password": "senha-forte",
            "role": "admin",
        },
    )

    assert admin_response.status_code == 400

    producer_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Produtor Novo",
            "username": "produtor-novo",
            "email": "produtor.novo@sinarca.com.br",
            "document": "123.456.789-10",
            "password": "produtor",
            "role": "producer",
        },
    )

    assert producer_response.status_code == 201
    assert producer_response.json()["user"]["role"] == "producer"


def test_projects_contract_returns_collection_and_detail():
    collection_response = client.get("/api/v1/projects?limit=1000")

    assert collection_response.status_code == 200
    collection = collection_response.json()
    assert collection["success"] is True
    assert isinstance(collection["total"], int)
    assert isinstance(collection["projects"], list)
    assert collection["projects"]

    project_id = collection["projects"][0]["id"]
    detail_response = client.get(f"/api/v1/projects/{project_id}")

    assert detail_response.status_code == 200
    assert detail_response.json()["project"]["id"] == project_id


def test_audit_and_certifier_queue_contracts():
    audit_response = client.get("/api/v1/audit/queue")
    certifier_response = client.get("/api/v1/certifier/queue")

    for response in (audit_response, certifier_response):
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["total"], int)
        assert isinstance(data["projects"], list)


@pytest.mark.parametrize(
    ("decision", "expected_status"),
    [
        ("APPROVE", "AUDITED"),
        ("REJECT", "SUSPENDED"),
        ("REQUEST_CHANGES", "CREATED"),
    ],
)
def test_certifier_decision_contract_returns_new_status(decision: str, expected_status: str):
    project_id = "PRC-2023-555"

    response = client.patch(
        f"/api/v1/certifier/projects/{project_id}/decision",
        json={
            "decision": decision,
            "certifier_id": "std-001",
            "notes": "Decisão de contrato",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["new_status"] == expected_status


@pytest.mark.parametrize(
    ("audit_status", "expected_status"),
    [
        ("APPROVED", "AVAILABLE"),
        ("BLOCKED", "SUSPENDED"),
        ("RECALCULATED", "CREATED"),
    ],
)
def test_audit_verify_contract_returns_new_status(audit_status: str, expected_status: str):
    project_id = "PRC-2024-002"

    response = client.patch(
        f"/api/v1/audit/verify/{project_id}",
        json={
            "status": audit_status,
            "laudo_texto": "Laudo automatizado",
            "latitude": -10.18,
            "longitude": -48.33,
            "evidencias_url": ["https://example.test/evidencia.jpg"],
            "assinatura_digital": "assinatura-demo",
            "auditor_id": "aud-005",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["new_status"] == expected_status


def test_marketplace_contract_returns_credits():
    response = client.get("/api/v1/marketplace")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["credits"], list)


def test_marketplace_buy_contract_records_purchase_without_external_wallet():
    response = client.post(
        "/api/v1/marketplace/buy",
        json={
            "project_id": "PRC-2024-002",
            "buyer_id": "comp-001",
            "quantidade": 10,
            "unit_price_brl": 500,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["transaction"]["tipo_transacao"] == "PURCHASE"
    assert data["transaction"]["buyer_id"] == "comp-001"
    assert data["transaction"]["totalValue"] == 5000.0
    assert data["transaction"]["hash_transacao_stellar"]


def test_compensate_contract_returns_certificate():
    response = client.post(
        "/api/v1/marketplace/compensate",
        json={
            "buyer_id": "comp-001",
            "emissions_data": {
                "scope1": 1000,
                "scope2": 2000,
                "scope3": 2000,
                "total": 5000,
            },
            "credits_to_use": [{"project_id": "PRC-2024-002", "amount": 5000}],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["certificate"]["emissionsCompensated"] == 5000
    assert data["certificate"]["certificateUrl"]
    assert data["certificate"]["blockchainHash"]


def test_inventory_upload_contract_rejects_unallowed_content_type():
    disallowed_content_type = "application/x-msdownload"
    assert disallowed_content_type not in ALLOWED_UPLOAD_CONTENT_TYPES

    response = client.post(
        "/api/v1/inventory/upload",
        files={"file": ("malware.exe", b"not-a-real-file", disallowed_content_type)},
    )

    assert response.status_code == 415
