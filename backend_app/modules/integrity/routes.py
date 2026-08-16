from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.session import get_session
from backend_app.modules.integrity.schemas import ProjectClaimsResponse, ProjectEvidenceResponse
from backend_app.modules.integrity.service import IntegrityService
from backend_app.modules.projects.service import ProjectsService

router = APIRouter(tags=["integrity"])


@router.get("/projects/{project_id}/claims", response_model=ProjectClaimsResponse)
async def get_project_claims(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectClaimsResponse:
    """Claims de originacao do projeto (T-04.2-08, guard org-scoped).

    Claim de projeto de terceiro e dado interno (posse/direito declarados):
    reutiliza o mesmo guard org-scoped de /pendencies e /boundary-overlaps
    para nunca vazar Claims de outro produtor/certificadora.
    Somente leitura: nenhuma rota POST/PATCH existe para Claims (T-04.2-06).
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)
    claims = await IntegrityService(session).list_claims(project)
    return ProjectClaimsResponse(project_id=str(project.id), total=len(claims), claims=claims)


@router.get("/projects/{project_id}/evidence", response_model=ProjectEvidenceResponse)
async def get_project_evidence(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectEvidenceResponse:
    """Evidence vinculada aos documentos do projeto (T-04.2-08, guard org-scoped).

    Mesma sensibilidade de /claims: Evidence revela hash e metadados de
    documentos de outro projeto, por isso usa o mesmo guard org-scoped.
    Somente leitura: toda criacao de Evidence e server-side.
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)
    evidence = await IntegrityService(session).list_evidence(project)
    return ProjectEvidenceResponse(project_id=str(project.id), total=len(evidence), evidence=evidence)
