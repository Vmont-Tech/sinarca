from __future__ import annotations

from pydantic import BaseModel, EmailStr

from backend_app.core.roles import UserRole


class LoginRequest(BaseModel):
    email: str | None = None
    dadoLogin: str | None = None
    password: str
    role: UserRole | None = None


class RegisterRequest(BaseModel):
    name: str | None = None
    username: str | None = None
    email: EmailStr
    document: str | None = None
    password: str
    role: str = "company"


class AuthUser(BaseModel):
    id: str
    name: str
    email: EmailStr
    document: str = ""
    role: UserRole
    organization: str | None = None
    phone: str | None = None
    avatar: str | None = None
    govLevel: str | None = None


class AuthResponse(BaseModel):
    token: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    expires_at: str
    user: AuthUser


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    document: str | None = None
    organization: str | None = None
    phone: str | None = None
    avatar: str | None = None
