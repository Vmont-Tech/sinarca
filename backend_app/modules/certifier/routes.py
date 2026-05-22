from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import Certification, EnvironmentalCredit, Project
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.projects.schemas import QueueResponse
from backend_app.modules.projects.service import ProjectsService

router = APIRouter(tags=["certifier"])


class CertifierDecisionRequest(BaseModel):
    decision: Literal["APPROVE", "REJECT", "REQUEST_CHANGES"]
    credit_potential: float | None = Field(default=None, gt=0)
    certifier_id: str | None = None
    notes: str = ""


@router.get("/certifier/queue", response_model=QueueResponse)
async def certifier_queue(
    _: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> QueueResponse:
    service = ProjectsService(session)
    statement = (
        select(Project)
        .where(Project.status.in_(["CREATED", "REGISTERED", "AWAITING_CERTIFICATION"]))
        .order_by(Project.created_at.asc())
    )
    projects = [await service.project_to_mrca(project) for project in (await session.execute(statement)).scalars().all()]
    return QueueResponse(total=len(projects), projects=projects)


@router.patch("/certifier/projects/{project_id}/decision")
async def decide_project(
    project_id: str,
    payload: CertifierDecisionRequest,
    current_user: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    decision: str = payload.decision
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    previous_status = project.status

    if decision == "APPROVE":
        credit_potential = Decimal(str(payload.credit_potential or project.carbon_stock))
        project.status = "AWAITING_AUDIT"
        certification = await _get_or_create_certification(session, project, decision)
        certification.credit_potential = credit_potential
        certification.notes = payload.notes
        certification.signed_document_hash = "sha256-" + hashlib.sha256(f"{project.friendly_id}:{decision}".encode()).hexdigest()
        certification.signed_at = datetime.now(timezone.utc)
        await _ensure_locked_credit(session, project, credit_potential)
    elif decision == "REJECT":
        credit_potential = Decimal("0")
        project.status = "SUSPENDED"
        certification = await _get_or_create_certification(session, project, decision)
        certification.credit_potential = credit_potential
        certification.notes = payload.notes
    else:
        credit_potential = Decimal("0")
        project.status = "REGISTERED"
        certification = await _get_or_create_certification(session, project, decision)
        certification.credit_potential = credit_potential
        certification.notes = payload.notes

    project.timeline = [
        *(project.timeline or []),
        {
            "title": _decision_title(decision),
            "date": datetime.now(timezone.utc).date().isoformat(),
            "status": "completed" if decision == "APPROVE" else "active",
            "desc": payload.notes or "Decisão registrada pela certificadora.",
        },
    ]
    await create_audit_event(
        session,
        action=f"CERTIFIER_{decision}",
        entity_type="projects",
        entity_id=project.id,
        actor_role=current_user.role,
        before_data={"status": previous_status},
        after_data={"status": project.status, "credit_potential": float(credit_potential)},
        metadata={"actor_external_id": current_user.id},
    )
    await session.commit()
    return {
        "success": True,
        "project_id": project.friendly_id,
        "new_status": project.status,
        "decision": decision,
        "credit_potential": float(credit_potential),
    }


async def _get_or_create_certification(session: AsyncSession, project: Project, decision: str) -> Certification:
    result = await session.execute(
        select(Certification).where(Certification.project_id == project.id, Certification.decision == decision)
    )
    certification = result.scalar_one_or_none()
    if certification is not None:
        return certification
    certification = Certification(
        project_id=project.id,
        certifier_organization_id=project.certifier_organization_id,
        methodology=project.methodology,
        credit_potential=Decimal("0"),
        decision=decision,
    )
    session.add(certification)
    await session.flush()
    return certification


async def _ensure_locked_credit(session: AsyncSession, project: Project, amount: Decimal) -> EnvironmentalCredit:
    result = await session.execute(
        select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id, EnvironmentalCredit.vintage == project.vintage)
    )
    credit = result.scalar_one_or_none()
    if credit is None:
        credit = EnvironmentalCredit(
            project_id=project.id,
            vintage=project.vintage,
            quantity_total=amount,
            quantity_available=Decimal("0"),
            status="LOCKED",
            token_metadata={"source": "certifier_decision", "project": project.friendly_id},
            serial_start=project.serial_start,
            serial_end=project.serial_end,
        )
        session.add(credit)
    else:
        credit.quantity_total = amount
        credit.status = "LOCKED"
        credit.token_metadata = {**(credit.token_metadata or {}), "source": "certifier_decision"}
    await session.flush()
    return credit


def _decision_title(decision: str) -> str:
    if decision == "APPROVE":
        return "Certificação aprovada - aguardando auditoria"
    if decision == "REJECT":
        return "Certificação rejeitada"
    return "Ajustes solicitados pela certificadora"

