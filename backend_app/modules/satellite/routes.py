from __future__ import annotations

# Phase 05 / SATM-06..09 -- Rotas do dominio satelital por /api/v1: leitura
# org-scoped de observacoes/serie temporal/eventos (Task 1), decisao humana
# CONFIRMED/DISMISSED e desbloqueio auditavel (Task 2), pendencia de
# recalculo de credito (Task 3). Mesmo guard duplo de integrity/routes.py:
# require_role(...) + _assert_project_edit_permission (org-scoped) -- guard
# duplicado literalmente por rota (nao extraido em helper), mesmo estilo ja
# usado em integrity/routes.py e projects/routes.py.
#
# T-05-46: dado de anomalia/evento revela estado operacional de um projeto de
# terceiro -- mesma classe de sensibilidade de boundary-overlaps (Phase 04.1).
# Nenhuma rota devolve caminho de storage cru (Pitfall 4): a imagem de
# evidencia e servida por SatelliteEvidenceService.load_evidence_bytes.

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import (
    CreditAdjustmentPendency,
    ProjectEvent,
    SatelliteAnomaly,
    SatelliteEvidence,
    SatelliteJob,
    SatelliteObservation,
)
from backend_app.db.session import get_session
from backend_app.modules.integrity.service import IntegrityService
from backend_app.modules.satellite.constants import SENTINEL_STATUS_BLOCKED
from backend_app.modules.satellite.evidence import SatelliteEvidenceService
from backend_app.modules.satellite.schemas import (
    CopernicusUsageResponse,
    CreditAdjustmentPendenciesResponse,
    ProjectEventClearRequest,
    ProjectEventDecisionRequest,
    ProjectEventDetailResponse,
    ProjectEventsResponse,
    SatelliteObservationsResponse,
    SatelliteSummaryResponse,
)
from backend_app.modules.satellite.service import SatelliteService
from backend_app.modules.projects.service import ProjectsService

router = APIRouter(tags=["satellite"])

SATELLITE_ACCESS_ROLES = ("producer", "certifier", "auditor", "admin")
# D-18/T-05-42: produtor NAO decide sobre o proprio incidente -- mesmo
# principio de verify_project, que restringe a auditor/admin.
SATELLITE_DECISION_ROLES = ("auditor", "certifier", "admin")


async def _actor_profile_id(session: AsyncSession, actor_id: str | None) -> Any | None:
    try:
        profile = await ProjectsService(session)._actor_profile(actor_id)
        return profile.id
    except HTTPException:
        return None


def observation_item(row: SatelliteObservation) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "sceneId": row.scene_id,
        "satellite": row.satellite,
        "product": row.product,
        "processingVersion": row.processing_version,
        "observedAt": row.observed_at.isoformat(),
        "cloudCoverage": float(row.cloud_coverage) if row.cloud_coverage is not None else None,
        "ndviMean": float(row.ndvi_mean) if row.ndvi_mean is not None else None,
        "ndviMin": float(row.ndvi_min) if row.ndvi_min is not None else None,
        "ndviMax": float(row.ndvi_max) if row.ndvi_max is not None else None,
        "ndmiMean": float(row.ndmi_mean) if row.ndmi_mean is not None else None,
        "nbrMean": float(row.nbr_mean) if row.nbr_mean is not None else None,
        "validPixelPercentage": (
            float(row.valid_pixel_percentage) if row.valid_pixel_percentage is not None else None
        ),
    }


def _anomaly_summary(anomaly: SatelliteAnomaly | None) -> dict[str, Any] | None:
    if anomaly is None:
        return None
    return {
        "id": str(anomaly.id),
        "indexName": anomaly.index_name,
        "valueBefore": float(anomaly.value_before) if anomaly.value_before is not None else None,
        "valueAfter": float(anomaly.value_after) if anomaly.value_after is not None else None,
        "dropRatio": float(anomaly.drop_ratio) if anomaly.drop_ratio is not None else None,
        "reason": anomaly.reason,
    }


def _evidence_summary_item(row: SatelliteEvidence) -> dict[str, Any]:
    # Allowlist explicita -- NUNCA o caminho cru do arquivo no Storage aqui
    # (Pitfall 4). A imagem em si e servida por rota dedicada.
    return {
        "id": str(row.id),
        "kind": row.kind,
        "sha256": row.sha256_hash,
        "capturedAt": row.captured_at.isoformat() if row.captured_at else None,
        "mimeType": row.mime_type,
    }


