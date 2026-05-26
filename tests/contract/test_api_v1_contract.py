from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from backend_app.main import app

client = TestClient(app)


def test_api_v1_contract_uses_persistent_backend_app_runtime() -> None:
    health = client.get("/health")
    projects = client.get("/api/v1/projects?limit=1")

    assert health.status_code == 200
    assert health.json()["version"] == "0.3.0-backend-app"
    assert projects.status_code == 200
    assert projects.json()["success"] is True
    assert projects.json()["projects"]


def test_api_v1_contract_auth_uses_database_profiles() -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "empresa@sinarca.com.br",
            "password": "empresa",
            "role": "company",
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["id"] == "comp-001"
    assert response.json()["access_token"]


def test_api_v1_auth_registers_certifier_and_updates_profile_fields() -> None:
    suffix = uuid4().hex
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Certificadora Contrato",
            "email": f"certifier-{suffix}@sinarca.com.br",
            "document": "11222333000144",
            "password": "senha-segura-123",
            "role": "certifier",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["user"]["role"] == "certifier"
    assert payload["access_token"]

    updated = client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
        json={
            "name": "Certificadora Contrato Atualizada",
            "organization": "Organização de Certificação",
            "phone": "+55 11 99999-9999",
            "document": "99888777000166",
            "avatar": "https://cdn.sinarca.com.br/avatars/certifier.png",
        },
    )

    assert updated.status_code == 200
    updated_user = updated.json()
    assert updated_user["name"] == "Certificadora Contrato Atualizada"
    assert updated_user["organization"] == "Organização de Certificação"
    assert updated_user["document"] == "99888777000166"
    assert updated_user["avatar"] == "https://cdn.sinarca.com.br/avatars/certifier.png"


def test_api_v1_auth_rejects_public_admin_registration() -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Admin Público",
            "email": f"admin-{uuid4().hex}@sinarca.com.br",
            "document": "00000000000",
            "password": "senha-segura-123",
            "role": "admin",
        },
    )

    assert response.status_code == 400
    assert "Admin deve ser provisionado fora do cadastro público" in response.json()["detail"]


def test_public_dossier_contract_exposes_project_transparency_data() -> None:
    response = client.get("/api/v1/projects/PRC-2024-002/public-dossier")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["project"]["friendlyId"] == "PRC-2024-002"
    assert payload["tags"]
    assert payload["baseline"]["baselineHash"]
    assert payload["certifications"]
    assert payload["audits"]
    assert payload["documents"]
    assert payload["credits"]
    assert "transactions" in payload
    assert "chainEvents" in payload


def test_public_transactions_contract_supports_filters_and_detail() -> None:
    filtered = client.get("/api/v1/transactions?project_id=PRC-2024-002&type=received&buyer=comp-001&status=completed&limit=10")

    assert filtered.status_code == 200
    transactions = filtered.json()["transactions"]
    assert transactions
    assert all(transaction["projectId"] == "PRC-2024-002" for transaction in transactions)

    detail = client.get(f"/api/v1/transactions/{transactions[0]['hash']}")

    assert detail.status_code == 200
    assert detail.json()["transaction"]["hash"] == transactions[0]["hash"]


def test_public_profiles_contract_includes_producers_and_minimized_document() -> None:
    producers = client.get("/api/v1/producers")
    profile = client.get("/api/v1/profiles/prod-001")

    assert producers.status_code == 200
    assert any(item["id"] == "prod-001" for item in producers.json()["producers"])
    assert profile.status_code == 200
    public_profile = profile.json()["profile"]
    assert public_profile["id"] == "prod-001"
    assert public_profile["document"].startswith("***")
    assert "email" not in public_profile
