from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import EnvironmentalCredit, ProjectBaseline
from backend_app.db.repositories import create_audit_event
from backend_app.modules.projects.service import ProjectsService


class MonitoringService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def evaluate_anomaly(
        self,
        project_id: str,
        *,
        vegetation_cover_pct: float,
        ndvi_mean: float,
        confidence: float,
    ) -> dict[str, object]:
        project = await ProjectsService(self.session)._get_project_model(project_id)
        baseline = await self._latest_baseline(project.id)
        vegetation_drop = float(baseline.vegetation_cover_pct) - vegetation_cover_pct
        ndvi_drop_ratio = 0.0
        if float(baseline.ndvi_mean) > 0:
            ndvi_drop_ratio = (float(baseline.ndvi_mean) - ndvi_mean) / float(baseline.ndvi_mean)

        should_block = vegetation_drop > 5 or ndvi_drop_ratio > 0.10
        if not should_block:
            return {
                "success": True,
                "blocked": False,
                "project_id": project.friendly_id,
                "new_status": project.status,
                "vegetation_drop_points": round(vegetation_drop, 3),
                "ndvi_drop_pct": round(ndvi_drop_ratio * 100, 3),
                "confidence": confidence,
            }

        previous_status = project.status
        project.status = "BLOCKED_AUDIT_REQUIRED"
        result = await self.session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
        for credit in result.scalars().all():
            credit.status = "SUSPENDED"
            credit.quantity_available = Decimal("0")

        await create_audit_event(
            self.session,
            action="MONITORING_ANOMALY_BLOCK",
            entity_type="projects",
            entity_id=project.id,
            before_data={"status": previous_status},
            after_data={
                "status": project.status,
                "vegetation_cover_pct": vegetation_cover_pct,
                "ndvi_mean": ndvi_mean,
                "confidence": confidence,
            },
            metadata={
                "baseline_vegetation_cover_pct": float(baseline.vegetation_cover_pct),
                "baseline_ndvi_mean": float(baseline.ndvi_mean),
                "vegetation_drop_points": round(vegetation_drop, 3),
                "ndvi_drop_pct": round(ndvi_drop_ratio * 100, 3),
            },
        )
        await self.session.commit()
        return {
            "success": True,
            "blocked": True,
            "project_id": project.friendly_id,
            "new_status": "BLOCKED_AUDIT_REQUIRED",
            "vegetation_drop_points": round(vegetation_drop, 3),
            "ndvi_drop_pct": round(ndvi_drop_ratio * 100, 3),
            "confidence": confidence,
        }

    async def _latest_baseline(self, project_uuid) -> ProjectBaseline:
        result = await self.session.execute(
            select(ProjectBaseline)
            .where(ProjectBaseline.project_id == project_uuid)
            .order_by(ProjectBaseline.captured_at.desc(), ProjectBaseline.created_at.desc())
            .limit(1)
        )
        baseline = result.scalar_one_or_none()
        if baseline is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baseline do projeto não encontrado")
        return baseline

