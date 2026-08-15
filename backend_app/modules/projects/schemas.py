from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


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
    publicMarketplace: bool = False
    metrics: ProjectMetrics
    description: str
    baseline: str
    methodology: str
    methodology_link: str | None = None
    image: str
    entities: ProjectEntities
    blockchain: BlockchainData
    timeline: list[dict[str, Any]]
    lifecycle: list[dict[str, Any]] = Field(default_factory=list)
    currentLifecycleStage: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


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
    certificate: dict[str, Any] | None = None
    certificationHistory: list[dict[str, Any]] = []


class CertifierReviewResponse(BaseModel):
    success: bool = True
    project: ProjectMRCA
    baseline: dict[str, Any] | None = None
    tags: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    dossier: dict[str, Any]
    calculation: dict[str, Any]
    certifications: list[dict[str, Any]] = []
    pendencies: list[dict[str, Any]] = []
    treasuryAuthorization: dict[str, Any] | None = None
    certificate: dict[str, Any] | None = None


class PublicProfileResponse(BaseModel):
    success: bool = True
    profile: dict[str, Any]


class ProjectDraftCreate(BaseModel):
    draft_kind: Literal["CREATE", "EDIT"] = "CREATE"
    target_project_id: str | None = None
    current_step: str = "project"
    payload: dict[str, Any] = Field(default_factory=dict)


class ProjectDraftUpdate(BaseModel):
    draft_kind: Literal["CREATE", "EDIT"] | None = None
    target_project_id: str | None = None
    current_step: str | None = None
    payload: dict[str, Any] | None = None
    status: Literal["DRAFT", "DISCARDED"] | None = None


class ProjectDraftDocumentItem(BaseModel):
    id: str
    documentType: str
    filename: str | None = None
    mimeType: str
    sizeBytes: int
    sha256: str
    storageBucket: str
    storageObjectPath: str | None = None
    storagePath: str
    uploadedAt: str
    status: str = "UPLOADED"


class ProjectDraftItem(BaseModel):
    id: str
    status: str
    draftKind: str
    targetProjectId: str | None = None
    currentStep: str
    payload: dict[str, Any]
    documents: list[ProjectDraftDocumentItem] = Field(default_factory=list)
    submittedProjectId: str | None = None
    submittedAt: str | None = None
    createdAt: str
    updatedAt: str


class ProjectDraftResponse(BaseModel):
    success: bool = True
    draft: ProjectDraftItem


class ProjectDraftsResponse(BaseModel):
    success: bool = True
    total: int
    drafts: list[ProjectDraftItem]


class ProjectDraftSubmitResponse(BaseModel):
    success: bool = True
    draft: ProjectDraftItem
    project: ProjectMRCA


class QueueResponse(BaseModel):
    success: bool = True
    total: int
    projects: list[ProjectMRCA]


class CertifierQueueResponse(BaseModel):
    success: bool = True
    total: int
    items: list[ProjectMRCA]
    # Alias de compatibilidade: `CertifierReview.tsx` (frontend legado, ainda não migrado
    # nesta fase) lê `response.projects`; mantido até um plano de UI (04-06/04-07) migrar
    # o consumo para `items`, que é o campo exigido pelo contrato de testes desta fase
    # (tests/test_certifier_workbench.py::test_correction_queue_split_and_producer_response).
    projects: list[ProjectMRCA]
    scope: Literal["main", "corrections"] = "main"
    counts: dict[str, int] = Field(default_factory=dict)


class ProjectTagInput(BaseModel):
    has_qtag: bool | None = None
    tag_uid: str | None = None
    cmac: str | None = None
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
    public_marketplace: bool = False
    image_url: str | None = None
    tags: list[ProjectTagInput] | None = None


class ProjectUpdate(ProjectCreate):
    pass


class BaselineDTO(BaseModel):
    baseline_hash: str
    points_analyzed: int
    vegetation_cover_pct: float
    ndvi_mean: float
    captured_at: datetime
