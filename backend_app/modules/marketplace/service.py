from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.security import decode_token
from backend_app.db.models import ChainEvent, EnvironmentalCredit, LedgerAccount, LedgerEntry, Organization, Profile, Project, Purchase, Retirement
from backend_app.db.repositories import create_audit_event
from backend_app.modules.ledger.service import LedgerService
from backend_app.modules.projects.service import MARKETPLACE_READY_PROJECT_STATUSES, ProjectsService
from backend_app.modules.retirements.service import RetirementService


class MarketplaceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_marketplace(self) -> list[dict[str, Any]]:
        project_service = ProjectsService(self.session)
        statement = (
            select(Project)
            .join(EnvironmentalCredit, EnvironmentalCredit.project_id == Project.id)
            .where(
                Project.public_marketplace.is_(True),
                Project.status.in_(MARKETPLACE_READY_PROJECT_STATUSES),
                EnvironmentalCredit.status == "AVAILABLE",
                EnvironmentalCredit.quantity_available > 0,
            )
            .order_by(Project.blockchain_timestamp.desc().nullslast(), Project.created_at.desc())
        )
        projects = []
        for project in (await self.session.execute(statement)).scalars().unique().all():
            dto = await project_service.project_to_mrca(project)
            credit = await self._available_credit(project)
            data = dto.model_dump()
            if credit is not None:
                data["metrics"]["carbonStock"] = float(credit.quantity_available)
            projects.append(data)
        return projects

    async def buy(self, payload: dict[str, Any], *, actor_role: str | None = None) -> dict[str, Any]:
        quantidade = Decimal(str(payload["quantidade"]))
        unit_price = Decimal(str(payload["unit_price_brl"]))
        idempotency_key = payload.get("idempotency_key") or f"buy-{uuid.uuid4()}"
        project = await ProjectsService(self.session)._get_project_model(str(payload["project_id"]))
        if not project.public_marketplace or project.status not in MARKETPLACE_READY_PROJECT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Projeto não disponível no marketplace")
        credit = await self._available_credit(project)
        if credit is None or credit.quantity_available < quantidade:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantidade maior que o estoque disponível")

        existing = await self._purchase_by_idempotency(idempotency_key)
        if existing is not None:
            return await self._purchase_transaction(existing, project, idempotency_key)

        buyer_id = str(payload.get("buyer_id") or "comp-001")
        buyer_profile = await self._profile(buyer_id)
        buyer_org = await self._organization(buyer_id)
        ledger = LedgerService(self.session)
        account = await ledger.get_or_create_account(buyer_id)

        total_value = quantidade * unit_price
        purchase = Purchase(
            project_id=project.id,
            buyer_profile_id=buyer_profile.id if buyer_profile else None,
            buyer_organization_id=buyer_org.id if buyer_org else getattr(account, "owner_organization_id", None),
            credit_id=credit.id,
            quantidade=quantidade,
            unit_price_brl=unit_price,
            total_value_brl=total_value,
            platform_fee_brl=total_value * Decimal("0.045"),
            receipt_hash="receipt-" + hashlib.sha256(idempotency_key.encode()).hexdigest()[:24],
            status="SETTLED",
            idempotency_key=idempotency_key,
            settled_at=datetime.now(timezone.utc),
        )
        self.session.add(purchase)
        credit.quantity_available -= quantidade
        await self.session.flush()

        tx_hash = "offchain-" + hashlib.sha256(f"{project.friendly_id}:{idempotency_key}".encode()).hexdigest()[:32]
        chain_event = ChainEvent(
            project_id=project.id,
            event_type="TRANSFER",
            chain="soroban",
            transaction_hash=tx_hash,
            source_tx_hash=idempotency_key,
            amount=quantidade,
            status="RECORDED",
            payload={"mode": "OFFCHAIN_LEDGER_PURCHASE", "buyer_id": buyer_id},
        )
        self.session.add(chain_event)
        await self.session.flush()

        entry = await ledger.credit_account(
            account,
            quantidade,
            idempotency_key=idempotency_key,
            project_id=project.id,
            purchase_id=purchase.id,
            counterparty=project.name,
            metadata={"asset": project.name, "hash": tx_hash, "mode": "OFFCHAIN_LEDGER_PURCHASE"},
            entry_type="PURCHASE",
        )
        entry.chain_event_id = chain_event.id

        await create_audit_event(
            self.session,
            action="MARKETPLACE_BUY",
            entity_type="purchases",
            entity_id=purchase.id,
            actor_role=actor_role,
            after_data={"project_id": project.friendly_id, "quantidade": float(quantidade), "buyer_id": buyer_id},
        )
        await self.session.commit()
        return await self._purchase_transaction(purchase, project, idempotency_key, tx_hash=tx_hash)

    async def compensate(self, payload: dict[str, Any], *, actor_role: str | None = None) -> dict[str, Any]:
        buyer_id = str(payload.get("buyer_id") or "comp-001")
        idempotency_key = payload.get("idempotency_key") or f"retire-{uuid.uuid4()}"
        credits_to_use = payload.get("credits_to_use") or []
        if not credits_to_use:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe créditos para compensar")

        total_amount = sum(Decimal(str(item["amount"])) for item in credits_to_use)
        emissions_total = Decimal(str((payload.get("emissions_data") or {}).get("total", total_amount)))
        if total_amount < emissions_total:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Créditos insuficientes para emissões declaradas")

        ledger = LedgerService(self.session)
        account = await ledger.get_or_create_account(buyer_id)
        first_project = await ProjectsService(self.session)._get_project_model(str(credits_to_use[0]["project_id"]))
        buyer_profile = await self._profile(buyer_id)
        buyer_org = await self._organization(buyer_id)
        retirement, certificate, event = await RetirementService(self.session).create_retirement(
            project_id=first_project.id,
            owner_profile_id=buyer_profile.id if buyer_profile else None,
            owner_organization_id=buyer_org.id if buyer_org else getattr(account, "owner_organization_id", None),
            amount=emissions_total,
            emissions_data=payload.get("emissions_data") or {},
            idempotency_key=idempotency_key,
            projects_supported=len(credits_to_use),
        )
        entry = await ledger.retire_credit(
            account,
            emissions_total,
            idempotency_key=f"ledger-{idempotency_key}",
            project_id=first_project.id,
            retirement_id=retirement.id,
            metadata={"asset": first_project.name, "hash": certificate["blockchainHash"], "certificate": certificate["id"]},
        )
        entry.chain_event_id = event.id
        await self._increment_retired_credits(credits_to_use)
        await create_audit_event(
            self.session,
            action="MARKETPLACE_COMPENSATE",
            entity_type="retirements",
            entity_id=retirement.id,
            actor_role=actor_role,
            after_data={"buyer_id": buyer_id, "amount": float(emissions_total)},
        )
        await self.session.commit()
        return certificate

    async def transactions(
        self,
        authorization: str | None,
        *,
        project_id: str | None = None,
        hash_filter: str | None = None,
        type_filter: str | None = None,
        buyer: str | None = None,
        status_filter: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        user_scope = await self._transaction_scope(authorization)
        statement = select(LedgerEntry, LedgerAccount, Project, ChainEvent).join(LedgerAccount, LedgerAccount.id == LedgerEntry.account_id)
        statement = statement.outerjoin(Project, Project.id == LedgerEntry.project_id).outerjoin(ChainEvent, ChainEvent.id == LedgerEntry.chain_event_id)
        if project_id:
            filters = [Project.friendly_id == project_id, Project.source_hash == project_id]
            try:
                filters.append(Project.id == uuid.UUID(project_id))
            except ValueError:
                pass
            statement = statement.where(or_(*filters))
        if hash_filter:
            normalized_hash = f"%{hash_filter.strip()}%"
            statement = statement.where(
                or_(
                    LedgerEntry.idempotency_key.ilike(normalized_hash),
                    LedgerEntry.metadata_["hash"].astext.ilike(normalized_hash),
                    ChainEvent.transaction_hash.ilike(normalized_hash),
                    ChainEvent.source_tx_hash.ilike(normalized_hash),
                )
            )
        if type_filter and type_filter.lower() != "all":
            type_values = ledger_entry_types_for_filter(type_filter)
            statement = statement.where(func.upper(cast(LedgerEntry.entry_type, String)).in_(type_values))
        if buyer:
            normalized_buyer = f"%{buyer.strip()}%"
            statement = statement.where(LedgerAccount.external_id.ilike(normalized_buyer))
        if user_scope and user_scope["role"] != "admin":
            account_filters = []
            if user_scope.get("profile_id") is not None:
                account_filters.append(LedgerAccount.owner_profile_id == user_scope["profile_id"])
            if user_scope.get("organization_id") is not None:
                account_filters.append(LedgerAccount.owner_organization_id == user_scope["organization_id"])
            if account_filters:
                statement = statement.where(or_(*account_filters))
        statement = statement.order_by(LedgerEntry.created_at.desc()).limit(limit)
        rows = (await self.session.execute(statement)).all()
        transactions = [format_transaction(entry, account, project, event) for entry, account, project, event in rows]
        if status_filter and status_filter.lower() != "all":
            normalized_status = status_filter.strip().lower()
            transactions = [
                transaction
                for transaction in transactions
                if normalized_status in str(transaction.get("status", "")).lower()
            ]
        return transactions

    async def transaction_detail(self, hash_or_id: str, authorization: str | None) -> dict[str, Any]:
        transactions = await self.transactions(authorization, hash_filter=hash_or_id, limit=1000)
        for transaction in transactions:
            if hash_or_id in {transaction["id"], transaction["hash"]}:
                return transaction
        if transactions:
            return transactions[0]
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")

    async def _available_credit(self, project: Project) -> EnvironmentalCredit | None:
        result = await self.session.execute(
            select(EnvironmentalCredit)
            .where(EnvironmentalCredit.project_id == project.id, EnvironmentalCredit.status == "AVAILABLE")
            .order_by(EnvironmentalCredit.created_at.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _purchase_by_idempotency(self, idempotency_key: str) -> Purchase | None:
        result = await self.session.execute(select(Purchase).where(Purchase.idempotency_key == idempotency_key))
        return result.scalar_one_or_none()

    async def _purchase_transaction(self, purchase: Purchase, project: Project, idempotency_key: str, *, tx_hash: str | None = None) -> dict[str, Any]:
        if tx_hash is None:
            tx_hash = "offchain-" + hashlib.sha256(f"{project.friendly_id}:{idempotency_key}".encode()).hexdigest()[:32]
        return {
            "id": str(purchase.id),
            "project_id": project.source_hash or project.friendly_id,
            "buyer_id": "comp-001",
            "seller_id": project.friendly_id,
            "quantidade": float(purchase.quantidade),
            "totalValue": float(purchase.total_value_brl),
            "unit": "tCO2e",
            "hash_transacao_stellar": tx_hash,
            "stellar_network": "testnet",
            "stellar_mode": "offchain-ledger",
            "ledger_mode": "OFFCHAIN_LEDGER_PURCHASE",
            "tipo_transacao": "PURCHASE",
            "created_at": purchase.created_at.isoformat(),
            "financials": {
                "gross_amount_brl": float(purchase.total_value_brl),
                "merchant_transaction_fee_brl": float(purchase.platform_fee_brl),
                "merchant_transaction_fee_percent": 4.5,
                "net_to_seller_brl": float(purchase.total_value_brl - purchase.platform_fee_brl),
                "issuer_fund_yield_status": "OFFCHAIN_LEDGER",
            },
        }

    async def _increment_retired_credits(self, credits_to_use: list[dict[str, Any]]) -> None:
        for item in credits_to_use:
            project = await ProjectsService(self.session)._get_project_model(str(item["project_id"]))
            amount = Decimal(str(item["amount"]))
            result = await self.session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
            credit = result.scalar_one_or_none()
            if credit is not None:
                credit.quantity_retired += amount

    async def _transaction_scope(self, authorization: str | None) -> dict[str, Any] | None:
        if not authorization:
            return None
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        payload = decode_token(authorization.removeprefix("Bearer ").strip())
        profile = await self._profile(str(payload["sub"]))
        return {
            "role": payload.get("role"),
            "profile_id": profile.id if profile else None,
            "organization_id": profile.organization_id if profile else None,
        }

    async def _profile(self, external_id: str) -> Profile | None:
        result = await self.session.execute(select(Profile).where(Profile.external_id == external_id))
        return result.scalar_one_or_none()

    async def _organization(self, external_id: str) -> Organization | None:
        result = await self.session.execute(select(Organization).where(Organization.external_id == external_id))
        return result.scalar_one_or_none()


def format_transaction(entry: LedgerEntry, account: LedgerAccount, project: Project | None, event: ChainEvent | None) -> dict[str, Any]:
    metadata = entry.metadata_ or {}
    tx_type = {
        "PURCHASE": "received",
        "RECEIVED": "received",
        "CREDIT_ISSUED": "received",
        "TRANSFER_SENT": "sent",
        "RETIREMENT": "retired",
        "BURN": "retired",
        "MINT": "minted",
    }.get(entry.entry_type, "received")
    return {
        "id": metadata.get("frontend_id") or str(entry.id),
        "type": tx_type,
        "asset": metadata.get("asset") or (project.name if project is not None else "Crédito SINARCA"),
        "amount": f"{abs(float(entry.amount)):g}",
        "unit": entry.unit,
        "date": metadata.get("date_label") or entry.created_at.isoformat(),
        "createdAt": entry.created_at.isoformat(),
        "status": metadata.get("status") or ("pending" if event is not None and event.status == "PENDING" else "completed"),
        "hash": metadata.get("hash") or (event.transaction_hash if event is not None else entry.idempotency_key),
        "projectId": project.friendly_id if project is not None else None,
        "buyer": account.external_id,
        "entities": {
            "from": entry.counterparty or "Protocolo",
            "to": "Minha Conta" if float(entry.amount) >= 0 else "Aposentadoria",
        },
        "ledgerAccount": account.external_id,
    }


def ledger_entry_types_for_filter(value: str) -> list[str]:
    normalized = value.strip().upper()
    aliases = {
        "RECEIVED": ["PURCHASE", "RECEIVED", "CREDIT_ISSUED"],
        "TRANSFER": ["PURCHASE", "RECEIVED", "TRANSFER_SENT"],
        "PURCHASE": ["PURCHASE"],
        "SENT": ["TRANSFER_SENT"],
        "RETIRED": ["RETIREMENT", "BURN"],
        "BURN": ["RETIREMENT", "BURN"],
        "MINTED": ["MINT"],
        "MINT": ["MINT"],
    }
    return aliases.get(normalized, [normalized])
