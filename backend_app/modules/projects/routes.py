from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.session import get_session
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
