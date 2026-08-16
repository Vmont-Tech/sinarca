from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.session import get_session
from backend_app.modules.integrity.constants import CONFLICT_STATUSES
from backend_app.modules.integrity.schemas import (
    ProjectClaimsResponse,
    ProjectConflictsResponse,
    ProjectEvidenceResponse,
    ProjectIntegrityResponse,
)
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


@router.get("/projects/{project_id}/conflicts", response_model=ProjectConflictsResponse)
async def get_project_conflicts(
    project_id: str,
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectConflictsResponse:
    """Conflicts (overlap geoespacial + double claim) do projeto (T-04.2-11).

    Uma linha de Conflict nomeia o projeto de terceiro (friendly_id) e o
    quanto ele sobrepoe: informacao competitivamente sensivel, por isso usa
    o mesmo guard org-scoped de /boundary-overlaps e /pendencies.
    Somente leitura: Conflict e escrito exclusivamente por
    detect_and_persist_conflicts, nunca por uma rota.
    """
    if status_filter is not None and status_filter not in CONFLICT_STATUSES:
        raise HTTPException(status_code=400, detail="invalid status filter")
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)
    conflicts = await IntegrityService(session).list_conflicts(project, status_filter=status_filter)
    return ProjectConflictsResponse(project_id=str(project.id), total=len(conflicts), conflicts=conflicts)


@router.get("/projects/{project_id}/integrity", response_model=ProjectIntegrityResponse)
async def get_project_integrity(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectIntegrityResponse:
    """Risk Engine: visao INTERNA completa do risco do projeto (INTG-04).

    Devolve riskScore, riskClass, integrityStatus/publicStatus, autoHold e a
    lista completa de sinais explicados (code/weight/reason/publicSafe) do
    ultimo recalculo append-only em risk_assessments/risk_signals. Esta e a
    visao INTERNA -- a visao publica minimizada (allowlist de sinais, sem
    metadata de terceiros) e entregue apenas na Plan 05. Mesmo guard
    org-scoped de /claims, /evidence e /conflicts, ja que os sinais citam
    contagem de conflitos com projetos de terceiros (T-04.2-19).
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)
    integrity = await IntegrityService(session).integrity_summary(project)
    return ProjectIntegrityResponse(project_id=str(project.id), integrity=integrity)
