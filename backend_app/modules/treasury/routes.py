from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import AuditEvent, Organization, Project, TreasuryAuthorization
from backend_app.db.session import get_session
from backend_app.modules.treasury.service import TreasuryService

router = APIRouter(tags=["treasury"])

TREASURY_AUDIT_TRAIL_ACTIONS = (
    "CERTIFICATION_APPROVED",
    "CERTIFICATION_CERTIFICATE_ATTACHED",
    "MINT_AUTHORIZED",
    "TREASURY_QUEUE_CREATED",
)


class TreasuryHarvestRequest(BaseModel):
    treasury_position_id: str
    gross_yield_brl: float = Field(gt=0)


@router.post("/treasury/harvest")
async def harvest_treasury_yield(
    payload: TreasuryHarvestRequest,
    _: AuthenticatedUser = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    distribution = await TreasuryService(session).harvest_and_distribute_yield(
        payload.treasury_position_id,
        payload.gross_yield_brl,
    )
    return {"success": True, "distribution": distribution}


@router.get("/treasury/authorizations")
async def list_treasury_authorizations(
    status_filter: str | None = Query(default=None, alias="status"),
    _: AuthenticatedUser = Depends(require_role("admin", "certifier")),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    """Fila somente leitura da tesouraria (D-15/D-16): nenhum adapter/provider é chamado aqui,
    a execução do mint bloqueado é responsabilidade da Phase 08."""
    statement = (
        select(TreasuryAuthorization, Project, Organization)
        .join(Project, Project.id == TreasuryAuthorization.project_id)
        .outerjoin(Organization, Organization.id == TreasuryAuthorization.certifier_organization_id)
        .order_by(TreasuryAuthorization.created_at.desc())
    )
    if status_filter:
        statement = statement.where(TreasuryAuthorization.status == status_filter.upper())

    rows = (await session.execute(statement)).all()
    project_ids = [project.id for _authorization, project, _organization in rows]

    trail_by_project: dict[Any, list[AuditEvent]] = {}
    if project_ids:
        trail_statement = (
            select(AuditEvent)
            .where(
                AuditEvent.entity_type == "projects",
                AuditEvent.entity_id.in_(project_ids),
                AuditEvent.action.in_(TREASURY_AUDIT_TRAIL_ACTIONS),
            )
            .order_by(AuditEvent.created_at.asc())
        )
        for event in (await session.execute(trail_statement)).scalars().all():
            trail_by_project.setdefault(event.entity_id, []).append(event)

    return [
        {
            "id": str(authorization.id),
            "projectId": project.friendly_id,
            "projectName": project.name,
            "certificationId": str(authorization.certification_id),
            "certifierOrganization": organization.name if organization is not None else None,
            "methodology": authorization.methodology,
            "approvedCreditPotential": float(authorization.approved_credit_potential),
            "certificate": {
                "documentId": (
                    str(authorization.certificate_document_id) if authorization.certificate_document_id else None
                ),
                "sha256": authorization.certificate_sha256,
                "storagePath": (authorization.metadata_ or {}).get("certificate_storage_path"),
            },
            "status": authorization.status,
            "authorizedAt": authorization.authorized_at.isoformat(),
            "createdAt": authorization.created_at.isoformat(),
            "auditTrail": [
                {
                    "id": str(event.id),
                    "action": event.action,
                    "actorRole": event.actor_role,
                    "createdAt": event.created_at.isoformat(),
                }
                for event in trail_by_project.get(project.id, [])
            ],
            "metadata": authorization.metadata_ or {},
        }
        for authorization, project, organization in rows
    ]
