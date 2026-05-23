from __future__ import annotations

import asyncio
import uuid

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser, create_access_token, decode_token
from backend_app.db.models import Profile
from backend_app.db.session import get_sessionmaker
from backend_app.main import app

client = TestClient(app)


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
    producer_email = f"produtor.novo.{uuid.uuid4().hex[:8]}@sinarca.com.br"
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
            "email": producer_email,
            "document": "123.456.789-10",
            "password": "senha-super-secreta",
            "role": "producer",
        },
    )

    assert producer_response.status_code == 201
    assert producer_response.json()["user"]["role"] == "producer"

    profile = asyncio.run(_get_profile_by_email(producer_email))
    assert profile is not None
    assert profile.password_hash.startswith("$argon2")
    assert "senha-super-secreta" not in profile.password_hash


def test_register_persists_profile_for_subsequent_login():
    email = f"persistente.{uuid.uuid4().hex[:8]}@sinarca.com.br"
    password = "senha-super-secreta"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Conta Persistente",
            "email": email,
            "document": "123.456.789-11",
            "password": password,
            "role": "company",
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password, "role": "company"},
    )

    assert register_response.status_code == 201
    assert login_response.status_code == 200
    assert login_response.json()["user"]["email"] == email
    assert asyncio.run(_get_profile_by_email(email)) is not None


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


def test_profile_update_persists_organization_and_phone():
    email = f"perfil.{uuid.uuid4().hex[:8]}@sinarca.com.br"
    password = "senha-super-secreta"
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Perfil Original",
            "email": email,
            "document": "123.456.789-12",
            "password": password,
            "role": "company",
        },
    )
    token = register_response.json()["access_token"]

    update_response = client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Perfil Atualizado",
            "organization": "Empresa Perfil Atualizada",
            "phone": "+55 11 98888-7777",
        },
    )
    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert register_response.status_code == 201
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Perfil Atualizado"
    assert update_response.json()["organization"] == "Empresa Perfil Atualizada"
    assert update_response.json()["phone"] == "+55 11 98888-7777"
    assert me_response.json()["organization"] == "Empresa Perfil Atualizada"


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


async def _get_profile_by_email(email: str) -> Profile | None:
    async with get_sessionmaker()() as session:
        result = await session.execute(select(Profile).where(Profile.email == email))
        return result.scalar_one_or_none()
