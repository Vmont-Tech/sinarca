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
    organization: str | None = None
    phone: str | None = None


class AdminProvisionRequest(BaseModel):
    name: str
    email: EmailStr
    document: str | None = None
    password: str
    organization: str | None = None
    phone: str | None = None


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


class UserDocumentUploadResponse(BaseModel):
    success: bool
    id: str
    filename: str
    document_type: str
    mime_type: str
    size_bytes: int
    sha256: str
    storage_path: str
    bucket: str
    object_path: str
    status: str
