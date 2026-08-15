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
from backend_app.db.models import (
    AuditEvent,
    Certification,
    CertificationPendency,
    Document,
    EnvironmentalCredit,
    Project,
    ProjectBaseline,
    ProjectTag,
    TreasuryAuthorization,
)
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.projects.schemas import CertifierReviewResponse, QueueResponse
from backend_app.modules.projects.service import (
    ProjectsService,
    baseline_item,
    certification_item,
    document_item,
    tag_item,
)

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


@router.get("/certifier/projects/{project_id}/review", response_model=CertifierReviewResponse)
async def certifier_project_review(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> CertifierReviewResponse:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)

    baseline = (
        await session.execute(
            select(ProjectBaseline)
            .where(ProjectBaseline.project_id == project.id)
            .order_by(ProjectBaseline.captured_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    tags = (
        await session.execute(
            select(ProjectTag).where(ProjectTag.project_id == project.id).order_by(ProjectTag.vertex_label)
        )
    ).scalars().all()
    documents = (
        await session.execute(
            select(Document).where(Document.project_id == project.id).order_by(Document.uploaded_at.desc())
        )
    ).scalars().all()
    certifications = (
        await session.execute(
            select(Certification).where(Certification.project_id == project.id).order_by(Certification.created_at.desc())
        )
    ).scalars().all()
    pendencies = (
        await session.execute(
            select(CertificationPendency)
            .where(CertificationPendency.project_id == project.id)
            .order_by(CertificationPendency.created_at.desc())
        )
    ).scalars().all()
    treasury_authorization = (
        await session.execute(
            select(TreasuryAuthorization)
            .where(TreasuryAuthorization.project_id == project.id)
            .order_by(TreasuryAuthorization.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    dossier = await service.certification_dossier_status(project)
    calculation = await service.suggested_credit_potential(project)
    certificate = await service.certification_certificate(project)

    already_opened = (
        await session.execute(
            select(AuditEvent.id).where(
                AuditEvent.entity_type == "projects",
                AuditEvent.entity_id == project.id,
                AuditEvent.action == "CERTIFICATION_REVIEW_OPENED",
                AuditEvent.metadata_["actor_external_id"].astext == current_user.id,
            ).limit(1)
        )
    ).scalar_one_or_none()
    if already_opened is None:
        await create_audit_event(
            session,
            action="CERTIFICATION_REVIEW_OPENED",
            entity_type="projects",
            entity_id=project.id,
            actor_role=current_user.role,
            metadata={"actor_external_id": current_user.id, "friendly_id": project.friendly_id},
        )
        await session.commit()

    return CertifierReviewResponse(
        project=await service.project_to_mrca(project),
        baseline=baseline_item(baseline),
        tags=[tag_item(t) for t in tags],
        documents=[document_item(d) for d in documents],
        dossier=dossier,
        calculation=calculation,
        certifications=[certification_item(c) for c in certifications],
        pendencies=[pendency_item(p) for p in pendencies],
        treasuryAuthorization=treasury_authorization_item(treasury_authorization) if treasury_authorization is not None else None,
        certificate=certificate,
    )


def pendency_item(pendency: CertificationPendency) -> dict[str, object]:
    return {
        "id": str(pendency.id),
        "category": pendency.category,
        "description": pendency.description,
        "status": pendency.status,
        "producerResponse": pendency.producer_response,
        "respondedAt": pendency.responded_at.isoformat() if pendency.responded_at else None,
        "resolvedAt": pendency.resolved_at.isoformat() if pendency.resolved_at else None,
        "createdAt": pendency.created_at.isoformat(),
        "metadata": pendency.metadata_ or {},
    }


def treasury_authorization_item(authorization: TreasuryAuthorization) -> dict[str, object]:
    return {
        "id": str(authorization.id),
        "projectId": str(authorization.project_id),
        "certificationId": str(authorization.certification_id),
        "methodology": authorization.methodology,
        "approvedCreditPotential": float(authorization.approved_credit_potential),
        "certificateSha256": authorization.certificate_sha256,
        "status": authorization.status,
        "authorizedAt": authorization.authorized_at.isoformat(),
        "metadata": authorization.metadata_ or {},
    }


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

