from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import PurePath

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError

from backend_app.core.config import get_settings
from backend_app.core.roles import normalize_public_role
from backend_app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from backend_app.db.models import Document
from backend_app.db.repositories import create_audit_event
from backend_app.modules.auth.schemas import (
    AdminProvisionRequest,
    AuthResponse,
    AuthUser,
    LoginRequest,
    ProfileUpdate,
    RegisterRequest,
    UserDocumentUploadResponse,
)
from backend_app.modules.profiles.repository import ProfileRecord, SQLAlchemyProfileRepository
from backend_app.modules.storage.service import StorageUploadError, SupabaseStorageService

MAX_AVATAR_BYTES = 5 * 1024 * 1024
MAX_USER_DOCUMENT_BYTES = 10 * 1024 * 1024
AVATAR_MIME_BY_EXTENSION = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}
DOCUMENT_MIME_BY_EXTENSION = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


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
                organization=payload.organization,
                phone=payload.phone,
            )
            await _commit_if_needed(self.repository)
        except IntegrityError as exc:
            await _rollback_if_needed(self.repository)
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado") from exc
        return build_auth_response(profile)

    async def provision_admin(self, payload: AdminProvisionRequest) -> AuthResponse:
        if await self.repository.email_exists(str(payload.email)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

        email = str(payload.email)
        try:
            profile = await self.repository.create(
                name=payload.name,
                email=email,
                document=payload.document or "",
                role="admin",
                password_hash_value=hash_password(payload.password),
                organization=payload.organization,
                phone=payload.phone,
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

    async def upload_avatar(self, user_id: str, file: UploadFile) -> AuthUser:
        profile_model = await self.repository.get_profile_model(user_id)
        if profile_model is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

        filename, extension, mime_type, content = await read_validated_upload(
            file,
            allowed_mimes=AVATAR_MIME_BY_EXTENSION,
            max_bytes=MAX_AVATAR_BYTES,
        )
        sha256 = hashlib.sha256(content).hexdigest()
        object_path = f"{profile_model.id}/avatar/{sha256}{extension}"
        try:
            storage_object = await SupabaseStorageService().upload(
                bucket="profiles",
                object_path=object_path,
                content=content,
                mime_type=mime_type,
                public=True,
            )
        except StorageUploadError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

        profile = await self.repository.update(user_id, avatar=storage_object.storage_path)
        if profile is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        await create_audit_event(
            self.repository.session,
            action="PROFILE_AVATAR_UPLOADED",
            entity_type="profiles",
            entity_id=profile_model.id,
            actor_role=profile.role,
            metadata={
                "actor_external_id": user_id,
                "filename": filename,
                "bucket": storage_object.bucket,
                "object_path": storage_object.object_path,
                "sha256": sha256,
                "storage_uploaded": storage_object.uploaded,
            },
        )
        await _commit_if_needed(self.repository)
        return AuthUser(**profile.public_dict())

    async def upload_user_document(self, user_id: str, file: UploadFile, document_type: str) -> UserDocumentUploadResponse:
        profile_model = await self.repository.get_profile_model(user_id)
        if profile_model is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

        filename, extension, mime_type, content = await read_validated_upload(
            file,
            allowed_mimes=DOCUMENT_MIME_BY_EXTENSION,
            max_bytes=MAX_USER_DOCUMENT_BYTES,
        )
        normalized_type = normalize_document_type(document_type)
        type_path = normalized_type.lower().replace("_", "-")
        sha256 = hashlib.sha256(content).hexdigest()
        object_path = f"{profile_model.id}/documents/{type_path}/{sha256}{extension}"
        try:
            storage_object = await SupabaseStorageService().upload(
                bucket="user-documents",
                object_path=object_path,
                content=content,
                mime_type=mime_type,
            )
        except StorageUploadError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

        document = Document(
            owner_profile_id=profile_model.id,
            owner_organization_id=profile_model.organization_id,
            document_type=normalized_type,
            storage_path=storage_object.storage_path,
            sha256_hash=sha256,
            mime_type=mime_type,
            size_bytes=len(content),
            metadata_={
                "filename": filename,
                "content_type": file.content_type,
                "bucket": storage_object.bucket,
                "object_path": storage_object.object_path,
                "storage_uploaded": storage_object.uploaded,
            },
        )
        self.repository.session.add(document)
        await self.repository.session.flush()
        await create_audit_event(
            self.repository.session,
            action="PROFILE_DOCUMENT_UPLOADED",
            entity_type="documents",
            entity_id=document.id,
            actor_role=profile_model.role,
            metadata={"actor_external_id": user_id, "sha256": sha256, "bucket": storage_object.bucket},
        )
        await _commit_if_needed(self.repository)
        return UserDocumentUploadResponse(
            success=True,
            id=str(document.id),
            filename=filename,
            document_type=normalized_type,
            mime_type=mime_type,
            size_bytes=len(content),
            sha256=sha256,
            storage_path=storage_object.storage_path,
            bucket=storage_object.bucket,
            object_path=storage_object.object_path,
            status="UPLOADED",
        )


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


async def read_validated_upload(
    file: UploadFile,
    *,
    allowed_mimes: dict[str, str],
    max_bytes: int,
) -> tuple[str, str, str, bytes]:
    filename = file.filename or "upload"
    extension = PurePath(filename).suffix.lower()
    if extension not in allowed_mimes:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Extensão de arquivo não permitida")

    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")
    validate_magic_bytes(extension, content)
    return filename, extension, allowed_mimes[extension], content


def validate_magic_bytes(extension: str, content: bytes) -> None:
    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para PDF")
    if extension == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para PNG")
    if extension in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para JPEG")
    if extension == ".webp" and not (content.startswith(b"RIFF") and content[8:12] == b"WEBP"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para WebP")
    if extension == ".xlsx" and not content.startswith(b"PK"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para XLSX")


def normalize_document_type(document_type: str) -> str:
    normalized = "".join(ch if ch.isalnum() else "_" for ch in document_type.strip().upper()).strip("_")
    return normalized or "PROFILE_DOCUMENT"