def event_item(
    event: ProjectEvent,
    *,
    anomaly: SatelliteAnomaly | None = None,
    evidence: tuple[SatelliteEvidence, ...] | list[SatelliteEvidence] = (),
) -> dict[str, Any]:
    return {
        "id": str(event.id),
        "type": event.type,
        "status": event.status,
        "severity": event.severity,
        "confidence": float(event.confidence) if event.confidence is not None else None,
        "affectedAreaHa": float(event.affected_area_ha) if event.affected_area_ha is not None else None,
        "ndviBefore": float(event.ndvi_before) if event.ndvi_before is not None else None,
        "ndviAfter": float(event.ndvi_after) if event.ndvi_after is not None else None,
        "summary": event.summary,
        "detectedAt": event.detected_at.isoformat() if event.detected_at else None,
        "analyzedAt": event.analyzed_at.isoformat() if event.analyzed_at else None,
        "decidedAt": event.decided_at.isoformat() if event.decided_at else None,
        "decisionNotes": event.decision_notes,
        "clearedAt": event.cleared_at.isoformat() if event.cleared_at else None,
        "clearanceNotes": event.clearance_notes,
        "correlation": (event.metadata_ or {}).get("correlation"),
        "anomaly": _anomaly_summary(anomaly),
        "evidence": [_evidence_summary_item(item) for item in evidence],
    }


def pendency_item(row: CreditAdjustmentPendency) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "projectEventId": str(row.project_event_id) if row.project_event_id is not None else None,
        "category": row.category,
        "description": row.description,
        "affectedAreaHa": float(row.affected_area_ha) if row.affected_area_ha is not None else None,
        "status": row.status,
        "producerResponse": row.producer_response,
        "respondedAt": row.responded_at.isoformat() if row.responded_at else None,
        "resolvedAt": row.resolved_at.isoformat() if row.resolved_at else None,
        "createdAt": row.created_at.isoformat(),
        "metadata": row.metadata_ or {},
    }


async def _events_with_relations(session: AsyncSession, events: list[ProjectEvent]) -> list[dict[str, Any]]:
    if not events:
        return []
    anomaly_ids = [event.anomaly_id for event in events if event.anomaly_id is not None]
    anomalies_by_id: dict[Any, SatelliteAnomaly] = {}
    if anomaly_ids:
        rows = (
            await session.execute(select(SatelliteAnomaly).where(SatelliteAnomaly.id.in_(anomaly_ids)))
        ).scalars().all()
        anomalies_by_id = {row.id: row for row in rows}

    event_ids = [event.id for event in events]
    evidence_rows = (
        await session.execute(select(SatelliteEvidence).where(SatelliteEvidence.project_event_id.in_(event_ids)))
    ).scalars().all()
    evidence_by_event: dict[Any, list[SatelliteEvidence]] = {}
    for row in evidence_rows:
        evidence_by_event.setdefault(row.project_event_id, []).append(row)

    return [
        event_item(
            event,
            anomaly=anomalies_by_id.get(event.anomaly_id),
            evidence=evidence_by_event.get(event.id, []),
        )
        for event in events
    ]


async def _get_project_event(session: AsyncSession, project_id: Any, event_id: str) -> ProjectEvent:
    try:
        event_uuid = uuid.UUID(event_id)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")
    event = (
        await session.execute(
            # 404 (nunca 403) quando o evento nao pertence a este projeto --
            # nunca aceitar event_id de outro projeto (T-05-41).
            select(ProjectEvent).where(ProjectEvent.id == event_uuid, ProjectEvent.project_id == project_id)
        )
    ).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")
    return event


