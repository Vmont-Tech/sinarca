from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Header, HTTPException, status
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from backend_app.core.config import get_settings
from backend_app.core.roles import UserRole

password_hash = PasswordHash.recommended()


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    role: UserRole


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, password_hash_value: str) -> bool:
    return password_hash.verify(password, password_hash_value)


def create_access_token(user_id: str, role: UserRole) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return _create_token(user_id=user_id, role=role, token_type="access", expires_at=expires_at)


def create_refresh_token(user_id: str, role: UserRole) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
    return _create_token(user_id=user_id, role=role, token_type="refresh", expires_at=expires_at)


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado") from exc
    return payload


def require_user(authorization: str | None = Header(default=None)) -> AuthenticatedUser:
    token = _extract_bearer_token(authorization)
    payload = decode_token(token)
    if payload.get("type") != "access" or not payload.get("sub") or not payload.get("role"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    return AuthenticatedUser(id=str(payload["sub"]), role=payload["role"])


def _create_token(user_id: str, role: UserRole, token_type: str, expires_at: datetime) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": token_type,
        "iat": datetime.now(timezone.utc),
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    return authorization.removeprefix("Bearer ").strip()
