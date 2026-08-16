from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import (
    AuditEvent,
    Certification,
    CertificationPendency,
    Document,
    Project,
    ProjectBaseline,
    ProjectTag,
    TreasuryAuthorization,
)
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.certifier.service import CertifierService
from backend_app.modules.projects.schemas import CertifierQueueResponse, CertifierReviewResponse
from backend_app.modules.projects.service import (
    ProjectsService,
    baseline_item,
    certification_item,
    document_item,
    tag_item,
)

router = APIRouter(tags=["certifier"])

# Status elegíveis para a fila da certificadora, independentemente do escopo.
CERTIFIER_QUEUE_STATUSES = ("CREATED", "REGISTERED", "AWAITING_CERTIFICATION")


def _open_pendency_exists():
    """Subquery EXISTS: projeto tem ao menos uma CertificationPendency com status OPEN.

    A separação de filas é derivada de `certification_pendencies.status = 'OPEN'`, não de um
    valor novo em `project_status`. Adicionar um valor ao enum obrigaria a tocar
    `PROJECT_STATUS_TO_LIFECYCLE_CODE`, `MARKETPLACE_READY_PROJECT_STATUSES`,
    `PROJECT_STATUS_PRESENTATION` e as policies de RLS, com risco desproporcional ao ganho.
    """
    return (
        select(CertificationPendency.id)
        .where(
            CertificationPendency.project_id == Project.id,
            CertificationPendency.status == "OPEN",
        )
        .exists()
    )


@router.get("/certifier/queue", response_model=CertifierQueueResponse)
async def certifier_queue(
    scope: Literal["main", "corrections"] = Query(default="main"),
    _: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> CertifierQueueResponse:
    service = ProjectsService(session)
    base = select(Project).where(Project.status.in_(CERTIFIER_QUEUE_STATUSES))
    has_open = _open_pendency_exists()

    statement = base.where(has_open if scope == "corrections" else ~has_open).order_by(Project.created_at.asc())
    projects = [await service.project_to_mrca(project) for project in (await session.execute(statement)).scalars().all()]

    main_count = (
        await session.execute(
            select(func.count()).select_from(Project).where(Project.status.in_(CERTIFIER_QUEUE_STATUSES), ~has_open)
        )
    ).scalar_one()
    corrections_count = (
        await session.execute(
            select(func.count()).select_from(Project).where(Project.status.in_(CERTIFIER_QUEUE_STATUSES), has_open)
        )
    ).scalar_one()

    return CertifierQueueResponse(
        total=len(projects),
        items=projects,
        projects=projects,
        scope=scope,
        counts={"main": int(main_count), "corrections": int(corrections_count)},
    )


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
        boundary=await service.boundary_item(str(project.id)),
        tags=[tag_item(t) for t in tags],
        documents=[document_item(d) for d in documents],
        dossier=dossier,
        calculation=calculation,
        certifications=[certification_item(c) for c in certifications],
        pendencies=[pendency_item(p) for p in pendencies],
        treasuryAuthorization=treasury_authorization_item(treasury_authorization) if treasury_authorization is not None else None,
        certificate=certificate,
    )


@router.get("/certifier/projects/{project_id}/history")
async def certifier_project_history(
    project_id: str,
    event_type: str | None = Query(default=None),
    actor_role: str | None = Query(default=None),
    _: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, object]]:
    """Linha do tempo de certificação do projeto, em ordem cronológica crescente.

    Filtros opcionais `event_type` (compara com `action`) e `actor_role` (delegado para
    `ProjectsService.certification_history`, já suportado desde o plano 04-02).

    NOTA (desvio documentado no 04-05-SUMMARY.md): o formato de resposta permanece uma
    lista JSON no nível raiz — não o envelope `CertificationHistoryResponse` com
    `availableEventTypes`/`availableActorRoles` descrito na prosa do plano 04-05 — porque
    esta rota é consumida por `tests/test_certifier_workbench.py` (contrato imutável criado
    no plano 04-01, Wave 0) via `for item in history_response.json()`, o que quebraria se a
    raiz virasse um objeto. O frontend pode derivar os tipos/atores disponíveis a partir da
    própria lista (chamada sem filtro), sem necessidade de um campo adicional no servidor.
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    events = await service.certification_history(
        project,
        actor_role=actor_role.strip().lower() if actor_role else None,
    )
    if event_type:
        normalized_event_type = event_type.strip().upper()
        events = [event for event in events if event["action"] == normalized_event_type]
    return events


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
    decision: Literal["APPROVE", "REJECT", "REQUEST_CHANGES"] = Form(...),
    methodology: str | None = Form(default=None),
    credit_potential: float | None = Form(default=None),
    credit_potential_adjustment_reason: str | None = Form(default=None),
    notes: str = Form(default=""),
    rejection_category: str | None = Form(default=None),
    certificate: UploadFile | None = File(default=None),
    current_user: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    return await CertifierService(session).record_decision(
        project_id,
        decision=decision,
        methodology=methodology,
        credit_potential=credit_potential,
        credit_potential_adjustment_reason=credit_potential_adjustment_reason,
        notes=notes,
        rejection_category=rejection_category,
        certificate=certificate,
        actor=current_user,
    )