@router.get("/projects/{project_id}/satellite/summary", response_model=SatelliteSummaryResponse)
async def get_satellite_summary(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_ACCESS_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> SatelliteSummaryResponse:
    """Resumo do monitoramento satelital do projeto (SATM-06).

    Observacao/job de projeto de terceiro revela estado operacional sensivel
    -- mesmo guard duplo org-scoped de /boundary-overlaps (T-05-46).
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    satellite_service = SatelliteService(session)
    latest = await satellite_service.latest_observation(project.id)
    observation_rows = (
        await session.execute(select(SatelliteObservation).where(SatelliteObservation.project_id == project.id))
    ).scalars().all()
    last_job = (
        await session.execute(
            select(SatelliteJob)
            .where(SatelliteJob.project_id == project.id)
            .order_by(SatelliteJob.created_at.desc())
            .limit(1)
        )
    ).scalars().first()
    event_rows = (
        await session.execute(select(ProjectEvent).where(ProjectEvent.project_id == project.id))
    ).scalars().all()
    events_by_status: dict[str, int] = {}
    for event in event_rows:
        events_by_status[event.status] = events_by_status.get(event.status, 0) + 1

    metadata = project.metadata_ or {}
    sentinel_status = metadata.get("sentinel_status")
    summary: dict[str, Any] = {
        "latestObservation": observation_item(latest) if latest is not None else None,
        "observationCount": len(observation_rows),
        "baselineSource": metadata.get("baseline_source"),
        "sentinelStatus": sentinel_status,
        "lastJob": (
            {
                "jobType": last_job.job_type,
                "status": last_job.status,
                "errorMessage": last_job.error_message,
                "finishedAt": last_job.finished_at.isoformat() if last_job.finished_at else None,
            }
            if last_job is not None
            else None
        ),
        "eventsByStatus": events_by_status,
    }
    if sentinel_status == SENTINEL_STATUS_BLOCKED and latest is None:
        # UI-SPEC: empty state fail-closed -- sem credenciais Copernicus,
        # nenhum dado simulado e exibido.
        summary["blocked"] = True
        summary["blockedReason"] = "Faltam credenciais do provedor Copernicus neste ambiente."

    return SatelliteSummaryResponse(project_id=project.friendly_id, summary=summary)


@router.get("/projects/{project_id}/satellite/observations", response_model=SatelliteObservationsResponse)
async def get_satellite_observations(
    project_id: str,
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=500, le=5000),
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_ACCESS_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> SatelliteObservationsResponse:
    """Serie temporal completa de observacoes (NDVI/NDMI/NBR).

    Resposta unica para o grafico da UI -- nao existe endpoint separado de
    serie temporal (decisao explicita do plano).
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    observations = await SatelliteService(session).list_observations(
        project.id, date_from=date_from, date_to=date_to, limit=limit
    )
    return SatelliteObservationsResponse(
        project_id=project.friendly_id,
        total=len(observations),
        observations=[observation_item(row) for row in observations],
    )


@router.get("/projects/{project_id}/environmental-events", response_model=ProjectEventsResponse)
async def list_environmental_events(
    project_id: str,
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_ACCESS_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> ProjectEventsResponse:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    stmt = select(ProjectEvent).where(ProjectEvent.project_id == project.id)
    if status_filter is not None:
        stmt = stmt.where(ProjectEvent.status == status_filter.upper())
    stmt = stmt.order_by(ProjectEvent.detected_at.desc())
    events = (await session.execute(stmt)).scalars().all()
    items = await _events_with_relations(session, events)
    return ProjectEventsResponse(project_id=project.friendly_id, total=len(items), events=items)


@router.get("/projects/{project_id}/environmental-events/{event_id}", response_model=ProjectEventDetailResponse)
async def get_environmental_event(
    project_id: str,
    event_id: str,
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_ACCESS_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> ProjectEventDetailResponse:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    event = await _get_project_event(session, project.id, event_id)
    items = await _events_with_relations(session, [event])
    return ProjectEventDetailResponse(project_id=project.friendly_id, event=items[0])


@router.patch(
    "/projects/{project_id}/environmental-events/{event_id}/decision",
    response_model=ProjectEventDetailResponse,
)
async def decide_environmental_event(
    project_id: str,
    event_id: str,
    payload: ProjectEventDecisionRequest,
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_DECISION_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> ProjectEventDetailResponse:
    """Decisao humana CONFIRMED/DISMISSED sobre um evento ANALYZED (D-18).

    Produtor nao decide sobre o proprio incidente (T-05-42). Evento resolvido
    filtrando por project_id -- 404 se nao pertencer a este projeto (T-05-41).
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    event = await _get_project_event(session, project.id, event_id)
    actor_profile_id = await _actor_profile_id(session, current_user.id)

    await SatelliteService(session).decide_event(
        project,
        event,
        decision=payload.decision,
        notes=payload.notes,
        actor_id=current_user.id,
        actor_role=current_user.role,
        actor_profile_id=actor_profile_id,
    )
    await session.commit()

    items = await _events_with_relations(session, [event])
    integrity = await IntegrityService(session).integrity_summary(project)
    return ProjectEventDetailResponse(project_id=project.friendly_id, event=items[0], integrity=integrity)


@router.patch(
    "/projects/{project_id}/environmental-events/{event_id}/clear",
    response_model=ProjectEventDetailResponse,
)
async def clear_environmental_event_review(
    project_id: str,
    event_id: str,
    payload: ProjectEventClearRequest,
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_DECISION_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> ProjectEventDetailResponse:
    """Desbloqueio auditavel de um evento CONFIRMED (D-22).

    Sempre humano e explicito: nunca por timeout nem por nova observacao
    satisfatoria sozinha.
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    event = await _get_project_event(session, project.id, event_id)
    actor_profile_id = await _actor_profile_id(session, current_user.id)

    await SatelliteService(session).clear_event_review(
        project,
        event,
        notes=payload.notes,
        actor_id=current_user.id,
        actor_role=current_user.role,
        actor_profile_id=actor_profile_id,
    )
    await session.commit()

    items = await _events_with_relations(session, [event])
    integrity = await IntegrityService(session).integrity_summary(project)
    return ProjectEventDetailResponse(project_id=project.friendly_id, event=items[0], integrity=integrity)


@router.get("/projects/{project_id}/environmental-events/{event_id}/evidence/{evidence_id}/image")
async def get_environmental_event_evidence_image(
    project_id: str,
    event_id: str,
    evidence_id: str,
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_ACCESS_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> Response:
    # UI-SPEC: quando a imagem ainda nao existe, a UI mostra "Imagem antes/
    # depois ainda não disponível — só é gerada quando a anomalia avança para
    # análise."
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    event = await _get_project_event(session, project.id, event_id)

    try:
        evidence_uuid = uuid.UUID(evidence_id)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidência não encontrada")

    evidence = (
        await session.execute(
            select(SatelliteEvidence).where(
                SatelliteEvidence.id == evidence_uuid,
                SatelliteEvidence.project_event_id == event.id,
            )
        )
    ).scalar_one_or_none()
    if evidence is None:
        # 404 (nunca 403): nunca vazar existencia de evidencia de outro
        # evento/projeto.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidência não encontrada")

    # provider=None: esta leitura so acessa Storage -- load_evidence_bytes
    # nunca toca self.provider. Nunca instanciar o adapter Copernicus (que
    # falha fechado sem credenciais) so para servir uma imagem ja capturada.
    content = await SatelliteEvidenceService(session, None).load_evidence_bytes(evidence)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidência não encontrada")

    return Response(content=content, media_type=evidence.mime_type)


@router.get("/projects/{project_id}/credit-adjustment-pendencies", response_model=CreditAdjustmentPendenciesResponse)
async def list_credit_adjustment_pendencies(
    project_id: str,
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: AuthenticatedUser = Depends(require_role(*SATELLITE_ACCESS_ROLES)),
    session: AsyncSession = Depends(get_session),
) -> CreditAdjustmentPendenciesResponse:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    stmt = select(CreditAdjustmentPendency).where(CreditAdjustmentPendency.project_id == project.id)
    if status_filter is not None:
        stmt = stmt.where(CreditAdjustmentPendency.status == status_filter.upper())
    stmt = stmt.order_by(CreditAdjustmentPendency.created_at.desc())
    rows = (await session.execute(stmt)).scalars().all()
    return CreditAdjustmentPendenciesResponse(
        project_id=project.friendly_id, total=len(rows), pendencies=[pendency_item(row) for row in rows]
    )


@router.get("/satellite/usage", response_model=CopernicusUsageResponse)
async def get_satellite_usage(
    since: datetime | None = Query(default=None),
    _: AuthenticatedUser = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
) -> CopernicusUsageResponse:
    # Consumo de quota e dado operacional GLOBAL (nao por projeto) -- admin
    # only (T-05-49).
    usage = await SatelliteService(session).usage_summary(since=since)
    return CopernicusUsageResponse(usage=usage)
