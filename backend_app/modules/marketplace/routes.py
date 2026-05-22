from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.session import get_session
from backend_app.modules.marketplace.service import MarketplaceService

router = APIRouter(tags=["marketplace"])


class BuyRequest(BaseModel):
    project_id: str
    buyer_id: str = "comp-001"
    quantidade: float = Field(gt=0)
    unit_price_brl: float = Field(gt=0)
    idempotency_key: str | None = None


class CreditToUse(BaseModel):
    project_id: str
    amount: float = Field(gt=0)


class EmissionsData(BaseModel):
    scope1: float = 0
    scope2: float = 0
    scope3: float = 0
    total: float = Field(gt=0)


class CompensateRequest(BaseModel):
    buyer_id: str = "comp-001"
    emissions_data: EmissionsData
    credits_to_use: list[CreditToUse]
    idempotency_key: str | None = None


@router.get("/marketplace")
async def marketplace(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    credits = await MarketplaceService(session).list_marketplace()
    return {"success": True, "credits": credits, "total": len(credits)}


@router.post("/marketplace/buy")
async def buy_credit(
    payload: BuyRequest,
    current_user: AuthenticatedUser = Depends(require_role("company", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    transaction = await MarketplaceService(session).buy(payload.model_dump(), actor_role=current_user.role)
    return {"success": True, "message": "Compra registrada", "transaction": transaction}


@router.post("/marketplace/compensate")
async def compensate_credit(
    payload: CompensateRequest,
    current_user: AuthenticatedUser = Depends(require_role("company", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    certificate = await MarketplaceService(session).compensate(payload.model_dump(), actor_role=current_user.role)
    return {"success": True, "message": "Compensação realizada com sucesso", "certificate": certificate}


@router.get("/transactions")
async def list_transactions(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    transactions = await MarketplaceService(session).transactions(authorization)
    return {"success": True, "transactions": transactions}

