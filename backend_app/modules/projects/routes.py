from __future__ import annotations

import hashlib
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import Document
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.inventory.routes import (
    ALLOWED_EXTENSIONS,
    MAX_UPLOAD_BYTES,
    MIME_BY_EXTENSION,
    validate_magic_bytes,
)
from backend_app.modules.projects.schemas import (
    CatalogResponse,
    ProjectCreate,
    ProjectPublicDossierResponse,
    ProjectResponse,
    ProjectsResponse,
    PublicProfileResponse,
)
from backend_app.modules.projects.service import ProjectsService

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=ProjectsResponse)
async def list_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    state: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
) -> ProjectsResponse:
    projects = await ProjectsService(session).list_projects(status_filter=status_filter, state=state, limit=limit)
    return ProjectsResponse(total=len(projects), projects=projects)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, session: AsyncSession = Depends(get_session)) -> ProjectResponse:
    project = await ProjectsService(session).get_project(project_id)
    return ProjectResponse(project=project)


@router.get("/projects/{project_id}/public-dossier", response_model=ProjectPublicDossierResponse)
async def get_project_public_dossier(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> ProjectPublicDossierResponse:
    return await ProjectsService(session).get_public_dossier(project_id)


@router.post("/projects/{project_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_project_document(
    project_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    normalized_document_type = document_type.strip().upper()
    if not normalized_document_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de documento é obrigatório")

    filename = file.filename or "upload"
    extension = PurePath(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Extensão de arquivo não permitida")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")
    validate_magic_bytes(extension, content)

    project = await ProjectsService(session).get_project_model(project_id)
    expected_mime = MIME_BY_EXTENSION[extension]
    sha256 = hashlib.sha256(content).hexdigest()
    document = Document(
        project_id=project.id,
        document_type=normalized_document_type,
        storage_path=f"projects/{project.friendly_id}/documents/{sha256}{extension}",
        sha256_hash=sha256,
        mime_type=expected_mime,
        size_bytes=len(content),
        metadata_={"filename": filename, "content_type": file.content_type},
    )
    session.add(document)
    await session.flush()
    await create_audit_event(
        session,
        action="PROJECT_DOCUMENT_UPLOADED",
        entity_type="documents",
        entity_id=document.id,
        actor_role=current_user.role,
        metadata={
            "actor_external_id": current_user.id,
            "friendly_id": project.friendly_id,
            "document_type": normalized_document_type,
            "sha256": sha256,
        },
    )
    await session.commit()
    return {
        "success": True,
        "id": str(document.id),
        "project_id": project.friendly_id,
        "document_type": normalized_document_type,
        "sha256": sha256,
        "storage_path": document.storage_path,
        "size_bytes": len(content),
        "mime_type": expected_mime,
        "status": "UPLOADED",
    }


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    project = await ProjectsService(session).create_project(payload, actor_id=current_user.id, actor_role=current_user.role)
    return ProjectResponse(project=project)


@router.get("/certifiers", response_model=CatalogResponse)
async def list_certifiers(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("certifiers")


@router.get("/auditors", response_model=CatalogResponse)
async def list_auditors(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("auditors")


@router.get("/companies", response_model=CatalogResponse)
async def list_companies(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("companies")


@router.get("/producers", response_model=CatalogResponse)
async def list_producers(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("producers")


@router.get("/profiles/{profile_id}", response_model=PublicProfileResponse)
async def get_public_profile(profile_id: str, session: AsyncSession = Depends(get_session)) -> PublicProfileResponse:
    profile = await ProjectsService(session).public_profile(profile_id)
    return PublicProfileResponse(profile=profile)
