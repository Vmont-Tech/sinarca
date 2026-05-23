from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from backend_app.main import app

client = TestClient(app)


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
