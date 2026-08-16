from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ProjectClaimsResponse(BaseModel):
    success: bool = True
    project_id: str
    total: int
    claims: list[dict[str, Any]] = []


class ProjectEvidenceResponse(BaseModel):
    success: bool = True
    project_id: str
    total: int
    evidence: list[dict[str, Any]] = []


class ProjectConflictsResponse(BaseModel):
    success: bool = True
    project_id: str
    total: int
    conflicts: list[dict[str, Any]] = []


class ProjectIntegrityResponse(BaseModel):
    success: bool = True
    project_id: str
    integrity: dict[str, Any]
