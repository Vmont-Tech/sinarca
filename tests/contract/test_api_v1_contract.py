from __future__ import annotations

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
