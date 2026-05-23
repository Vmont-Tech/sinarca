from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import ChainEvent, EnvironmentalCredit, ProjectBaseline, ProjectTag
from backend_app.db.repositories import create_audit_event
from backend_app.modules.projects.service import ProjectsService


class MonitoringService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def project_summary(self, project_id: str) -> dict[str, object]:
        project_service = ProjectsService(self.session)
        project = await project_service._get_project_model(project_id)
        baseline = await self._latest_baseline(project.id)
        tags = (
            (
                await self.session.execute(
                    select(ProjectTag).where(ProjectTag.project_id == project.id).order_by(ProjectTag.vertex_label.asc(), ProjectTag.created_at.asc())
                )
            )
            .scalars()
            .all()
        )
        events = (
            (
                await self.session.execute(
                    select(ChainEvent).where(ChainEvent.project_id == project.id).order_by(ChainEvent.created_at.desc()).limit(10)
                )
            )
            .scalars()
            .all()
        )
        return {
            "success": True,
            "project": (await project_service.project_to_mrca(project)).model_dump(),
            "baseline": {
                "sentinelSceneId": baseline.sentinel_scene_id,
                "baselineHash": baseline.baseline_hash,
                "pointsAnalyzed": baseline.points_analyzed,
                "vegetationCoverPct": float(baseline.vegetation_cover_pct),
                "ndviMean": float(baseline.ndvi_mean),
                "capturedAt": baseline.captured_at.isoformat(),
                "evidenceUri": baseline.evidence_uri,
            },
            "tags": [
                {
                    "id": tag.tag_uid,
                    "position": tag.vertex_label,
                    "status": tag.status,
                    "lastSeenAt": tag.last_seen_at.isoformat() if tag.last_seen_at else None,
                    "latitude": float(tag.latitude),
                    "longitude": float(tag.longitude),
                }
                for tag in tags
            ],
            "events": [
                {
                    "id": str(event.id),
                    "type": event.event_type,
                    "chain": event.chain,
                    "hash": event.transaction_hash,
                    "status": event.status,
                    "amount": float(event.amount) if event.amount is not None else None,
                    "createdAt": event.created_at.isoformat(),
                }
                for event in events
            ],
        }

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
