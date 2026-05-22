from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.session import get_session
from backend_app.modules.treasury.service import TreasuryService

router = APIRouter(tags=["treasury"])


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
