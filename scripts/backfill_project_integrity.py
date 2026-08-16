"""Retroactive Integrity/Risk Engine backfill for seed-inserted projects.

supabase/seed.sql inserts `projects` rows with raw SQL `INSERT`, bypassing
ProjectsService.create_project() entirely. In the real origination flow,
create_project() is what generates the initial Claims, runs conflict
detection, and writes the first risk_assessments row (Phase 04.2 / INTG-01,
INTG-03, INTG-04) -- none of that ever ran for seeded projects, which is why
they all show integrity_status="DECLARED" (just the column's server default)
and risk_score=NULL ("--" / "Risco ainda não avaliado" in the UI).

This script replays those same three calls for every project that doesn't
already have a risk_assessments row, so seeded/demo projects end up with the
same explainable risk assessment a real project gets on creation. Safe to
re-run: projects that already have an assessment are skipped.

Usage (from the repo root, against the local Supabase Postgres):
    DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres \\
        .venv/bin/python scripts/backfill_project_integrity.py

The Supabase CLI has no post-seed hook, so `npx supabase db reset` alone will
never run this on its own -- use `npm run db:reset` instead (chains
`supabase db reset` with this script) to get seeded projects with a real risk
assessment on every reset, not just the first time.
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402

from backend_app.db.models import Project, ProjectRiskAssessment  # noqa: E402
from backend_app.db.session import get_sessionmaker  # noqa: E402
from backend_app.modules.integrity.service import IntegrityService  # noqa: E402

BACKFILL_ACTOR_ID = "backfill-script"
BACKFILL_ACTOR_ROLE = "admin"
BACKFILL_TRIGGER = "RETROACTIVE_SEED_BACKFILL"


async def main() -> None:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        assessed_project_ids = set(
            (await session.execute(select(ProjectRiskAssessment.project_id).distinct())).scalars().all()
        )
        projects = (await session.execute(select(Project).order_by(Project.friendly_id))).scalars().all()
        pending = [p for p in projects if p.id not in assessed_project_ids]

        print(f"{len(projects)} projects total, {len(pending)} missing a risk assessment.")

        integrity = IntegrityService(session)
        for project in pending:
            await integrity.create_origination_claims(
                project, actor_id=BACKFILL_ACTOR_ID, actor_role=BACKFILL_ACTOR_ROLE
            )
            affected = await integrity.detect_and_persist_conflicts(
                project, actor_id=BACKFILL_ACTOR_ID, actor_role=BACKFILL_ACTOR_ROLE
            )
            await integrity.recalculate_risk_score(
                project, trigger=BACKFILL_TRIGGER, actor_id=BACKFILL_ACTOR_ID, actor_role=BACKFILL_ACTOR_ROLE
            )
            if affected:
                await integrity.recalculate_for_related(
                    affected, trigger=BACKFILL_TRIGGER, actor_id=BACKFILL_ACTOR_ID, actor_role=BACKFILL_ACTOR_ROLE
                )
            print(
                f"  {project.friendly_id}: risk_score={project.risk_score} "
                f"integrity_status={project.integrity_status}"
            )

        await session.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
