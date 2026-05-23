from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import Audit, EnvironmentalCredit, Project
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.projects.schemas import QueueResponse
from backend_app.modules.projects.service import ProjectsService

router = APIRouter(tags=["audit"])


class AuditVerifyRequest(BaseModel):
    status: Literal["APPROVED", "BLOCKED", "RECALCULATED"]
    laudo_texto: str = ""
    latitude: float | None = None
    longitude: float | None = None
    evidencias_url: list[str] = []
    assinatura_digital: str = "assinatura-digital-pendente"
    auditor_id: str | int | None = None


@router.get("/audit/queue", response_model=QueueResponse)
async def audit_queue(
    _: AuthenticatedUser = Depends(require_role("auditor", "admin")),
    session: AsyncSession = Depends(get_session),
) -> QueueResponse:
    service = ProjectsService(session)
    statement = select(Project).where(Project.status.in_(["AWAITING_AUDIT", "BLOCKED_AUDIT_REQUIRED"])).order_by(Project.created_at.asc())
    projects = [await service.project_to_mrca(project) for project in (await session.execute(statement)).scalars().all()]
    return QueueResponse(total=len(projects), projects=projects)


@router.patch("/audit/verify/{project_id}")
async def verify_project(
    project_id: str,
    payload: AuditVerifyRequest,
    current_user: AuthenticatedUser = Depends(require_role("auditor", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    previous_status = project.status

    if payload.status == "APPROVED":
        project.status = "ACTIVE"
        await _unlock_credits(session, project)
    elif payload.status == "BLOCKED":
        project.status = "BLOCKED_AUDIT_REQUIRED"
        await _block_credits(session, project)
    else:
        project.status = "RECALCULATION_REQUIRED"
        await _block_credits(session, project)

    audit = await _get_or_create_audit(session, project, payload.status)
    audit.report_text = payload.laudo_texto
    audit.latitude = Decimal(str(payload.latitude)) if payload.latitude is not None else None
    audit.longitude = Decimal(str(payload.longitude)) if payload.longitude is not None else None
    audit.evidence_urls = payload.evidencias_url
    audit.digital_signature = payload.assinatura_digital
    audit.audited_at = datetime.now(timezone.utc)

    project.timeline = [
        *(project.timeline or []),
        {
            "title": _audit_title(payload.status),
            "date": datetime.now(timezone.utc).date().isoformat(),
            "status": "completed" if payload.status == "APPROVED" else "active",
            "desc": payload.laudo_texto or "Verificação registrada pelo auditor.",
        },
    ]
    await create_audit_event(
        session,
        action=f"AUDIT_{payload.status}",
        entity_type="projects",
        entity_id=project.id,
        actor_role=current_user.role,
        before_data={"status": previous_status},
        after_data={"status": project.status},
        metadata={"actor_external_id": current_user.id, "evidence_count": len(payload.evidencias_url)},
    )
    await session.commit()
    return {
        "success": True,
        "project_id": project.friendly_id,
        "new_status": project.status,
        "audit_date": datetime.now(timezone.utc).isoformat(),
    }


async def _get_or_create_audit(session: AsyncSession, project: Project, status: str) -> Audit:
    result = await session.execute(select(Audit).where(Audit.project_id == project.id, Audit.status == status))
    audit = result.scalar_one_or_none()
    if audit is not None:
        return audit
    audit = Audit(project_id=project.id, auditor_organization_id=project.auditor_organization_id, status=status)
    session.add(audit)
    await session.flush()
    return audit


async def _unlock_credits(session: AsyncSession, project: Project) -> None:
    result = await session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
    for credit in result.scalars().all():
        credit.status = "AVAILABLE"
        credit.quantity_available = credit.quantity_total - credit.quantity_retired


async def _block_credits(session: AsyncSession, project: Project) -> None:
    result = await session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
    for credit in result.scalars().all():
        credit.status = "SUSPENDED"
        credit.quantity_available = Decimal("0")


def _audit_title(status: str) -> str:
    if status == "APPROVED":
        return "Auditoria em campo aprovada"
    if status == "BLOCKED":
        return "Projeto bloqueado por auditoria"
    return "Recálculo solicitado pelo auditor"
