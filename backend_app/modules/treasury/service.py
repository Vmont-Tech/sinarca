from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.liquidity import ISinarcaLiquidity
from backend_app.adapters.stellar import SorobanCreditAdapter
from backend_app.db.models import ChainEvent, Project, TreasuryPosition, YieldDistribution

OPERATIONAL_YIELD_SHARE = Decimal("0.90")
SOCIAL_VAULT_YIELD_SHARE = Decimal("0.10")


class TreasuryService:
    def __init__(self, session: AsyncSession | None = None) -> None:
        self.session = session

    async def confirm_collateral_and_mint(
        self,
        project_id: str,
        amount_brl: float,
        credit_amount: float,
        pix_reference: str,
        liquidity_adapter: ISinarcaLiquidity,
        soroban_adapter: SorobanCreditAdapter,
    ) -> dict[str, Any]:
        collateral = liquidity_adapter.confirm_collateral(project_id, amount_brl, pix_reference)
        if collateral.get("status") != "CONFIRMED":
            raise RuntimeError("Lastro financeiro não confirmado")

        mint = soroban_adapter.mint_locked(
            project_id=project_id,
            producer=str(collateral.get("producer", "SINARCA")),
            certifier=str(collateral.get("certifier", "SINARCA_CERTIFIER")),
            baseline_hash=str(collateral.get("baseline_hash", "0" * 64)),
            amount=credit_amount,
            initial_owner=str(collateral.get("initial_owner", "SINARCA_TREASURY")),
        )

        if self.session is not None:
            await self._persist_collateral_and_mint(project_id, amount_brl, collateral, mint)

        return {
            "success": True,
            "project_id": project_id,
            "collateral": collateral,
            "mint": mint,
        }

    async def harvest_and_distribute_yield(self, treasury_position_id: str, gross_yield_brl: float) -> dict[str, Any]:
        gross = _money(gross_yield_brl)
        operational_brl = _money(gross * OPERATIONAL_YIELD_SHARE)
        social_vault_brl = _money(gross * SOCIAL_VAULT_YIELD_SHARE)
        distribution = {
            "treasury_position_id": treasury_position_id,
            "gross_yield_brl": float(gross),
            "operational_brl": float(operational_brl),
            "social_vault_brl": float(social_vault_brl),
            "social_destination": "SocialImpactVault",
            "status": "BOOKED",
        }

        if self.session is not None:
            await self._persist_yield_distribution(treasury_position_id, gross, operational_brl, social_vault_brl)

        return distribution

    async def _persist_collateral_and_mint(
        self,
        project_id: str,
        amount_brl: float,
        collateral: dict[str, Any],
        mint: dict[str, Any],
    ) -> None:
        assert self.session is not None
        project = await _resolve_project(self.session, project_id)
        position = TreasuryPosition(
            project_id=project.id,
            provider=str(collateral.get("provider", "etherfuse")),
            principal_brl=_money(amount_brl),
            instrument=str(collateral.get("instrument", "Tesouro Direto")),
            external_reference=str(collateral.get("external_reference") or collateral.get("pix_reference") or uuid.uuid4()),
            status="CONFIRMED",
            opened_at=datetime.now(timezone.utc),
            metadata_={"collateral": collateral},
        )
        self.session.add(position)
        event = ChainEvent(
            project_id=project.id,
            event_type="MINT_LOCKED",
            chain="soroban",
            transaction_hash=mint.get("hash"),
            amount=_money(mint.get("payload", {}).get("amount", 0)),
            status="RECORDED",
            payload={"collateral": collateral, "mint": mint},
        )
        self.session.add(event)
        await self.session.commit()

    async def _persist_yield_distribution(
        self,
        treasury_position_id: str,
        gross: Decimal,
        operational_brl: Decimal,
        social_vault_brl: Decimal,
    ) -> None:
        assert self.session is not None
        distribution = YieldDistribution(
            treasury_position_id=uuid.UUID(str(treasury_position_id)),
            gross_yield_brl=gross,
            operational_brl=operational_brl,
            social_vault_brl=social_vault_brl,
            distribution_month=date.today().replace(day=1),
            status="BOOKED",
        )
        self.session.add(distribution)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Yield já distribuído para este mês") from exc


async def _resolve_project(session: AsyncSession, project_id: str) -> Project:
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


def _money(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
