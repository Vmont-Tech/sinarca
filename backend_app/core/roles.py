from __future__ import annotations

from typing import Literal, cast

from fastapi import Depends, HTTPException, status

UserRole = Literal["producer", "auditor", "company", "certifier", "admin"]

PUBLIC_AUTH_ROLES: set[str] = {"producer", "auditor", "company", "certifier"}
ALL_AUTH_ROLES: set[str] = {*PUBLIC_AUTH_ROLES, "admin"}


def normalize_public_role(role: str | None) -> UserRole:
    normalized = (role or "company").strip().lower()
    if normalized not in PUBLIC_AUTH_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin deve ser provisionado fora do cadastro público",
        )
    return cast(UserRole, normalized)


def require_role(*roles: UserRole):
    from backend_app.core.security import require_user

    allowed = set(roles)

    def dependency(current_user=Depends(require_user)):
        if current_user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente")
        return current_user

    return dependency
