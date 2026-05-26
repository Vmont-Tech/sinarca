from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class Coordinates(BaseModel):
    lat: float
    lng: float
    svgX: float | None = None
    svgY: float | None = None


class ProjectLocation(BaseModel):
    city: str
    state: str
    stateId: str
    bioma: str
    coordinates: Coordinates


class ParticipatingEntity(BaseModel):
    id: str
    name: str
    role: Literal["Certifier", "Auditor", "Compensator", "Developer", "Registry"]
    verified: bool = False


class ProjectMetrics(BaseModel):
    totalAreaHa: float
    carbonStock: float
    investmentValue: float
    vintage: str


class BlockchainData(BaseModel):
    initialHash: str
    contractAddress: str
    merkleRoot: str
    blockHeight: int | None = None
    timestamp: str
    serialRange: dict[str, str | None]


class ProjectEntities(BaseModel):
    developer: ParticipatingEntity
    auditor: ParticipatingEntity
    certifier: ParticipatingEntity
    registry: ParticipatingEntity


class ProjectMRCA(BaseModel):
    type: Literal["PROJECT"] = "PROJECT"
    id: str
    friendlyId: str
    version: str
    name: str
    location: ProjectLocation
    status: str
    metrics: ProjectMetrics
    description: str
    baseline: str
    methodology: str
    methodology_link: str | None = None
    image: str
    entities: ProjectEntities
    blockchain: BlockchainData
    timeline: list[dict[str, Any]]


class ProjectsResponse(BaseModel):
    success: bool = True
    total: int
    projects: list[ProjectMRCA]


class ProjectResponse(BaseModel):
    success: bool = True
    project: ProjectMRCA


class CatalogResponse(BaseModel):
    success: bool = True
    certifiers: list[dict[str, Any]] | None = None
    auditors: list[dict[str, Any]] | None = None
    companies: list[dict[str, Any]] | None = None
    producers: list[dict[str, Any]] | None = None


class ProjectPublicDossierResponse(BaseModel):
    success: bool = True
    project: ProjectMRCA
    tags: list[dict[str, Any]]
    baseline: dict[str, Any] | None = None
    certifications: list[dict[str, Any]]
    audits: list[dict[str, Any]]
    documents: list[dict[str, Any]]
    credits: list[dict[str, Any]]
    transactions: list[dict[str, Any]]
    chainEvents: list[dict[str, Any]]


class PublicProfileResponse(BaseModel):
    success: bool = True
    profile: dict[str, Any]


class QueueResponse(BaseModel):
    success: bool = True
    total: int
    projects: list[ProjectMRCA]


class ProjectTagInput(BaseModel):
    tag_uid: str
    cmac: str
    latitude: float
    longitude: float
    vertex_label: str


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    project_type: str
    location: ProjectLocation
    producer_id: str | None = None
    certifier_id: str
    area_hectares: float | None = None
    carbon_stock: float | None = None
    tags: list[ProjectTagInput] | None = None


class BaselineDTO(BaseModel):
    baseline_hash: str
    points_analyzed: int
    vegetation_cover_pct: float
    ndvi_mean: float
    captured_at: datetime
