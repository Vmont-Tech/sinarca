from __future__ import annotations

# Phase 05 / D-23 -- disponibilidade de credito por decisao operacional.
# Extraido de audit/routes.py (_block_credits/_unlock_credits) porque agora
# existem DOIS acionadores: a decisao de auditoria (Phase 1) e o incidente
# satelital confirmado (Phase 05). Um unico ponto de verdade evita dois
# caminhos divergentes para o mesmo conceito.
#
# NUNCA altera o volume declarado do projeto (fora de escopo por D-23: nao se
# deriva quantidade de credito a partir de NDVI). Aqui so muda DISPONIBILIDADE
# (status/quantity_available do credito).

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import EnvironmentalCredit, Project


async def block_project_credits(session: AsyncSession, project: Project) -> int:
    result = await session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
    rows = result.scalars().all()
    for credit in rows:
        credit.status = "SUSPENDED"
        credit.quantity_available = Decimal("0")
    return len(rows)


async def unlock_project_credits(session: AsyncSession, project: Project) -> int:
    result = await session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
    rows = result.scalars().all()
    for credit in rows:
        credit.status = "AVAILABLE"
        credit.quantity_available = credit.quantity_total - credit.quantity_retired
    return len(rows)
