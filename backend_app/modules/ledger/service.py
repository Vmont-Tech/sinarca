from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import LedgerAccount, LedgerEntry, Organization, Profile


class LedgerService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create_account(self, owner_external_id: str) -> LedgerAccount:
        owner_profile = await self._profile(owner_external_id)
        owner_org = await self._organization(owner_external_id)
        if owner_org is None and owner_profile is not None and owner_profile.organization_id is not None:
            owner_org = await self.session.get(Organization, owner_profile.organization_id)

        if owner_org is None and owner_profile is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Comprador {owner_external_id} não encontrado")

        external_id = f"ledger-{owner_external_id}"
        result = await self.session.execute(select(LedgerAccount).where(LedgerAccount.external_id == external_id))
        account = result.scalar_one_or_none()
        if account is not None:
            return account

        account = LedgerAccount(
            external_id=external_id,
            owner_profile_id=owner_profile.id if owner_profile else None,
            owner_organization_id=owner_org.id if owner_org else None,
            account_type="COMPANY_CREDIT_WALLET",
            currency="tCO2e",
            balance=Decimal("0"),
            metadata_={"owner_external_id": owner_external_id},
        )
        self.session.add(account)
        await self.session.flush()
        return account

    async def credit_account(
        self,
        account: LedgerAccount,
        amount: Decimal,
        *,
        idempotency_key: str,
        project_id: Any | None = None,
        purchase_id: Any | None = None,
        counterparty: str | None = None,
        metadata: dict[str, Any] | None = None,
        entry_type: str = "PURCHASE",
    ) -> LedgerEntry:
        existing = await self._entry_by_idempotency(idempotency_key)
        if existing is not None:
            return existing
        account.balance += amount
        entry = LedgerEntry(
            account_id=account.id,
            entry_type=entry_type,
            amount=amount,
            unit="tCO2e",
            project_id=project_id,
            purchase_id=purchase_id,
            idempotency_key=idempotency_key,
            counterparty=counterparty,
            metadata_=metadata or {},
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def debit_account(
        self,
        account: LedgerAccount,
        amount: Decimal,
        *,
        idempotency_key: str,
        project_id: Any | None = None,
        retirement_id: Any | None = None,
        counterparty: str | None = None,
        metadata: dict[str, Any] | None = None,
        entry_type: str = "RETIREMENT",
    ) -> LedgerEntry:
        existing = await self._entry_by_idempotency(idempotency_key)
        if existing is not None:
            return existing
        if account.balance < amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Saldo ledger insuficiente para compensação")
        account.balance -= amount
        entry = LedgerEntry(
            account_id=account.id,
            entry_type=entry_type,
            amount=-amount,
            unit="tCO2e",
            project_id=project_id,
            retirement_id=retirement_id,
            idempotency_key=idempotency_key,
            counterparty=counterparty,
            metadata_=metadata or {},
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def reserve_credit(self, account: LedgerAccount, amount: Decimal, *, idempotency_key: str, **metadata: Any) -> LedgerEntry:
        return await self.debit_account(account, amount, idempotency_key=idempotency_key, metadata=metadata, entry_type="RESERVE")

    async def release_reservation(self, account: LedgerAccount, amount: Decimal, *, idempotency_key: str, **metadata: Any) -> LedgerEntry:
        return await self.credit_account(account, amount, idempotency_key=idempotency_key, metadata=metadata, entry_type="ADJUSTMENT")

    async def retire_credit(
        self,
        account: LedgerAccount,
        amount: Decimal,
        *,
        idempotency_key: str,
        project_id: Any | None = None,
        retirement_id: Any | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> LedgerEntry:
        return await self.debit_account(
            account,
            amount,
            idempotency_key=idempotency_key,
            project_id=project_id,
            retirement_id=retirement_id,
            counterparty="Aposentadoria",
            metadata=metadata,
            entry_type="RETIREMENT",
        )

    async def _entry_by_idempotency(self, idempotency_key: str) -> LedgerEntry | None:
        result = await self.session.execute(select(LedgerEntry).where(LedgerEntry.idempotency_key == idempotency_key))
        return result.scalar_one_or_none()

    async def _profile(self, external_id: str) -> Profile | None:
        result = await self.session.execute(select(Profile).where(Profile.external_id == external_id))
        return result.scalar_one_or_none()

    async def _organization(self, external_id: str) -> Organization | None:
        result = await self.session.execute(select(Organization).where(Organization.external_id == external_id))
        return result.scalar_one_or_none()

