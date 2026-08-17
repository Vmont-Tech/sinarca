from __future__ import annotations

# Phase 05 / SATM-06..09 -- DTOs Pydantic no estilo de integrity/schemas.py:
# envelope success/project_id/total + payload como dict[str, Any] serializado
# pelas funcoes de modulo em routes.py (observation_item/event_item/
# pendency_item). Nenhum campo geometrico ou de storage cru trafega aqui.

from typing import Any, Literal

from pydantic import BaseModel


class SatelliteSummaryResponse(BaseModel):
    success: bool = True
    project_id: str
    summary: dict[str, Any]


class SatelliteObservationsResponse(BaseModel):
    success: bool = True
    project_id: str
    total: int
    observations: list[dict[str, Any]] = []


class ProjectEventsResponse(BaseModel):
    success: bool = True
    project_id: str
    total: int
    events: list[dict[str, Any]] = []


class ProjectEventDetailResponse(BaseModel):
    success: bool = True
    project_id: str
    event: dict[str, Any]
    integrity: dict[str, Any] | None = None


class ProjectEventDecisionRequest(BaseModel):
    # D-18: vocabulario fechado -- nunca aceita DETECTED/ANALYZED como decisao.
    decision: Literal["CONFIRMED", "DISMISSED"]
    notes: str = ""


class ProjectEventClearRequest(BaseModel):
    notes: str = ""


class CreditAdjustmentPendenciesResponse(BaseModel):
    success: bool = True
    project_id: str
    total: int
    pendencies: list[dict[str, Any]] = []


class CopernicusUsageResponse(BaseModel):
    success: bool = True
    usage: dict[str, Any]
