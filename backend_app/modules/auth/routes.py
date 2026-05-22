from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from backend_app.core.security import AuthenticatedUser, require_user
from backend_app.modules.auth.schemas import AuthResponse, AuthUser, LoginRequest, ProfileUpdate, RegisterRequest
from backend_app.modules.auth.service import AuthService
from backend_app.modules.profiles.repository import get_profile_repository

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    return AuthService().login(payload)


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> AuthResponse:
    return AuthService().register(payload)


@router.get("/auth/me", response_model=AuthUser)
def get_me(current_user: AuthenticatedUser = Depends(require_user)) -> AuthUser:
    profile = get_profile_repository().get_by_id(current_user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return AuthUser(**profile.public_dict())


@router.patch("/auth/me", response_model=AuthUser)
def update_me(payload: ProfileUpdate, current_user: AuthenticatedUser = Depends(require_user)) -> AuthUser:
    profile = get_profile_repository().update(current_user.id, **payload.model_dump(exclude_unset=True))
    if profile is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return AuthUser(**profile.public_dict())
