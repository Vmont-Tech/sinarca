from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from backend_app.core.config import get_settings
from backend_app.core.roles import normalize_public_role
from backend_app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from backend_app.modules.auth.schemas import AuthResponse, AuthUser, LoginRequest, ProfileUpdate, RegisterRequest
from backend_app.modules.profiles.repository import ProfileRecord, SQLAlchemyProfileRepository


class AuthService:
    def __init__(self, repository: SQLAlchemyProfileRepository) -> None:
        self.repository = repository

    async def login(self, payload: LoginRequest) -> AuthResponse:
        login_value = (payload.email or payload.dadoLogin or "").strip()
        profile = await self.repository.get_by_login(login_value) if login_value else None
        if profile is None or not verify_password(payload.password, profile.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
        return build_auth_response(profile)

    async def register(self, payload: RegisterRequest) -> AuthResponse:
        role = normalize_public_role(payload.role)
        if await self.repository.email_exists(str(payload.email)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

        email = str(payload.email)
        try:
            profile = await self.repository.create(
                name=payload.name or payload.username or email.split("@")[0],
                email=email,
                document=payload.document or "",
                role=role,
                password_hash_value=hash_password(payload.password),
            )
            await _commit_if_needed(self.repository)
        except IntegrityError as exc:
            await _rollback_if_needed(self.repository)
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado") from exc
        return build_auth_response(profile)

    async def get_user(self, user_id: str) -> AuthUser:
        profile = await self.repository.get_by_id(user_id)
        if profile is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        return AuthUser(**profile.public_dict())

    async def update_user(self, user_id: str, payload: ProfileUpdate) -> AuthUser:
        try:
            profile = await self.repository.update(user_id, **payload.model_dump(exclude_unset=True))
            if profile is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
            await _commit_if_needed(self.repository)
        except IntegrityError as exc:
            await _rollback_if_needed(self.repository)
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado") from exc
        return AuthUser(**profile.public_dict())


def build_auth_response(profile: ProfileRecord) -> AuthResponse:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    access_token = create_access_token(profile.id, profile.role)
    return AuthResponse(
        token=access_token,
        access_token=access_token,
        refresh_token=create_refresh_token(profile.id, profile.role),
        token_type="bearer",
        expires_in_seconds=settings.access_token_minutes * 60,
        expires_at=expires_at.isoformat(),
        user=AuthUser(**profile.public_dict()),
    )


async def _commit_if_needed(repository: SQLAlchemyProfileRepository) -> None:
    await repository.session.commit()


async def _rollback_if_needed(repository: SQLAlchemyProfileRepository) -> None:
    await repository.session.rollback()
