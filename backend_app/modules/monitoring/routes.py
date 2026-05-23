from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.session import get_session
from backend_app.modules.monitoring.service import MonitoringService

router = APIRouter(tags=["monitoring"])


@router.get("/monitoring/projects/{project_id}")
async def project_monitoring(project_id: str, session: AsyncSession = Depends(get_session)) -> dict[str, object]:
    return await MonitoringService(session).project_summary(project_id)
