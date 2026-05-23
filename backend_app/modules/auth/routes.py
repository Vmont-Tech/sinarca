from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.security import AuthenticatedUser, require_user
from backend_app.db.session import get_session
from backend_app.modules.auth.schemas import AuthResponse, AuthUser, LoginRequest, ProfileUpdate, RegisterRequest
from backend_app.modules.auth.service import AuthService
from backend_app.modules.profiles.repository import get_profile_repository

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    return await AuthService(get_profile_repository(session)).login(payload)


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_session)) -> AuthResponse:
    return await AuthService(get_profile_repository(session)).register(payload)


@router.get("/auth/me", response_model=AuthUser)
async def get_me(
    current_user: AuthenticatedUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
) -> AuthUser:
    return await AuthService(get_profile_repository(session)).get_user(current_user.id)


@router.patch("/auth/me", response_model=AuthUser)
async def update_me(
    payload: ProfileUpdate,
    current_user: AuthenticatedUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
) -> AuthUser:
    return await AuthService(get_profile_repository(session)).update_user(current_user.id, payload)
