from __future__ import annotations

import asyncio
import uuid

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser, create_access_token, decode_token
from backend_app.db.models import Document, Profile
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


def test_register_persists_profile_metadata_for_selected_role():
    email = f"perfil-produtor.{uuid.uuid4().hex[:8]}@sinarca.com.br"

    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Produtor com Perfil",
            "email": email,
            "document": "321.654.987-10",
            "password": "senha-super-secreta",
            "role": "producer",
            "organization": "Fazenda Perfil Vivo",
            "phone": "+55 63 99999-1111",
            "avatar": "https://cdn.sinarca.com.br/profiles/produtor.png",
        },
    )

    assert response.status_code == 201
    user = response.json()["user"]
    assert user["role"] == "producer"
    assert user["organization"] == "Fazenda Perfil Vivo"
    assert user["phone"] == "+55 63 99999-1111"
    assert user["avatar"] is None


def test_profile_avatar_upload_persists_profiles_bucket_url():
    email = f"avatar.bucket.{uuid.uuid4().hex[:8]}@sinarca.com.br"
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Perfil com Avatar",
            "email": email,
            "document": "123.123.123-12",
            "password": "senha-super-secreta",
            "role": "producer",
        },
    )
    token = register_response.json()["access_token"]

    response = client.post(
        "/api/v1/auth/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", b"\x89PNG\r\n\x1a\navatar-bucket", "image/png")},
    )

    assert response.status_code == 200
    avatar_url = response.json()["avatar"]
    assert avatar_url.startswith("supabase://profiles/")
    assert "/avatar/" in avatar_url
    profile = asyncio.run(_get_profile_by_email(email))
    assert profile is not None
    assert profile.avatar_url == avatar_url


def test_profile_document_upload_persists_user_documents_bucket():
    email = f"documento.bucket.{uuid.uuid4().hex[:8]}@sinarca.com.br"
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Perfil com Documento",
            "email": email,
            "document": "321.321.321-32",
            "password": "senha-super-secreta",
            "role": "company",
        },
    )
    token = register_response.json()["access_token"]

    response = client.post(
        "/api/v1/auth/me/documents",
        headers={"Authorization": f"Bearer {token}"},
        data={"document_type": "IDENTITY"},
        files={"file": ("identidade.pdf", f"%PDF-1.4\nidentidade {email}\n%%EOF".encode(), "application/pdf")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["bucket"] == "user-documents"
    assert payload["storage_path"].startswith("supabase://user-documents/")
    assert "/documents/identity/" in payload["storage_path"]
    document = asyncio.run(_get_document_by_hash(payload["sha256"]))
    assert document is not None
    assert document.storage_path == payload["storage_path"]
    assert document.metadata_["bucket"] == "user-documents"


def test_admin_can_provision_admin_without_public_registration():
    email = f"admin.provisionado.{uuid.uuid4().hex[:8]}@sinarca.com.br"
    admin_token = create_access_token("admin-001", "admin")

    response = client.post(
        "/api/v1/auth/admin/provision",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Admin Provisionado",
            "email": email,
            "document": "00000000099",
            "password": "senha-admin-segura",
            "organization": "Operação SINARCA",
            "phone": "+55 11 99999-9999",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["user"]["role"] == "admin"
    assert payload["user"]["email"] == email
    assert payload["user"]["organization"] == "Operação SINARCA"


def test_non_admin_cannot_provision_admin():
    email = f"admin.bloqueado.{uuid.uuid4().hex[:8]}@sinarca.com.br"
    producer_token = create_access_token("prod-001", "producer")

    response = client.post(
        "/api/v1/auth/admin/provision",
        headers={"Authorization": f"Bearer {producer_token}"},
        json={
            "name": "Admin Bloqueado",
            "email": email,
            "document": "00000000098",
            "password": "senha-admin-segura",
        },
    )

    assert response.status_code == 403


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


async def _get_document_by_hash(sha256_hash: str) -> Document | None:
    async with get_sessionmaker()() as session:
        result = await session.execute(select(Document).where(Document.sha256_hash == sha256_hash))
        return result.scalar_one_or_none()
