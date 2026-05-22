from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser, create_access_token, decode_token
from backend_app.main import app
from backend_app.modules.profiles.repository import get_profile_repository, reset_profile_repository

client = TestClient(app)


def setup_function() -> None:
    reset_profile_repository()


def test_login_contract_returns_frontend_compatible_tokens():
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
    assert data["token_type"] == "bearer"
    assert data["expires_in_seconds"] == 3600
    assert data["expires_at"]
    assert data["user"]["role"] == "company"

    token_payload = decode_token(data["access_token"])
    assert token_payload["sub"] == data["user"]["id"]
    assert token_payload["role"] == "company"
    assert token_payload["type"] == "access"
    assert token_payload["exp"]


def test_register_blocks_public_admin_and_allows_producer_with_argon2_hash():
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
    assert admin_response.json()["detail"] == "Admin deve ser provisionado fora do cadastro público"

    producer_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Produtor Novo",
            "username": "produtor-novo",
            "email": "produtor.novo@sinarca.com.br",
            "document": "123.456.789-10",
            "password": "senha-super-secreta",
            "role": "producer",
        },
    )

    assert producer_response.status_code == 201
    assert producer_response.json()["user"]["role"] == "producer"

    profile = get_profile_repository().get_by_login("produtor.novo@sinarca.com.br")
    assert profile is not None
    assert profile.password_hash.startswith("$argon2")
    assert "senha-super-secreta" not in profile.password_hash


def test_auth_me_and_profile_update_use_bearer_jwt():
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "auditor@sinarca.com.br", "password": "auditor", "role": "auditor"},
    )
    token = login_response.json()["access_token"]

    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "auditor@sinarca.com.br"

    update_response = client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Auditor Atualizado", "phone": "+55 11 99999-0000"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Auditor Atualizado"
    assert update_response.json()["phone"] == "+55 11 99999-0000"


def test_auth_me_rejects_missing_or_invalid_token():
    missing_response = client.get("/api/v1/auth/me")
    invalid_response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalido"})

    assert missing_response.status_code == 401
    assert invalid_response.status_code == 401


def test_role_guard_rejects_wrong_role_and_allows_admin():
    guard_app = FastAPI()

    @guard_app.get("/admin-only")
    def admin_only(_: AuthenticatedUser = Depends(require_role("admin"))):
        return {"ok": True}

    guard_client = TestClient(guard_app)
    company_token = create_access_token("comp-001", "company")
    admin_token = create_access_token("admin-001", "admin")

    forbidden = guard_client.get("/admin-only", headers={"Authorization": f"Bearer {company_token}"})
    allowed = guard_client.get("/admin-only", headers={"Authorization": f"Bearer {admin_token}"})

    assert forbidden.status_code == 403
    assert allowed.status_code == 200
