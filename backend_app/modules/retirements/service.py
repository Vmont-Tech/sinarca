from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import ChainEvent, Retirement


class RetirementService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_retirement(
        self,
        *,
        project_id,
        owner_profile_id=None,
        owner_organization_id=None,
        amount: Decimal,
        emissions_data: dict[str, Any],
        idempotency_key: str,
        projects_supported: int,
    ) -> tuple[Retirement, dict[str, Any], ChainEvent]:
        digest = hashlib.sha256(f"{project_id}:{amount}:{idempotency_key}".encode()).hexdigest()
        burn_hash = "burn-" + digest[:32]
        retirement = Retirement(
            project_id=project_id,
            owner_profile_id=owner_profile_id,
            owner_organization_id=owner_organization_id,
            amount=amount,
            emissions_data=emissions_data,
            certificate_hash=f"certificate-{digest}",
            burn_hash=burn_hash,
            documentation_uri=f"https://sinarca.com.br/certificates/{digest[:16]}.pdf",
            status="COMPLETED",
            idempotency_key=idempotency_key,
            retired_at=datetime.now(timezone.utc),
        )
        self.session.add(retirement)
        await self.session.flush()

        event = ChainEvent(
            project_id=project_id,
            event_type="BURN",
            chain="soroban",
            transaction_hash=burn_hash,
            source_tx_hash=idempotency_key,
            amount=amount,
            status="RECORDED",
            payload={"mode": "OFFCHAIN_LEDGER_RETIREMENT", "adapter": "offchain_burn"},
        )
        self.session.add(event)
        await self.session.flush()

        certificate = {
            "id": str(retirement.id),
            "emissionsCompensated": float(amount),
            "projectsSupported": projects_supported,
            "certificateUrl": retirement.documentation_uri,
            "blockchainHash": burn_hash,
            "createdAt": retirement.retired_at.isoformat() if retirement.retired_at else datetime.now(timezone.utc).isoformat(),
        }
        return retirement, certificate, event
