from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.polygon import PolygonVaultAdapter
from backend_app.adapters.stellar import StellarReserveSponsor
from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import ChainEvent, ExternalChainProject, Project
from backend_app.db.session import get_session

router = APIRouter(tags=["blockchain"])


class LockAndMintRequest(BaseModel):
    project_id: str | None = None
    chain: str = "polygon"
    vault_address: str
    source_token_address: str
    source_tx_hash: str
    amount: float = Field(gt=0)
    wrapped_stellar_asset: str


@router.get("/stellar/status")
async def stellar_status() -> dict[str, Any]:
    return {"success": True, "stellar": StellarReserveSponsor().status()}


@router.post("/blockchain/external-projects/lock-and-mint")
async def lock_and_mint_external_project(
    payload: LockAndMintRequest,
    current_user: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    existing = await session.execute(
        select(ExternalChainProject).where(ExternalChainProject.source_tx_hash == payload.source_tx_hash).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="source_tx_hash já processado")

    project = await _resolve_project(session, payload.project_id) if payload.project_id else None
    adapter = PolygonVaultAdapter()
    try:
        lock = adapter.validate_lock_event(
            chain=payload.chain,
            vault_address=payload.vault_address,
            source_token_address=payload.source_token_address,
            source_tx_hash=payload.source_tx_hash,
            amount=payload.amount,
        )
        wrapped = adapter.request_wrapped_mint(
            project_id=payload.project_id or payload.source_tx_hash,
            wrapped_stellar_asset=payload.wrapped_stellar_asset,
            amount=payload.amount,
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    external_project = ExternalChainProject(
        project_id=project.id if project else None,
        chain="polygon",
        vault_address=payload.vault_address,
        source_token_address=payload.source_token_address,
        source_tx_hash=payload.source_tx_hash,
        wrapped_stellar_asset=payload.wrapped_stellar_asset,
        status="WRAPPED_MINT_REQUESTED",
        metadata_={"lock": lock, "wrapped_mint": wrapped, "actor_role": current_user.role},
    )
    session.add(external_project)
    session.add(
        ChainEvent(
            project_id=project.id if project else None,
            event_type="WRAPPED_MINT",
            chain="polygon",
            transaction_hash=wrapped.get("hash"),
            source_tx_hash=payload.source_tx_hash,
            amount=payload.amount,
            status="RECORDED",
            payload={"lock": lock, "wrapped_mint": wrapped},
        )
    )
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="source_tx_hash já processado") from exc

    return {
        "success": True,
        "external_project_id": str(external_project.id),
        "status": external_project.status,
        "lock": lock,
        "wrapped_mint": wrapped,
    }


async def _resolve_project(session: AsyncSession, project_id: str | None) -> Project | None:
    if not project_id:
        return None
    filters = [Project.friendly_id == project_id, Project.source_hash == project_id]
    try:
        filters.append(Project.id == uuid.UUID(project_id))
    except ValueError:
        pass
    result = await session.execute(select(Project).where(or_(*filters)).limit(1))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")
    return project
