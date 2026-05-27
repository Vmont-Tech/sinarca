from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.security import AuthenticatedUser, require_user
from backend_app.db.models import Document, InventoryRegion, Organization, Profile
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.supabase_storage import upload_storage_object
from backend_app.modules.storage_paths import user_document_location

router = APIRouter(tags=["inventory"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx"}
MIME_BY_EXTENSION = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class InventoryDeclarationRequest(BaseModel):
    escopo_1: float = Field(ge=0)
    escopo_2: float = Field(ge=0)
    escopo_3: float = Field(ge=0)


@router.get("/inventory")
async def get_inventory(session: AsyncSession = Depends(get_session)) -> dict[str, object]:
    result = await session.execute(select(InventoryRegion).order_by(InventoryRegion.uf.asc()))
    inventory = [
        {
            "id": item.id,
            "uf": item.uf,
            "name": item.name,
            "description": item.description,
            "status": item.status,
            "emissions": item.emissions,
            "localContributions": item.local_contributions,
            "source": item.source,
        }
        for item in result.scalars().all()
    ]
    return {"success": True, "inventory": inventory}


@router.post("/inventory/declare", status_code=status.HTTP_201_CREATED)
async def declare_inventory(
    payload: InventoryDeclarationRequest,
    current_user: AuthenticatedUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    owner_profile, owner_org = await resolve_owner(session, current_user.id)
    total = payload.escopo_1 + payload.escopo_2 + payload.escopo_3
    declaration = {
        "escopo_1": payload.escopo_1,
        "escopo_2": payload.escopo_2,
        "escopo_3": payload.escopo_3,
        "total_emissoes": total,
        "recommended_offset_tco2e": total,
        "declaration_id": f"inventory-{uuid.uuid4()}",
    }
    encoded = json.dumps(declaration, sort_keys=True).encode()
    sha256 = hashlib.sha256(encoded).hexdigest()
    owner_id = str(owner_profile.id if owner_profile else owner_org.id if owner_org else current_user.id)
    location = user_document_location(owner_id, "INVENTORY_DECLARATION", sha256, ".json")
    await upload_storage_object(location.bucket, location.object_path, encoded, "application/json")
    document = Document(
        owner_profile_id=owner_profile.id if owner_profile else None,
        owner_organization_id=owner_org.id if owner_org else None,
        document_type="INVENTORY_DECLARATION",
        storage_bucket=location.bucket,
        storage_object_path=location.object_path,
        storage_path=location.uri,
        sha256_hash=sha256,
        mime_type="application/json",
        size_bytes=len(encoded),
        metadata_=declaration,
    )
    session.add(document)
    await session.flush()
    await create_audit_event(
        session,
        action="INVENTORY_DECLARED",
        entity_type="documents",
        entity_id=document.id,
        actor_role=current_user.role,
        metadata={"actor_external_id": current_user.id, "total_emissoes": total},
    )
    await session.commit()
    return {
        "success": True,
        "id": str(document.id),
        "total_emissoes": total,
        "recommended_offset_tco2e": total,
        "status": "DECLARED",
    }


@router.post("/inventory/upload", status_code=status.HTTP_201_CREATED)
async def upload_inventory_document(
    current_user: AuthenticatedUser = Depends(require_user),
    session: AsyncSession = Depends(get_session),
    file: UploadFile = File(...),
) -> dict[str, object]:
    filename = file.filename or "upload"
    extension = PurePath(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Extensão de arquivo não permitida")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")
    validate_magic_bytes(extension, content)

    expected_mime = MIME_BY_EXTENSION[extension]
    sha256 = hashlib.sha256(content).hexdigest()
    owner_profile, owner_org = await resolve_owner(session, current_user.id)
    owner_id = str(owner_profile.id if owner_profile else owner_org.id if owner_org else current_user.id)
    location = user_document_location(owner_id, "INVENTORY_UPLOAD", sha256, extension)
    await upload_storage_object(location.bucket, location.object_path, content, expected_mime)
    document = Document(
        owner_profile_id=owner_profile.id if owner_profile else None,
        owner_organization_id=owner_org.id if owner_org else None,
        document_type="INVENTORY_UPLOAD",
        storage_bucket=location.bucket,
        storage_object_path=location.object_path,
        storage_path=location.uri,
        sha256_hash=sha256,
        mime_type=expected_mime,
        size_bytes=len(content),
        metadata_={"filename": filename, "content_type": file.content_type},
    )
    session.add(document)
    await session.flush()
    await create_audit_event(
        session,
        action="INVENTORY_DOCUMENT_UPLOADED",
        entity_type="documents",
        entity_id=document.id,
        actor_role=current_user.role,
        metadata={"actor_external_id": current_user.id, "sha256": sha256},
    )
    await session.commit()
    return {
        "success": True,
        "id": str(document.id),
        "filename": filename,
        "mime_type": expected_mime,
        "size_bytes": len(content),
        "sha256": sha256,
        "storage_bucket": document.storage_bucket,
        "storage_object_path": document.storage_object_path,
        "storage_path": document.storage_path,
        "status": "UPLOADED",
    }


def validate_magic_bytes(extension: str, content: bytes) -> None:
    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para PDF")
    if extension == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para PNG")
    if extension in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para JPEG")


async def resolve_owner(session: AsyncSession, external_id: str) -> tuple[Profile | None, Organization | None]:
    profile = (await session.execute(select(Profile).where(Profile.external_id == external_id))).scalar_one_or_none()
    organization = None
    if profile and profile.organization_id:
        organization = await session.get(Organization, profile.organization_id)
    if organization is None:
        organization = (await session.execute(select(Organization).where(Organization.external_id == external_id))).scalar_one_or_none()
    return profile, organization
