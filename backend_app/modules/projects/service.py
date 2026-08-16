from __future__ import annotations

import hashlib
import base64
import binascii
import json
import math
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import PurePath
from typing import Any

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import delete, false, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import (
    Audit,
    AuditEvent,
    Certification,
    CertificationPendency,
    ChainEvent,
    Document,
    EnvironmentalCredit,
    InventoryRegion,
    LedgerAccount,
    LedgerEntry,
    Organization,
    Profile,
    Project,
    ProjectBaseline,
    ProjectDraft,
    ProjectDraftDocument,
    ProjectTag,
    TreasuryAuthorization,
)
from backend_app.db.repositories import create_audit_event
from backend_app.modules.projects.schemas import (
    BaselineDTO,
    BlockchainData,
    CatalogResponse,
    ParticipatingEntity,
    ProjectCreate,
    ProjectDraftCreate,
    ProjectDraftDocumentItem,
    ProjectDraftItem,
    ProjectDraftsResponse,
    ProjectDraftUpdate,
    ProjectEntities,
    ProjectLocation,
    ProjectMetrics,
    ProjectMRCA,
    ProjectPublicDossierResponse,
    ProjectUpdate,
)
from backend_app.modules.supabase_storage import copy_storage_object, storage_public_object_url, upload_storage_object
from backend_app.modules.storage_paths import project_document_location, project_draft_document_location, project_image_location

ROLE_LABELS = {
    "certifier": "Certifier",
    "auditor": "Auditor",
    "developer": "Developer",
    "producer": "Developer",
    "registry": "Registry",
    "compensator": "Compensator",
    "company": "Compensator",
}

MARKETPLACE_READY_PROJECT_STATUSES = ("ACTIVE", "AVAILABLE")
PRODUCER_PORTFOLIO_PROJECT_STATUSES = (
    "ACTIVE",
    "AVAILABLE",
    "CERTIFIED_AWAITING_TREASURY",
    "AWAITING_AUDIT",
    "AUDITED",
    "BLOCKED_AUDIT_REQUIRED",
    "SUSPENDED",
    "RETIRED",
)
EDITABLE_PROJECT_STATUSES = ("DRAFT", "CREATED", "REGISTERED", "BASELINE_PENDING", "AWAITING_CERTIFICATION")
PROJECT_LIFECYCLE_STAGES: tuple[dict[str, str], ...] = (
    {
        "code": "CREATED",
        "label": "Registro",
        "description": "Demarcação física e cadastro do projeto com vértices.",
    },
    {
        "code": "AWAITING_CERTIFICATION",
        "label": "Certificação",
        "description": "Validação técnica da metodologia, documentos e potencial.",
    },
    {
        "code": "TOKENIZED_LOCKED",
        "label": "Tokenização",
        "description": "Créditos emitidos em status bloqueado para rastreio.",
    },
    {
        "code": "AWAITING_AUDIT",
        "label": "Auditoria",
        "description": "Inspeção de campo e validação biométrica ou satélite.",
    },
    {
        "code": "AVAILABLE",
        "label": "Listagem",
        "description": "Disponível para marketplace e consulta pública.",
    },
    {
        "code": "RESERVED",
        "label": "Liquidação",
        "description": "Reserva, compra ou transferência dos créditos.",
    },
    {
        "code": "RETIRED",
        "label": "Resgate",
        "description": "Aposentadoria definitiva para compensação real.",
    },
)
PROJECT_STATUS_TO_LIFECYCLE_CODE = {
    "DRAFT": "CREATED",
    "CREATED": "CREATED",
    "REGISTERED": "CREATED",
    "BASELINE_PENDING": "CREATED",
    "AWAITING_CERTIFICATION": "AWAITING_CERTIFICATION",
    "CERTIFIED_AWAITING_TREASURY": "TOKENIZED_LOCKED",
    "TOKENIZED_LOCKED": "TOKENIZED_LOCKED",
    "AWAITING_AUDIT": "AWAITING_AUDIT",
    "AUDITED": "AWAITING_AUDIT",
    "ACTIVE": "AVAILABLE",
    "AVAILABLE": "AVAILABLE",
    "RESERVED": "RESERVED",
    "TRANSFERRED": "RESERVED",
    "RETIRED": "RETIRED",
    "BLOCKED_AUDIT_REQUIRED": "AWAITING_AUDIT",
    "RECALCULATION_REQUIRED": "AWAITING_AUDIT",
    "SUSPENDED": "AWAITING_CERTIFICATION",
}
BLOCKED_PROJECT_STATUSES = {"BLOCKED_AUDIT_REQUIRED", "RECALCULATION_REQUIRED", "SUSPENDED"}

# Phase 04.1 / GEOF-03.
# Limite tecnico de vertices para protecao da API e do banco. O produto nao
# define maximo logico (Bible 15 §5), mas project_tags nao tem limite superior
# em lugar nenhum hoje — sem teto, um payload com milhares de vertices vira DoS
# na construcao do WKT e no GEOS.
MAX_PROJECT_TAG_VERTICES = 500

# D-GEO-02: limiar de DIVERGENCIA DE AREA. E limiar de SINALIZACAO, nunca de
# bloqueio. projects.area_hectares vem de _area_from_tags() (heuristica de
# bounding box: lat_span * lng_span * 12321 + 100) ou da area legal declarada
# pelo usuario; nenhuma das duas e comparavel geodesicamente com
# ST_Area(::geography). No retangulo dos fixtures de teste (0.02 x 0.02 grau em
# lat -10.1) a heuristica devolve ~104.93 ha contra ~486 ha geodesicos: ~363% de
# divergencia. Qualquer limiar bloqueante rejeitaria todo projeto existente.
# Trocar _area_from_tags pela area geodesica esta fora do escopo desta fase.
BOUNDARY_AREA_DIVERGENCE_WARN_PCT = 10.0

BOUNDARY_SOURCE_API_WRITE = "api_v1_project_write"

REQUIRED_CERTIFICATION_DOCUMENT_GROUPS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("documento legal ou CAR", ("LEGAL_OWNERSHIP", "CAR")),
    ("inventário florestal", ("FOREST_INVENTORY",)),
)
REQUIRED_CERTIFICATION_VERTEX_COUNT = 4
CERTIFICATION_CERTIFICATE_DOCUMENT_TYPE = "CERTIFICATION_CERTIFICATE"
PUBLIC_DOCUMENT_TYPES: frozenset[str] = frozenset({CERTIFICATION_CERTIFICATE_DOCUMENT_TYPE})

CERTIFICATION_HISTORY_ACTIONS: tuple[str, ...] = (
    "CERTIFICATION_REVIEW_OPENED",
    "CERTIFICATION_PENDENCY_CREATED",
    "CERTIFICATION_PENDENCY_ANSWERED",
    "CERTIFICATION_CHANGES_REQUESTED",
    "CERTIFICATION_REJECTED",
    "CERTIFICATION_APPROVED",
    "CERTIFICATION_CERTIFICATE_ATTACHED",
    "MINT_AUTHORIZED",
    "TREASURY_QUEUE_CREATED",
    # legado, gravado antes da Phase 04
    "CERTIFIER_APPROVE",
    "CERTIFIER_REJECT",
    "CERTIFIER_REQUEST_CHANGES",
)
PUBLIC_CERTIFICATION_HISTORY_ACTIONS: frozenset[str] = frozenset({
    "CERTIFICATION_APPROVED",
    "CERTIFICATION_REJECTED",
    "CERTIFICATION_CERTIFICATE_ATTACHED",
    "MINT_AUTHORIZED",
    "TREASURY_QUEUE_CREATED",
    "CERTIFIER_APPROVE",
    "CERTIFIER_REJECT",
})
CERTIFICATION_HISTORY_LABELS: dict[str, str] = {
    "CERTIFICATION_REVIEW_OPENED": "Revisão aberta pela certificadora",
    "CERTIFICATION_PENDENCY_CREATED": "Pendência criada para o produtor",
    "CERTIFICATION_PENDENCY_ANSWERED": "Produtor respondeu à pendência",
    "CERTIFICATION_CHANGES_REQUESTED": "Ajustes solicitados pela certificadora",
    "CERTIFICATION_REJECTED": "Projeto reprovado pela certificadora",
    "CERTIFICATION_APPROVED": "Certificação aprovada",
    "CERTIFICATION_CERTIFICATE_ATTACHED": "Certificado anexado",
    "MINT_AUTHORIZED": "Mint autorizado",
    "TREASURY_QUEUE_CREATED": "Enviado para a fila da tesouraria",
    "CERTIFIER_APPROVE": "Certificação aprovada",
    "CERTIFIER_REJECT": "Projeto reprovado pela certificadora",
    "CERTIFIER_REQUEST_CHANGES": "Ajustes solicitados pela certificadora",
}
DOSSIER_INCOMPLETE_DETAIL = (
    "Dossiê incompleto: reúna baseline, as quatro QTAGs/geofence válidas e os documentos "
    "obrigatórios antes de decidir. Uma pendência será gerada para o produtor corrigir."
)


class ProjectsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._integrity: Any | None = None

    @property
    def integrity(self) -> "IntegrityService":
        # Import local: o modulo integrity (Plan 03, Conflict) importa
        # ProjectsService de volta. Import no topo criaria ciclo.
        from backend_app.modules.integrity.service import IntegrityService

        if self._integrity is None:
            self._integrity = IntegrityService(self.session)
        return self._integrity

    async def list_projects(
        self,
        *,
        status_filter: str | None,
        state: str | None,
        public_marketplace: bool = False,
        portfolio_only: bool = False,
        scope: str | None = None,
        limit: int,
        actor_id: str | None = None,
        actor_role: str | None = None,
    ) -> list[ProjectMRCA]:
        statement = select(Project)
        normalized_scope = (scope or "").strip().lower()
        if not normalized_scope:
            normalized_scope = "mine" if actor_role == "producer" and not public_marketplace else "all"
        if normalized_scope not in {"all", "mine"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Escopo de projetos inválido")
        if actor_role == "producer" and not public_marketplace:
            normalized_scope = "mine"
        if normalized_scope == "mine":
            statement = await self._scope_projects_statement(statement, actor_id=actor_id, actor_role=actor_role)
        if status_filter and status_filter.lower() != "all":
            statement = statement.where(Project.status.ilike(status_filter.strip()))
        if public_marketplace:
            statement = statement.where(
                Project.public_marketplace.is_(True),
                Project.status.in_(MARKETPLACE_READY_PROJECT_STATUSES),
            )
        if portfolio_only:
            statement = statement.where(Project.status.in_(PRODUCER_PORTFOLIO_PROJECT_STATUSES))
        if state and state.lower() != "all":
            normalized_state = state.strip().lower()
            statement = statement.where(
                or_(
                    func.lower(Project.state) == normalized_state,
                    func.lower(Project.state_id) == normalized_state,
                )
            )
        statement = statement.order_by(Project.blockchain_timestamp.desc().nullslast(), Project.created_at.desc()).limit(limit)
        projects = list((await self.session.execute(statement)).scalars().all())
        return [await self.project_to_mrca(project) for project in projects]

    async def get_project(self, project_id: str) -> ProjectMRCA:
        return await self.project_to_mrca(await self._get_project_model(project_id))

    async def get_project_model(self, project_id: str) -> Project:
        return await self._get_project_model(project_id)

    async def get_editable_project_model(self, project_id: str, *, actor_id: str | None, actor_role: str | None) -> Project:
        project = await self._get_project_model(project_id)
        if project.status not in EDITABLE_PROJECT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Projeto em status {project.status} não pode ser editado diretamente",
            )
        await self._assert_project_edit_permission(project, actor_id=actor_id, actor_role=actor_role)
        return project

    async def get_public_dossier(self, project_id: str) -> ProjectPublicDossierResponse:
        project = await self._get_project_model(project_id)
        project_dto = await self.project_to_mrca(project)

        tags = (
            await self.session.execute(
                select(ProjectTag).where(ProjectTag.project_id == project.id).order_by(ProjectTag.vertex_label)
            )
        ).scalars().all()
        baseline = (
            await self.session.execute(
                select(ProjectBaseline)
                .where(ProjectBaseline.project_id == project.id)
                .order_by(ProjectBaseline.captured_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        certifications = (
            await self.session.execute(
                select(Certification).where(Certification.project_id == project.id).order_by(Certification.created_at.desc())
            )
        ).scalars().all()
        audits = (
            await self.session.execute(
                select(Audit).where(Audit.project_id == project.id).order_by(Audit.created_at.desc())
            )
        ).scalars().all()
        documents = (
            await self.session.execute(
                select(Document).where(Document.project_id == project.id).order_by(Document.uploaded_at.desc())
            )
        ).scalars().all()
        credits = (
            await self.session.execute(
                select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id).order_by(EnvironmentalCredit.vintage.desc())
            )
        ).scalars().all()
        chain_events = (
            await self.session.execute(
                select(ChainEvent).where(ChainEvent.project_id == project.id).order_by(ChainEvent.created_at.desc())
            )
        ).scalars().all()
        transaction_rows = (
            await self.session.execute(
                select(LedgerEntry, LedgerAccount, ChainEvent)
                .join(LedgerAccount, LedgerAccount.id == LedgerEntry.account_id)
                .outerjoin(ChainEvent, ChainEvent.id == LedgerEntry.chain_event_id)
                .where(LedgerEntry.project_id == project.id)
                .order_by(LedgerEntry.created_at.desc())
            )
        ).all()

        certificate = await self.certification_certificate(project)
        certification_history = await self.certification_history(
            project,
            actions=PUBLIC_CERTIFICATION_HISTORY_ACTIONS,
            include_metadata=False,
        )

        return ProjectPublicDossierResponse(
            project=project_dto,
            tags=[tag_item(tag) for tag in tags],
            baseline=baseline_item(baseline),
            boundary=public_boundary_item(await self.boundary_item(str(project.id))),
            certifications=[public_certification_item(item) for item in certifications],
            audits=[audit_item(item) for item in audits],
            documents=[
                public_document_item(item) for item in documents if item.document_type.upper() in PUBLIC_DOCUMENT_TYPES
            ],
            credits=[credit_item(item) for item in credits],
            chainEvents=[chain_event_item(item) for item in chain_events],
            transactions=[ledger_transaction_item(entry, account, project, event) for entry, account, event in transaction_rows],
            certificate=certificate,
            certificationHistory=certification_history,
        )

    async def _latest_baseline_model(self, project: Project) -> ProjectBaseline | None:
        return (
            await self.session.execute(
                select(ProjectBaseline)
                .where(ProjectBaseline.project_id == project.id)
                .order_by(ProjectBaseline.captured_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

    async def certification_dossier_status(self, project: Project) -> dict[str, Any]:
        """Estado do dossiê mínimo exigido pela D-03 antes de qualquer decisão."""
        baseline = await self._latest_baseline_model(project)
        tags = (
            await self.session.execute(
                select(ProjectTag).where(ProjectTag.project_id == project.id).order_by(ProjectTag.vertex_label)
            )
        ).scalars().all()
        documents = (
            await self.session.execute(select(Document).where(Document.project_id == project.id))
        ).scalars().all()

        valid_tags = [
            tag for tag in tags if tag.status.upper() == "ACTIVE" and tag.latitude is not None and tag.longitude is not None
        ]
        tags_complete = len(valid_tags) >= REQUIRED_CERTIFICATION_VERTEX_COUNT

        present_types = {document.document_type.upper() for document in documents}
        missing_groups = [
            label
            for label, group_types in REQUIRED_CERTIFICATION_DOCUMENT_GROUPS
            if not (set(group_types) & present_types)
        ]
        documents_complete = not missing_groups

        missing: list[str] = []
        if baseline is None:
            missing.append("baseline")
        if not tags_complete:
            missing.append("quatro QTAGs/geofence válidas")
        if not documents_complete:
            missing.append("documentos obrigatórios")

        return {
            "complete": baseline is not None and tags_complete and documents_complete,
            "missing": missing,
            "baseline": {
                "present": baseline is not None,
                "capturedAt": baseline.captured_at.isoformat() if baseline is not None else None,
                "sentinelSceneId": baseline.sentinel_scene_id if baseline is not None else None,
            },
            "tags": {
                "total": len(tags),
                "valid": len(valid_tags),
                "required": REQUIRED_CERTIFICATION_VERTEX_COUNT,
                "complete": tags_complete,
            },
            "documents": {
                "presentTypes": sorted(present_types),
                "missingGroups": missing_groups,
                "complete": documents_complete,
            },
        }

    async def suggested_credit_potential(self, project: Project) -> dict[str, Any]:
        """Sugestão de potencial de crédito (D-07), derivada do baseline persistido."""
        baseline = await self._latest_baseline_model(project)
        if baseline is not None:
            vegetation_cover_pct = float(baseline.vegetation_cover_pct)
            ndvi_mean = float(baseline.ndvi_mean)
            suggested = round(vegetation_cover_pct * ndvi_mean * 100, 2)
            source = "baseline"
        else:
            vegetation_cover_pct = None
            ndvi_mean = None
            suggested = float(project.carbon_stock or 0)
            source = "carbon_stock"

        return {
            "suggestedCreditPotential": suggested,
            "formula": "vegetationCoverPct * ndviMean * 100",
            "source": source,
            "vegetationCoverPct": vegetation_cover_pct,
            "ndviMean": ndvi_mean,
            "areaHectares": float(project.area_hectares) if project.area_hectares is not None else None,
            "carbonStock": float(project.carbon_stock) if project.carbon_stock is not None else None,
            "methodology": project.methodology,
        }

    async def assert_certification_dossier_complete(self, project: Project) -> dict[str, Any]:
        status_payload = await self.certification_dossier_status(project)
        if not status_payload["complete"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=DOSSIER_INCOMPLETE_DETAIL)
        return status_payload

    async def certification_history(
        self,
        project: Project,
        *,
        actions: tuple[str, ...] | frozenset[str] | None = None,
        actor_role: str | None = None,
        include_metadata: bool = True,
    ) -> list[dict[str, Any]]:
        statement = select(AuditEvent).where(
            AuditEvent.entity_type == "projects",
            AuditEvent.entity_id == project.id,
            AuditEvent.action.in_(tuple(actions or CERTIFICATION_HISTORY_ACTIONS)),
        )
        if actor_role is not None:
            statement = statement.where(AuditEvent.actor_role == actor_role)
        statement = statement.order_by(AuditEvent.created_at.asc())
        events = (await self.session.execute(statement)).scalars().all()

        items: list[dict[str, Any]] = []
        for event in events:
            item: dict[str, Any] = {
                "id": str(event.id),
                "action": event.action,
                "label": CERTIFICATION_HISTORY_LABELS.get(event.action, event.action),
                "actorRole": event.actor_role,
                "actorProfileId": str(event.actor_profile_id) if event.actor_profile_id is not None else None,
                "createdAt": event.created_at.isoformat(),
            }
            if include_metadata:
                item["metadata"] = event.metadata_ or {}
                item["beforeData"] = event.before_data
                item["afterData"] = event.after_data
            items.append(item)
        return items

    async def certification_certificate(self, project: Project) -> dict[str, Any] | None:
        document = (
            await self.session.execute(
                select(Document)
                .where(
                    Document.project_id == project.id,
                    Document.document_type == CERTIFICATION_CERTIFICATE_DOCUMENT_TYPE,
                )
                .order_by(Document.uploaded_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if document is None:
            return None
        return {
            "documentId": str(document.id),
            "sha256": document.sha256_hash,
            "mimeType": document.mime_type,
            "sizeBytes": document.size_bytes,
            "uploadedAt": document.uploaded_at.isoformat(),
            "storagePath": document.storage_path,
            "storageBucket": document.storage_bucket,
            "storageObjectPath": document.storage_object_path,
            "filename": (document.metadata_ or {}).get("filename"),
            "downloadAvailable": bool(document.storage_object_path),
        }

    async def list_project_drafts(
        self,
        *,
        actor_id: str | None,
        actor_role: str | None,
        status_filter: str | None = "DRAFT",
    ) -> ProjectDraftsResponse:
        profile = await self._actor_profile(actor_id)
        statement = select(ProjectDraft)
        if actor_role != "admin":
            statement = statement.where(ProjectDraft.owner_profile_id == profile.id)
        if status_filter and status_filter.lower() != "all":
            statement = statement.where(ProjectDraft.status == status_filter.strip().upper())
        statement = statement.order_by(ProjectDraft.updated_at.desc(), ProjectDraft.created_at.desc())
        drafts = list((await self.session.execute(statement)).scalars().all())
        items = [await self._draft_to_item(draft) for draft in drafts]
        return ProjectDraftsResponse(total=len(items), drafts=items)

    async def get_project_draft(self, draft_id: str, *, actor_id: str | None, actor_role: str | None) -> ProjectDraftItem:
        draft = await self._get_project_draft_model(draft_id, actor_id=actor_id, actor_role=actor_role)
        return await self._draft_to_item(draft)

    async def create_project_draft(
        self,
        payload: ProjectDraftCreate,
        *,
        actor_id: str | None,
        actor_role: str | None,
    ) -> ProjectDraftItem:
        profile = await self._actor_profile(actor_id)
        producer_organization_id = await self._producer_organization_id_from_draft_payload(payload.payload, profile)
        draft_kind = payload.draft_kind.upper()
        target_project_id = await self._target_project_internal_id(
            payload.target_project_id,
            draft_kind=draft_kind,
            actor_id=actor_id,
            actor_role=actor_role,
        )
        draft = ProjectDraft(
            owner_profile_id=profile.id,
            producer_organization_id=producer_organization_id,
            draft_kind=draft_kind,
            target_project_id=target_project_id,
            current_step=_normalize_draft_step(payload.current_step),
            status="DRAFT",
            payload=payload.payload,
        )
        self.session.add(draft)
        await self.session.flush()
        await create_audit_event(
            self.session,
            action="PROJECT_DRAFT_CREATED",
            entity_type="project_drafts",
            entity_id=draft.id,
            actor_role=actor_role,
            metadata={
                "actor_external_id": actor_id,
                "current_step": draft.current_step,
                "draft_kind": draft.draft_kind,
                "target_project_id": str(draft.target_project_id) if draft.target_project_id else None,
            },
        )
        await self.session.commit()
        return await self._draft_to_item(draft)

    async def update_project_draft(
        self,
        draft_id: str,
        payload: ProjectDraftUpdate,
        *,
        actor_id: str | None,
        actor_role: str | None,
    ) -> ProjectDraftItem:
        draft = await self._get_project_draft_model(draft_id, actor_id=actor_id, actor_role=actor_role)
        if draft.status != "DRAFT":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas rascunhos abertos podem ser alterados")

        if payload.draft_kind is not None:
            draft.draft_kind = payload.draft_kind.upper()
        if payload.target_project_id is not None or payload.draft_kind is not None:
            draft.target_project_id = await self._target_project_internal_id(
                payload.target_project_id or (str(draft.target_project_id) if draft.target_project_id else None),
                draft_kind=draft.draft_kind,
                actor_id=actor_id,
                actor_role=actor_role,
            )
        if payload.current_step is not None:
            draft.current_step = _normalize_draft_step(payload.current_step)
        if payload.payload is not None:
            draft.payload = payload.payload
            profile = await self._actor_profile(actor_id)
            draft.producer_organization_id = await self._producer_organization_id_from_draft_payload(payload.payload, profile)
        if payload.status is not None:
            draft.status = payload.status
        draft.updated_at = datetime.now(timezone.utc)

        await create_audit_event(
            self.session,
            action="PROJECT_DRAFT_UPDATED",
            entity_type="project_drafts",
            entity_id=draft.id,
            actor_role=actor_role,
            metadata={
                "actor_external_id": actor_id,
                "current_step": draft.current_step,
                "status": draft.status,
                "draft_kind": draft.draft_kind,
                "target_project_id": str(draft.target_project_id) if draft.target_project_id else None,
            },
        )
        await self.session.commit()
        return await self._draft_to_item(draft)

    async def add_project_draft_document(
        self,
        draft_id: str,
        *,
        document_type: str,
        filename: str,
        content_type: str | None,
        extension: str,
        content: bytes,
        sha256: str,
        mime_type: str,
        size_bytes: int,
        actor_id: str | None,
        actor_role: str | None,
    ) -> ProjectDraftDocumentItem:
        profile = await self._actor_profile(actor_id)
        draft = await self._get_project_draft_model(draft_id, actor_id=actor_id, actor_role=actor_role)
        if draft.status != "DRAFT":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas rascunhos abertos aceitam documentos")

        existing_document = (
            await self.session.execute(
                select(ProjectDraftDocument).where(
                    ProjectDraftDocument.draft_id == draft.id,
                    ProjectDraftDocument.document_type == document_type,
                    ProjectDraftDocument.sha256_hash == sha256,
                )
            )
        ).scalar_one_or_none()
        if existing_document is not None:
            return draft_document_item(existing_document)

        location = project_draft_document_location(str(draft.id), document_type, sha256, extension)
        await upload_storage_object(location.bucket, location.object_path, content, mime_type)
        document = ProjectDraftDocument(
            draft_id=draft.id,
            owner_profile_id=profile.id,
            document_type=document_type,
            storage_bucket=location.bucket,
            storage_object_path=location.object_path,
            storage_path=location.uri,
            sha256_hash=sha256,
            mime_type=mime_type,
            size_bytes=size_bytes,
            metadata_={"filename": filename, "content_type": content_type},
        )
        self.session.add(document)
        draft.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await create_audit_event(
            self.session,
            action="PROJECT_DRAFT_DOCUMENT_UPLOADED",
            entity_type="project_draft_documents",
            entity_id=document.id,
            actor_role=actor_role,
            metadata={
                "actor_external_id": actor_id,
                "draft_id": str(draft.id),
                "document_type": document_type,
                "sha256": sha256,
            },
        )
        await self.session.commit()
        return draft_document_item(document)

    async def submit_project_draft(
        self,
        draft_id: str,
        *,
        actor_id: str | None,
        actor_role: str | None,
    ) -> tuple[ProjectDraftItem, ProjectMRCA]:
        draft = await self._get_project_draft_model(draft_id, actor_id=actor_id, actor_role=actor_role)
        if draft.status != "DRAFT":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este rascunho não está aberto para envio")

        draft_documents = await self._draft_documents(draft.id)
        project_payload = project_create_from_draft_payload(draft.payload)
        if draft.draft_kind == "EDIT":
            if draft.target_project_id is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rascunho de edição sem projeto alvo")
            project_dto = await self.update_project(
                str(draft.target_project_id),
                ProjectUpdate.model_validate(project_payload.model_dump()),
                actor_id=actor_id,
                actor_role=actor_role,
                commit=False,
            )
            project = await self._get_project_model(project_dto.friendlyId)
        else:
            _validate_required_draft_documents(draft_documents)
            validate_project_tags(project_payload.tags or [])
            project_dto = await self.create_project(project_payload, actor_id=actor_id, actor_role=actor_role, commit=False)
            project = await self._get_project_model(project_dto.friendlyId)

        created_documents: list[Document] = []
        for draft_document in draft_documents:
            existing_project_document = (
                await self.session.execute(
                    select(Document).where(
                        Document.project_id == project.id,
                        Document.document_type == draft_document.document_type,
                        Document.sha256_hash == draft_document.sha256_hash,
                    )
                )
            ).scalar_one_or_none()
            if existing_project_document is not None:
                continue

            extension = _document_extension(draft_document)
            location = project_document_location(
                project.friendly_id,
                draft_document.document_type,
                draft_document.sha256_hash,
                extension,
            )
            await copy_storage_object(location.bucket, draft_document.storage_object_path, location.object_path)
            project_document = Document(
                owner_profile_id=draft_document.owner_profile_id,
                owner_organization_id=draft.producer_organization_id,
                project_id=project.id,
                document_type=draft_document.document_type,
                storage_bucket=location.bucket,
                storage_object_path=location.object_path,
                storage_path=location.uri,
                sha256_hash=draft_document.sha256_hash,
                mime_type=draft_document.mime_type,
                size_bytes=draft_document.size_bytes,
                metadata_={
                    **(draft_document.metadata_ or {}),
                    "draft_id": str(draft.id),
                    "draft_document_id": str(draft_document.id),
                },
            )
            self.session.add(project_document)
            created_documents.append(project_document)

        if created_documents:
            await self.session.flush()
            for created_document in created_documents:
                await self.integrity.create_evidence_for_document(
                    created_document,
                    project=project,
                    actor_id=actor_id,
                    actor_role=actor_role,
                )

        now = datetime.now(timezone.utc)
        draft.status = "SUBMITTED"
        draft.submitted_project_id = project.id
        draft.submitted_at = now
        draft.updated_at = now
        await create_audit_event(
            self.session,
            action="PROJECT_DRAFT_SUBMITTED",
            entity_type="project_drafts",
            entity_id=draft.id,
            actor_role=actor_role,
            metadata={
                "actor_external_id": actor_id,
                "friendly_id": project.friendly_id,
                "document_count": len(draft_documents),
                "draft_kind": draft.draft_kind,
            },
        )
        await self.session.commit()
        return await self._draft_to_item(draft), await self.project_to_mrca(project)

    async def create_project(
        self,
        payload: ProjectCreate,
        *,
        actor_id: str | None,
        actor_role: str | None,
        commit: bool = True,
    ) -> ProjectMRCA:
        validate_project_tags(payload.tags)

        region = await self._get_inventory_region(payload.location.stateId or payload.location.state)
        producer = await self._resolve_producer(payload.producer_id, actor_id)
        certifier = await self._get_organization(payload.certifier_id)
        registry = await self._get_first_organization_by_role("registry")
        auditor = await self._get_first_organization_by_role("auditor")
        friendly_id = await self._next_friendly_id()
        baseline = deterministic_baseline(payload)
        now = datetime.now(timezone.utc)
        source_hash = "baseline-" + baseline.baseline_hash
        image_url = await _store_project_image(payload.image_url, friendly_id)

        project = Project(
            friendly_id=friendly_id,
            source_hash=source_hash,
            version="v1.0",
            name=payload.name,
            description=payload.description,
            baseline=f"Baseline inicial {baseline.baseline_hash}",
            methodology=_methodology_for_type(payload.project_type),
            methodology_link=None,
            status="AWAITING_CERTIFICATION",
            public_marketplace=payload.public_marketplace,
            producer_organization_id=producer.id,
            developer_organization_id=producer.id,
            auditor_organization_id=auditor.id if auditor else None,
            certifier_organization_id=certifier.id,
            registry_organization_id=registry.id if registry else None,
            city=payload.location.city.strip(),
            state=region.name,
            state_id=region.uf.lower(),
            biome=payload.location.bioma,
            latitude=Decimal(str(payload.location.coordinates.lat)),
            longitude=Decimal(str(payload.location.coordinates.lng)),
            svg_x=Decimal(str(payload.location.coordinates.svgX)) if payload.location.coordinates.svgX is not None else None,
            svg_y=Decimal(str(payload.location.coordinates.svgY)) if payload.location.coordinates.svgY is not None else None,
            area_hectares=Decimal(str(payload.area_hectares or _area_from_tags(payload.tags))),
            carbon_stock=Decimal(str(payload.carbon_stock or _credit_potential_from_baseline(baseline))),
            investment_value_brl=Decimal("0"),
            vintage=str(now.year),
            image_url=image_url or "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
            serial_start=f"BR-{now.year}-{friendly_id[-3:]}-000001",
            serial_end=f"BR-{now.year}-{friendly_id[-3:]}-{int(_credit_potential_from_baseline(baseline)):06d}",
            contract_address="pending",
            merkle_root=baseline.baseline_hash,
            blockchain_timestamp=baseline.captured_at,
            timeline=initial_project_timeline(now, tag_count=len(payload.tags or [])),
            metadata_={
                "project_type": payload.project_type,
                "baseline_adapter": "deterministic_baseline",
                "sun_validation_status": "BLOCKED_MISSING_CREDENTIALS",
                "cmac_validation_status": "RECORDED_DECLARED_VALUE",
                "baseline_source": "deterministic_baseline",
                "sentinel_status": "BLOCKED_MISSING_PROVIDER_CREDENTIALS",
            },
        )
        self.session.add(project)
        await self.session.flush()

        self.session.add(
            ProjectBaseline(
                project_id=project.id,
                sentinel_scene_id=f"SINARCA_SENTINEL_{friendly_id}",
                baseline_hash=baseline.baseline_hash,
                points_analyzed=baseline.points_analyzed,
                vegetation_cover_pct=Decimal(str(baseline.vegetation_cover_pct)),
                ndvi_mean=Decimal(str(baseline.ndvi_mean)),
                captured_at=baseline.captured_at,
                evidence_uri=f"s3://sinarca-seed/baselines/{friendly_id}.json",
            )
        )

        for tag in payload.tags or []:
            has_qtag = _tag_has_qtag(tag)
            tag_uid = _clean_optional_string(tag.tag_uid) if has_qtag else None
            cmac = _clean_optional_string(tag.cmac) if has_qtag else None
            self.session.add(
                ProjectTag(
                    project_id=project.id,
                    has_qtag=has_qtag,
                    tag_uid=tag_uid,
                    cmac=cmac,
                    latitude=Decimal(str(tag.latitude)),
                    longitude=Decimal(str(tag.longitude)),
                    vertex_label=tag.vertex_label.strip().upper(),
                    first_seen_at=now,
                    last_seen_at=now,
                    metadata_={"source": "api-v1-project-create", "has_qtag": has_qtag},
                )
            )

        await self.session.flush()
        await self.persist_project_boundary(project, payload.tags)

        # Phase 04.2 / INTG-01 (D-01): a submissao de originacao gera Claims
        # DECLARED. Nao promove projects.status nem depende de nada do payload
        # alem do que ja foi validado acima.
        await self.integrity.create_origination_claims(project, actor_id=actor_id, actor_role=actor_role)

        # Phase 04.2 / INTG-03 (D-09/D-11): interpreta o overlap ja calculado
        # pela Phase 04.1 e persiste Conflict com severidade, de forma sincrona.
        affected = await self.integrity.detect_and_persist_conflicts(project, actor_id=actor_id, actor_role=actor_role)

        # Phase 04.2 / INTG-04 (D-19): todo projeto criado ja nasce com um
        # risk_assessment explicavel; os vizinhos afetados pelo overlap acima
        # tambem sao recalculados, senao o risco deles so mudaria na proxima
        # edicao (D-23).
        await self.integrity.recalculate_risk_score(
            project, trigger="PROJECT_CREATED", actor_id=actor_id, actor_role=actor_role
        )
        await self.integrity.recalculate_for_related(
            affected, trigger="RELATED_CONFLICT_CHANGED", actor_id=actor_id, actor_role=actor_role
        )

        await create_audit_event(
            self.session,
            action="PROJECT_CREATED",
            entity_type="projects",
            entity_id=project.id,
            actor_role=actor_role,
            metadata={"actor_external_id": actor_id, "friendly_id": friendly_id},
        )
        if commit:
            await self.session.commit()
        else:
            await self.session.flush()
        return await self.project_to_mrca(project)

    async def update_project(
        self,
        project_id: str,
        payload: ProjectUpdate,
        *,
        actor_id: str | None,
        actor_role: str | None,
        commit: bool = True,
    ) -> ProjectMRCA:
        project = await self.get_editable_project_model(project_id, actor_id=actor_id, actor_role=actor_role)

        validate_project_tags(payload.tags)

        region = await self._get_inventory_region(payload.location.stateId or payload.location.state)
        producer = await self._resolve_producer(payload.producer_id, actor_id)
        certifier = await self._get_organization(payload.certifier_id)
        now = datetime.now(timezone.utc)

        before_data = {
            "name": project.name,
            "status": project.status,
            "public_marketplace": bool(project.public_marketplace),
            "city": project.city,
            "state_id": project.state_id,
            "area_hectares": float(project.area_hectares),
            "carbon_stock": float(project.carbon_stock),
        }

        project.name = payload.name
        project.description = payload.description
        project.methodology = _methodology_for_type(payload.project_type)
        project.public_marketplace = payload.public_marketplace
        project.producer_organization_id = producer.id
        project.developer_organization_id = producer.id
        project.certifier_organization_id = certifier.id
        project.city = payload.location.city.strip()
        project.state = region.name
        project.state_id = region.uf.lower()
        project.biome = payload.location.bioma
        project.latitude = Decimal(str(payload.location.coordinates.lat))
        project.longitude = Decimal(str(payload.location.coordinates.lng))
        project.svg_x = Decimal(str(payload.location.coordinates.svgX)) if payload.location.coordinates.svgX is not None else None
        project.svg_y = Decimal(str(payload.location.coordinates.svgY)) if payload.location.coordinates.svgY is not None else None
        project.area_hectares = Decimal(str(payload.area_hectares or _area_from_tags(payload.tags)))
        project.carbon_stock = Decimal(str(payload.carbon_stock or float(project.carbon_stock)))
        if payload.image_url:
            project.image_url = await _store_project_image(payload.image_url, project.friendly_id)
        project.metadata_ = {
            **(project.metadata_ or {}),
            "project_type": payload.project_type,
            "last_edit_source": "api-v1-project-update",
        }
        project.updated_at = now

        if payload.tags is not None:
            await self.session.execute(delete(ProjectTag).where(ProjectTag.project_id == project.id))
            for tag in payload.tags:
                has_qtag = _tag_has_qtag(tag)
                tag_uid = _clean_optional_string(tag.tag_uid) if has_qtag else None
                cmac = _clean_optional_string(tag.cmac) if has_qtag else None
                self.session.add(
                    ProjectTag(
                        project_id=project.id,
                        has_qtag=has_qtag,
                        tag_uid=tag_uid,
                        cmac=cmac,
                        latitude=Decimal(str(tag.latitude)),
                        longitude=Decimal(str(tag.longitude)),
                        vertex_label=tag.vertex_label.strip().upper(),
                        first_seen_at=now,
                        last_seen_at=now,
                        metadata_={"source": "api-v1-project-update", "has_qtag": has_qtag},
                    )
                )

            await self.session.flush()
            await self.persist_project_boundary(project, payload.tags)

            # D-23: editar a geometria muda o overlap; Conflict e RE-DERIVADO
            # (resolve o que deixou de intersectar, atualiza o que continua).
            affected = await self.integrity.detect_and_persist_conflicts(
                project, actor_id=actor_id, actor_role=actor_role
            )

            # Phase 04.2 / INTG-04 (D-23): geometria mudou -> risco e
            # RE-DERIVADO (append-only) para este projeto e para os vizinhos
            # cujo Conflict mudou.
            await self.integrity.recalculate_risk_score(
                project, trigger="BOUNDARY_UPDATED", actor_id=actor_id, actor_role=actor_role
            )
            await self.integrity.recalculate_for_related(
                affected, trigger="RELATED_CONFLICT_CHANGED", actor_id=actor_id, actor_role=actor_role
            )

        await create_audit_event(
            self.session,
            action="PROJECT_UPDATED",
            entity_type="projects",
            entity_id=project.id,
            actor_role=actor_role,
            before_data=before_data,
            after_data={
                "name": project.name,
                "status": project.status,
                "public_marketplace": bool(project.public_marketplace),
                "city": project.city,
                "state_id": project.state_id,
                "area_hectares": float(project.area_hectares),
                "carbon_stock": float(project.carbon_stock),
            },
            metadata={"actor_external_id": actor_id, "friendly_id": project.friendly_id},
        )
        if commit:
            await self.session.commit()
        else:
            await self.session.flush()
        return await self.project_to_mrca(project)

    async def persist_project_boundary(
        self,
        project: Project,
        tags: list[Any] | None,
        *,
        source: str = BOUNDARY_SOURCE_API_WRITE,
    ) -> dict[str, Any] | None:
        """Constroi, valida e persiste a geometria declarada do projeto (GEOF-03).

        Roda na MESMA transacao da escrita de project_tags: um poligono
        reprovado levanta HTTPException 400 antes de qualquer commit, entao
        nunca chega geometria ruim ao banco.

        D-GEO-03: active_boundary espelha declared_boundary por codigo de
        aplicacao (o repo nao usa trigger). DECLARED e o unico tier populado
        nesta fase, logo e trivialmente o tier ativo pela regra de prioridade
        CERTIFIED > FIELD_VERIFIED > DECLARED.
        """
        if not tags:
            return None

        coordinates = [(float(tag.latitude), float(tag.longitude)) for tag in tags]
        _validate_ring_shape(coordinates)
        wkt = _polygon_wkt(coordinates)
        calculated_area_ha = await _validate_boundary_geometry(self.session, wkt)

        declared_area_ha = float(project.area_hectares or 0.0)
        divergence_pct = _area_divergence_pct(declared_area_ha, calculated_area_ha)
        # D-GEO-02: sinaliza, nao bloqueia.
        divergence_flagged = divergence_pct > BOUNDARY_AREA_DIVERGENCE_WARN_PCT

        await self.session.execute(
            text(
                """
                insert into project_boundaries (
                  project_id, declared_boundary, declared_area_ha, declared_source,
                  declared_vertex_count, declared_area_divergence_pct,
                  declared_area_divergence_flagged, active_boundary, active_boundary_tier
                )
                values (
                  :project_id, ST_GeomFromText(:wkt, 4326), :area_ha, :source,
                  :vertex_count, :divergence_pct, :divergence_flagged,
                  ST_GeomFromText(:wkt, 4326), 'DECLARED'
                )
                on conflict (project_id) do update set
                  declared_boundary = excluded.declared_boundary,
                  declared_area_ha = excluded.declared_area_ha,
                  declared_source = excluded.declared_source,
                  declared_vertex_count = excluded.declared_vertex_count,
                  declared_area_divergence_pct = excluded.declared_area_divergence_pct,
                  declared_area_divergence_flagged = excluded.declared_area_divergence_flagged,
                  active_boundary = excluded.active_boundary,
                  active_boundary_tier = excluded.active_boundary_tier,
                  updated_at = now()
                """
            ),
            {
                "project_id": str(project.id),
                "wkt": wkt,
                "area_ha": round(calculated_area_ha, 4),
                "source": source,
                "vertex_count": len(coordinates),
                "divergence_pct": divergence_pct,
                "divergence_flagged": divergence_flagged,
            },
        )
        return {
            "calculatedAreaHa": round(calculated_area_ha, 4),
            "declaredAreaHa": round(declared_area_ha, 4),
            "areaDivergencePct": divergence_pct,
            "areaDivergenceFlagged": divergence_flagged,
            "vertexCount": len(coordinates),
        }

    async def detect_boundary_overlaps(self, project_id: str) -> list[dict[str, Any]]:
        """Overlap interno entre projetos do proprio Sinarca (GEOF-04).

        ST_Intersects e o pre-filtro barato: em coluna com indice GiST
        (project_boundaries_active_boundary_gix) ele usa o bounding box do
        indice em vez de calcular geometria par a par. ST_Intersection +
        ST_Area(::geography) so rodam para quem realmente cruza.

        ST_Area precisa do cast ::geography: em geometry(Polygon, 4326) o
        resultado sai em graus quadrados, nao em metros quadrados.

        Esta fase NAO interpreta o overlap: nao cria Conflict, nao atribui
        severidade e nao bloqueia nada. Isso e Phase 04.2 (INTG-03).
        """
        project = await self._get_project_model(project_id)
        rows = (
            await self.session.execute(
                text(
                    """
                    select
                      other_p.id::text as related_project_id,
                      other_p.friendly_id as related_project_friendly_id,
                      other_p.name as related_project_name,
                      ST_Area(ST_Intersection(mine.active_boundary, other.active_boundary)::geography) / 10000.0
                        as overlap_area_ha,
                      (
                        ST_Area(ST_Intersection(mine.active_boundary, other.active_boundary)::geography)
                        / nullif(ST_Area(mine.active_boundary::geography), 0)
                      ) * 100 as overlap_percentage,
                      (
                        ST_Area(ST_Intersection(mine.active_boundary, other.active_boundary)::geography)
                        / nullif(ST_Area(other.active_boundary::geography), 0)
                      ) * 100 as overlap_percentage_of_related
                    from project_boundaries mine
                    join project_boundaries other
                      on other.project_id != mine.project_id
                      and ST_Intersects(mine.active_boundary, other.active_boundary)
                    join projects other_p on other_p.id = other.project_id
                    where mine.project_id = :project_id
                    order by overlap_percentage desc
                    """
                ),
                {"project_id": str(project.id)},
            )
        ).mappings().all()

        return [
            {
                "relatedProjectId": row["related_project_id"],
                "relatedProjectFriendlyId": row["related_project_friendly_id"],
                "relatedProjectName": row["related_project_name"],
                "overlapAreaHa": round(float(row["overlap_area_ha"] or 0.0), 4),
                "overlapPercentage": round(float(row["overlap_percentage"] or 0.0), 4),
                "overlapPercentageOfRelated": round(float(row["overlap_percentage_of_related"] or 0.0), 4),
            }
            for row in rows
        ]

    async def boundary_item(self, project_id: str) -> dict[str, Any] | None:
        """Geometria persistida serializada como GeoJSON (GEOF-05).

        ST_AsGeoJSON emite coordenadas [longitude, latitude] — a convencao do
        GeoJSON/PostGIS, INVERSA da convencao (latitude, longitude) usada no
        resto do repo e pelo Leaflet. Quem consome no frontend precisa inverter.

        Visao interna completa. Para o dossie publico use public_boundary_item()
        por cima deste retorno.
        """
        row = (
            await self.session.execute(
                text(
                    """
                    select
                      ST_AsGeoJSON(declared_boundary) as declared,
                      ST_AsGeoJSON(active_boundary) as active,
                      ST_AsGeoJSON(field_verified_boundary) as field_verified,
                      ST_AsGeoJSON(certified_boundary) as certified,
                      declared_area_ha,
                      declared_vertex_count,
                      declared_source,
                      declared_area_divergence_pct,
                      declared_area_divergence_flagged,
                      active_boundary_tier
                    from project_boundaries
                    where project_id = :project_id
                    """
                ),
                {"project_id": str(project_id)},
            )
        ).mappings().one_or_none()

        if row is None:
            return None

        return {
            "declared": json.loads(row["declared"]) if row["declared"] else None,
            "active": json.loads(row["active"]) if row["active"] else None,
            "fieldVerified": json.loads(row["field_verified"]) if row["field_verified"] else None,
            "certified": json.loads(row["certified"]) if row["certified"] else None,
            "declaredAreaHa": float(row["declared_area_ha"]) if row["declared_area_ha"] is not None else None,
            "declaredVertexCount": int(row["declared_vertex_count"]) if row["declared_vertex_count"] is not None else None,
            "declaredSource": row["declared_source"],
            "areaDivergencePct": (
                float(row["declared_area_divergence_pct"]) if row["declared_area_divergence_pct"] is not None else None
            ),
            "areaDivergenceFlagged": bool(row["declared_area_divergence_flagged"]),
            "activeTier": row["active_boundary_tier"],
        }

    async def catalog(self, role: str) -> CatalogResponse:
        role_map = {
            "certifiers": ("Certifier", "certifiers"),
            "auditors": ("Auditor", "auditors"),
            "companies": ("Developer", "companies"),
            "producers": ("Producer", "producers"),
        }
        role_value, response_key = role_map[role]
        rows = list(
            (
                await self.session.execute(
                    select(Organization)
                    .where(func.lower(Organization.role) == role_value.lower())
                    .order_by(Organization.name)
                )
            )
            .scalars()
            .all()
        )
        items = [catalog_item(row) for row in rows]
        if role == "companies":
            compensators = list(
                (
                    await self.session.execute(
                        select(Organization)
                        .where(func.lower(Organization.role) == "compensator")
                        .order_by(Organization.name)
                    )
                )
                .scalars()
                .all()
            )
            items.extend(catalog_item(row) for row in compensators)
        if role == "producers":
            developers = list(
                (
                    await self.session.execute(
                        select(Organization)
                        .where(func.lower(Organization.role) == "developer")
                        .order_by(Organization.name)
                    )
                )
                .scalars()
                .all()
            )
            existing_ids = {item["id"] for item in items}
            items.extend(catalog_item(row) for row in developers if row.external_id not in existing_ids)
        return CatalogResponse(**{response_key: items})

    async def public_profile(self, profile_id: str) -> dict[str, Any]:
        organization = await self._public_profile_organization(profile_id)
        profile = await self._public_profile_user(profile_id)
        organization_id = organization.id if organization is not None else profile.organization_id if profile is not None else None

        if organization is None and profile is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil público não encontrado")

        public_id = organization.external_id if organization is not None else profile.external_id
        name = organization.name if organization is not None else profile.name
        role = organization.role if organization is not None else profile.role
        document = organization.document if organization is not None else profile.document

        projects = []
        if organization_id is not None:
            statement = select(Project).where(
                or_(
                    Project.producer_organization_id == organization_id,
                    Project.developer_organization_id == organization_id,
                    Project.auditor_organization_id == organization_id,
                    Project.certifier_organization_id == organization_id,
                    Project.registry_organization_id == organization_id,
                )
            ).order_by(Project.created_at.desc())
            projects = list((await self.session.execute(statement)).scalars().all())

        project_dtos = [await self.project_to_mrca(project) for project in projects[:10]]
        total_impact = sum(float(project.carbon_stock) for project in projects)
        activity = await self._public_profile_activity(organization_id)

        return {
            "id": public_id,
            "name": name,
            "role": role,
            "document": mask_document(document),
            "website": organization.website if organization is not None else None,
            "logo": organization.logo_url if organization is not None else profile.avatar_url,
            "authorized": organization.authorized if organization is not None else profile.is_active,
            "verified": organization.authorized if organization is not None else profile.is_active,
            "organization": {
                "id": organization.external_id if organization is not None else None,
                "name": organization.name if organization is not None else None,
                "document": mask_document(organization.document) if organization is not None else None,
                "website": organization.website if organization is not None else None,
                "logo": organization.logo_url if organization is not None else None,
                "authorized": organization.authorized if organization is not None else None,
                "verified": organization.authorized if organization is not None else None,
            },
            "metrics": {
                **((organization.metadata_ or {}) if organization is not None else {}),
                "projects": len(projects),
                "totalImpact": total_impact,
                "transactions": len(activity),
            },
            "projects": [project.model_dump() for project in project_dtos],
            "activity": activity,
        }

    async def project_to_mrca(self, project: Project) -> ProjectMRCA:
        orgs = await self._organization_map(
            [
                project.developer_organization_id,
                project.auditor_organization_id,
                project.certifier_organization_id,
                project.registry_organization_id,
            ]
        )
        lifecycle, current_lifecycle_stage = project_lifecycle_for_status(project.status)
        return ProjectMRCA(
            id=project.source_hash or str(project.id),
            friendlyId=project.friendly_id,
            version=project.version,
            name=project.name,
            location=ProjectLocation(
                city=project.city,
                state=project.state,
                stateId=project.state_id,
                bioma=project.biome,
                coordinates={
                    "lat": float(project.latitude),
                    "lng": float(project.longitude),
                    "svgX": float(project.svg_x) if project.svg_x is not None else None,
                    "svgY": float(project.svg_y) if project.svg_y is not None else None,
                },
            ),
            status=project.status,
            publicMarketplace=bool(project.public_marketplace),
            metrics=ProjectMetrics(
                totalAreaHa=float(project.area_hectares),
                carbonStock=float(project.carbon_stock),
                investmentValue=float(project.investment_value_brl),
                vintage=project.vintage,
            ),
            description=project.description,
            baseline=project.baseline or "",
            methodology=project.methodology,
            methodology_link=project.methodology_link,
            image=project.image_url or "",
            entities=ProjectEntities(
                developer=entity_from_org(orgs.get(project.developer_organization_id), default_role="Developer"),
                auditor=entity_from_org(orgs.get(project.auditor_organization_id), default_role="Auditor"),
                certifier=entity_from_org(orgs.get(project.certifier_organization_id), default_role="Certifier"),
                registry=entity_from_org(orgs.get(project.registry_organization_id), default_role="Registry"),
            ),
            blockchain=BlockchainData(
                initialHash=project.source_hash or project.friendly_id,
                contractAddress=project.contract_address or "pending",
                merkleRoot=project.merkle_root or "pending",
                blockHeight=project.block_height,
                timestamp=(project.blockchain_timestamp or project.created_at).isoformat(),
                serialRange={"start": project.serial_start, "end": project.serial_end},
            ),
            timeline=list(project.timeline or []),
            lifecycle=lifecycle,
            currentLifecycleStage=current_lifecycle_stage,
            metadata=project.metadata_ or {},
        )

    async def _get_project_model(self, project_id: str) -> Project:
        filters = [Project.friendly_id == project_id, Project.source_hash == project_id]
        try:
            filters.append(Project.id == uuid.UUID(project_id))
        except ValueError:
            pass
        result = await self.session.execute(select(Project).where(or_(*filters)))
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")
        return project

    async def _get_project_draft_model(
        self,
        draft_id: str,
        *,
        actor_id: str | None,
        actor_role: str | None,
    ) -> ProjectDraft:
        try:
            draft_uuid = uuid.UUID(draft_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rascunho não encontrado") from exc

        draft = (
            await self.session.execute(select(ProjectDraft).where(ProjectDraft.id == draft_uuid))
        ).scalar_one_or_none()
        if draft is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rascunho não encontrado")

        if actor_role != "admin":
            profile = await self._actor_profile(actor_id)
            if draft.owner_profile_id != profile.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rascunho pertence a outro usuário")
        return draft

    async def _target_project_internal_id(
        self,
        project_id: str | None,
        *,
        draft_kind: str,
        actor_id: str | None = None,
        actor_role: str | None = None,
    ) -> uuid.UUID | None:
        normalized_kind = draft_kind.upper()
        if normalized_kind == "CREATE":
            return None
        if normalized_kind != "EDIT":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de rascunho inválido")
        if not project_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rascunho de edição deve informar o projeto alvo")
        project = await self._get_project_model(project_id)
        await self._assert_project_edit_permission(project, actor_id=actor_id, actor_role=actor_role)
        return project.id

    async def _scope_projects_statement(self, statement: Any, *, actor_id: str | None, actor_role: str | None) -> Any:
        if not actor_role:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário autenticado não encontrado")
        if actor_role == "admin":
            return statement

        profile = await self._actor_profile(actor_id)
        organization_id = profile.organization_id
        if organization_id is None:
            return statement.where(false())

        if actor_role == "producer":
            return statement.where(
                or_(
                    Project.producer_organization_id == organization_id,
                    Project.developer_organization_id == organization_id,
                )
            )
        if actor_role == "certifier":
            return statement.where(Project.certifier_organization_id == organization_id)
        if actor_role == "auditor":
            return statement.where(Project.auditor_organization_id == organization_id)
        return statement.where(false())

    async def _assert_project_edit_permission(
        self,
        project: Project,
        *,
        actor_id: str | None,
        actor_role: str | None,
    ) -> None:
        if actor_role == "admin":
            return
        profile = await self._actor_profile(actor_id)
        organization_id = profile.organization_id
        allowed = False
        if organization_id is not None and actor_role == "producer":
            allowed = organization_id in {project.producer_organization_id, project.developer_organization_id}
        elif organization_id is not None and actor_role == "certifier":
            allowed = organization_id == project.certifier_organization_id

        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seu perfil não pode editar este projeto")

    async def _actor_profile(self, actor_id: str | None) -> Profile:
        if not actor_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário autenticado não encontrado")
        filters = [Profile.external_id == actor_id]
        try:
            filters.append(Profile.id == uuid.UUID(actor_id))
        except ValueError:
            pass
        profile = (await self.session.execute(select(Profile).where(or_(*filters)))).scalar_one_or_none()
        if profile is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário autenticado não encontrado")
        return profile

    async def _draft_documents(self, draft_id: uuid.UUID) -> list[ProjectDraftDocument]:
        return list(
            (
                await self.session.execute(
                    select(ProjectDraftDocument)
                    .where(ProjectDraftDocument.draft_id == draft_id)
                    .order_by(ProjectDraftDocument.uploaded_at.asc())
                )
            )
            .scalars()
            .all()
        )

    async def _draft_to_item(self, draft: ProjectDraft) -> ProjectDraftItem:
        documents = await self._draft_documents(draft.id)
        target_project = await self.session.get(Project, draft.target_project_id) if draft.target_project_id else None
        return ProjectDraftItem(
            id=str(draft.id),
            status=draft.status,
            draftKind=draft.draft_kind,
            targetProjectId=target_project.friendly_id if target_project else None,
            currentStep=draft.current_step,
            payload=draft.payload or {},
            documents=[draft_document_item(document) for document in documents],
            submittedProjectId=str(draft.submitted_project_id) if draft.submitted_project_id else None,
            submittedAt=draft.submitted_at.isoformat() if draft.submitted_at else None,
            createdAt=draft.created_at.isoformat(),
            updatedAt=draft.updated_at.isoformat(),
        )

    async def _producer_organization_id_from_draft_payload(self, payload: dict[str, Any], profile: Profile) -> uuid.UUID | None:
        producer_external_id = _draft_payload_producer_id(payload)
        if producer_external_id:
            organization_id = await self.session.scalar(
                select(Organization.id).where(Organization.external_id == producer_external_id)
            )
            if organization_id is not None:
                return organization_id
        return profile.organization_id

    async def _get_organization(self, organization_id: str) -> Organization:
        result = await self.session.execute(select(Organization).where(Organization.external_id == organization_id))
        organization = result.scalar_one_or_none()
        if organization is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Organização {organization_id} não encontrada")
        return organization

    async def _resolve_producer(self, producer_id: str | None, actor_id: str | None) -> Organization:
        if producer_id:
            return await self._get_organization(producer_id)

        profile: Profile | None = None
        if actor_id:
            filters = [Profile.external_id == actor_id]
            try:
                filters.append(Profile.id == uuid.UUID(actor_id))
            except ValueError:
                pass
            profile = (await self.session.execute(select(Profile).where(or_(*filters)))).scalar_one_or_none()

        if profile is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Produtor responsável não encontrado")

        if profile.organization_id is not None:
            organization = (
                await self.session.execute(select(Organization).where(Organization.id == profile.organization_id))
            ).scalar_one_or_none()
            if organization is not None:
                return organization

        external_id = f"{profile.external_id or profile.id}-organization"
        organization = (
            await self.session.execute(select(Organization).where(Organization.external_id == external_id))
        ).scalar_one_or_none()
        if organization is None:
            organization = Organization(
                external_id=external_id,
                name=profile.name,
                role="Producer",
                document=profile.document,
                authorized=False,
            )
            self.session.add(organization)
            await self.session.flush()
        profile.organization_id = organization.id
        return organization

    async def _get_first_organization_by_role(self, role: str) -> Organization | None:
        result = await self.session.execute(
            select(Organization).where(func.lower(Organization.role) == role.lower()).order_by(Organization.name).limit(1)
        )
        return result.scalar_one_or_none()

    async def _public_profile_organization(self, profile_id: str) -> Organization | None:
        filters = [Organization.external_id == profile_id, Organization.name == profile_id]
        try:
            filters.append(Organization.id == uuid.UUID(profile_id))
        except ValueError:
            pass
        return (await self.session.execute(select(Organization).where(or_(*filters)))).scalar_one_or_none()

    async def _public_profile_user(self, profile_id: str) -> Profile | None:
        filters = [Profile.external_id == profile_id, Profile.name == profile_id]
        try:
            filters.append(Profile.id == uuid.UUID(profile_id))
        except ValueError:
            pass
        return (await self.session.execute(select(Profile).where(or_(*filters)))).scalar_one_or_none()

    async def _public_profile_activity(self, organization_id: Any | None) -> list[dict[str, Any]]:
        if organization_id is None:
            return []
        rows = (
            await self.session.execute(
                select(LedgerEntry, LedgerAccount, Project, ChainEvent)
                .join(LedgerAccount, LedgerAccount.id == LedgerEntry.account_id)
                .outerjoin(Project, Project.id == LedgerEntry.project_id)
                .outerjoin(ChainEvent, ChainEvent.id == LedgerEntry.chain_event_id)
                .where(LedgerAccount.owner_organization_id == organization_id)
                .order_by(LedgerEntry.created_at.desc())
                .limit(20)
            )
        ).all()
        return [ledger_transaction_item(entry, account, project, event) for entry, account, project, event in rows]

    async def _organization_map(self, ids: list[Any | None]) -> dict[Any, Organization]:
        clean_ids = [item for item in ids if item is not None]
        if not clean_ids:
            return {}
        rows = list((await self.session.execute(select(Organization).where(Organization.id.in_(clean_ids)))).scalars().all())
        return {row.id: row for row in rows}

    async def _get_inventory_region(self, state_value: str) -> InventoryRegion:
        normalized = state_value.strip().lower()
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="UF é obrigatória")

        region = (
            await self.session.execute(
                select(InventoryRegion).where(
                    or_(
                        func.lower(InventoryRegion.uf) == normalized,
                        func.lower(InventoryRegion.id) == normalized,
                        func.lower(InventoryRegion.name) == normalized,
                    )
                )
            )
        ).scalar_one_or_none()
        if region is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="UF deve existir no catálogo de UFs do Brasil")
        return region

    async def _next_friendly_id(self) -> str:
        year = datetime.now(timezone.utc).year
        count = await self.session.scalar(select(func.count()).select_from(Project))
        sequence = int(count or 0) + 1
        while True:
            friendly_id = f"PRC-{year}-{sequence:03d}"
            exists = await self.session.scalar(select(Project.id).where(Project.friendly_id == friendly_id))
            if exists is None:
                return friendly_id
            sequence += 1


def project_create_from_draft_payload(payload: dict[str, Any]) -> ProjectCreate:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rascunho sem payload de projeto")

    candidate = payload.get("project")
    if isinstance(candidate, dict):
        return _validate_project_create_payload(candidate)
    if {"name", "project_type", "location", "certifier_id"}.issubset(payload.keys()):
        return _validate_project_create_payload(payload)
    return _validate_project_create_payload(_project_payload_from_ui_draft(payload))


def _validate_project_create_payload(payload: dict[str, Any]) -> ProjectCreate:
    try:
        return ProjectCreate.model_validate(payload)
    except ValidationError as exc:
        details = "; ".join(".".join(str(part) for part in error["loc"]) for error in exc.errors()[:5])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Rascunho incompleto para envio: {details}") from exc


def _project_payload_from_ui_draft(payload: dict[str, Any]) -> dict[str, Any]:
    form = payload.get("form")
    if not isinstance(form, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rascunho sem dados de projeto para envio")

    tags = _normalize_draft_tags(payload.get("tags") or [])
    selected_region = payload.get("selectedRegion") if isinstance(payload.get("selectedRegion"), dict) else {}
    state_value = str(selected_region.get("uf") or form.get("state") or "").strip()
    coordinates = payload.get("coordinates") if isinstance(payload.get("coordinates"), dict) else _average_draft_coordinates(tags)
    producer_id = str(form.get("producerId") or "").strip() or None

    return {
        "name": str(form.get("name") or "").strip(),
        "description": f"{str(form.get('description') or '').strip()}\n\nMetodologia declarada: {str(form.get('methodology') or '').strip()}",
        "project_type": str(form.get("projectType") or "").strip(),
        "producer_id": producer_id,
        "certifier_id": str(form.get("certifierId") or "").strip(),
        "area_hectares": _optional_float(form.get("areaHectares")),
        "carbon_stock": _optional_float(form.get("carbonStock")),
        "public_marketplace": bool(form.get("publicMarketplace")),
        "image_url": str(form.get("imageUrl") or "").strip() or None,
        "location": {
            "city": str(form.get("city") or "").strip(),
            "state": str(selected_region.get("name") or state_value).strip(),
            "stateId": state_value.lower(),
            "bioma": str(form.get("bioma") or "").strip(),
            "coordinates": coordinates,
        },
        "tags": tags,
    }


def _normalize_draft_tags(raw_tags: Any) -> list[dict[str, Any]]:
    tags: list[dict[str, Any]] = []
    if not isinstance(raw_tags, list):
        return tags

    for index, tag in enumerate(raw_tags, start=1):
        if not isinstance(tag, dict):
            continue
        tag_uid = _clean_optional_string(tag.get("tag_uid") or tag.get("tagUid") or tag.get("uid"))
        cmac = _clean_optional_string(tag.get("cmac"))
        raw_has_qtag = tag.get("has_qtag") if "has_qtag" in tag else tag.get("hasQtag")
        has_qtag = _coerce_optional_bool(raw_has_qtag)
        if has_qtag is None:
            has_qtag = bool(tag_uid or cmac)
        tags.append(
            {
                "has_qtag": has_qtag,
                "tag_uid": tag_uid if has_qtag else None,
                "cmac": cmac if has_qtag else None,
                "latitude": _required_float(tag.get("latitude")),
                "longitude": _required_float(tag.get("longitude")),
                "vertex_label": tag.get("vertex_label") or tag.get("vertexLabel") or tag.get("vertex") or chr(64 + index),
            }
        )
    return tags


def _average_draft_coordinates(tags: list[dict[str, Any]]) -> dict[str, float | None]:
    if not tags:
        return {"lat": 0.0, "lng": 0.0, "svgX": None, "svgY": None}
    return {
        "lat": sum(float(tag["latitude"]) for tag in tags) / len(tags),
        "lng": sum(float(tag["longitude"]) for tag in tags) / len(tags),
        "svgX": None,
        "svgY": None,
    }


def _required_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _optional_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clean_optional_string(value: Any) -> str | None:
    cleaned = str(value or "").strip()
    return cleaned or None


def _coerce_optional_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "sim"}:
            return True
        if normalized in {"false", "0", "no", "nao", "não", ""}:
            return False
    return bool(value)


def _draft_payload_producer_id(payload: dict[str, Any]) -> str | None:
    candidates = [payload]
    if isinstance(payload.get("project"), dict):
        candidates.append(payload["project"])
    if isinstance(payload.get("form"), dict):
        candidates.append(payload["form"])
    for candidate in candidates:
        producer_id = candidate.get("producer_id") or candidate.get("producerId")
        if producer_id:
            return str(producer_id)
    return None


def _normalize_draft_step(value: str | None) -> str:
    normalized = (value or "project").strip().lower()
    if normalized not in {"project", "qtags", "documents", "review"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Etapa de rascunho inválida")
    return normalized


def _validate_required_draft_documents(documents: list[ProjectDraftDocument]) -> None:
    types = {document.document_type.upper() for document in documents}
    errors: list[str] = []
    if not ({"LEGAL_OWNERSHIP", "CAR"} & types):
        errors.append("documento legal ou CAR")
    if "FOREST_INVENTORY" not in types:
        errors.append("inventário florestal")
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Envie {', '.join(errors)} antes de enviar o projeto.",
        )


def _document_extension(document: ProjectDraftDocument) -> str:
    filename = (document.metadata_ or {}).get("filename")
    extension = PurePath(str(filename or document.storage_path)).suffix.lower()
    return extension or ".bin"


IMAGE_MIME_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


async def _store_project_image(image_url: str | None, project_friendly_id: str) -> str | None:
    if not image_url or not image_url.startswith("data:image/"):
        return image_url

    decoded = _decode_project_image_data_url(image_url)
    if decoded is None:
        return image_url

    mime_type, content, extension = decoded
    sha256 = hashlib.sha256(content).hexdigest()
    location = project_image_location(project_friendly_id, sha256, extension)
    uploaded = await upload_storage_object(location.bucket, location.object_path, content, mime_type)
    if not uploaded:
        return image_url
    return storage_public_object_url(location.bucket, location.object_path) or location.uri


def _decode_project_image_data_url(image_url: str) -> tuple[str, bytes, str] | None:
    header, separator, encoded = image_url.partition(",")
    if not separator or ";base64" not in header:
        return None
    mime_type = header.removeprefix("data:").split(";", 1)[0].lower()
    extension = IMAGE_MIME_EXTENSIONS.get(mime_type)
    if extension is None:
        return None
    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return None
    return mime_type, content, extension


def deterministic_baseline(payload: ProjectCreate) -> BaselineDTO:
    source = f"{payload.name}|{payload.location.city}|{payload.location.stateId}|{payload.project_type}".encode()
    digest = hashlib.sha256(source).hexdigest()
    vegetation = 55 + (int(digest[:2], 16) % 3500) / 100
    ndvi = 0.45 + (int(digest[2:4], 16) % 3500) / 10000
    return BaselineDTO(
        baseline_hash=digest,
        points_analyzed=5000,
        vegetation_cover_pct=round(vegetation, 3),
        ndvi_mean=round(ndvi, 3),
        captured_at=datetime.now(timezone.utc),
    )


def validate_project_tags(tags: list[Any] | None) -> None:
    if tags is None:
        return
    if len(tags) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Projeto deve informar no mínimo de 4 vértices")

    labels = [tag.vertex_label.strip().upper() for tag in tags]
    if any(not label for label in labels):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Todo vértice deve ter um identificador")
    if len(set(labels)) != len(labels):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Os vértices não podem repetir")
    for tag in tags:
        if _tag_has_qtag(tag) and not _clean_optional_string(tag.tag_uid):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Vértice {tag.vertex_label} com QTAG deve informar UID")
        if _tag_has_qtag(tag) and not _clean_optional_string(tag.cmac):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Vértice {tag.vertex_label} com QTAG deve informar CMAC")

    coordinates = [(float(tag.latitude), float(tag.longitude)) for tag in tags]
    if any(lat < -90 or lat > 90 or lng < -180 or lng > 180 for lat, lng in coordinates):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coordenadas dos vértices fora do intervalo válido")
    if len(set(coordinates)) != len(coordinates):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="As coordenadas dos vértices não podem repetir")
    if _polygon_area(coordinates) <= 0.000000001:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Os vértices precisam formar uma área válida, não uma linha")


def _tag_has_qtag(tag: Any) -> bool:
    explicit = getattr(tag, "has_qtag", None)
    if explicit is not None:
        return bool(explicit)
    return bool(_clean_optional_string(getattr(tag, "tag_uid", None)) or _clean_optional_string(getattr(tag, "cmac", None)))


def _polygon_area(coordinates: list[tuple[float, float]]) -> float:
    center_lat = sum(lat for lat, _ in coordinates) / len(coordinates)
    center_lng = sum(lng for _, lng in coordinates) / len(coordinates)
    ordered = sorted(coordinates, key=lambda item: math.atan2(item[0] - center_lat, item[1] - center_lng))
    area = 0.0
    for index, (lat, lng) in enumerate(ordered):
        next_lat, next_lng = ordered[(index + 1) % len(ordered)]
        area += lng * next_lat - next_lng * lat
    return abs(area) / 2


def _ordered_ring(coordinates: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Mesma ordenacao de _polygon_area(): centroide + angulo polar via atan2.

    Reaproveitar (e nao reinventar) e requisito de aceite do GEOF-02: qualquer
    outra ordenacao mudaria a forma de poligonos nao convexos em relacao ao que
    o usuario ve desde a Phase 3. Devolve (lat, lng) na ordem do poligono, ainda
    NAO fechado.
    """
    center_lat = sum(lat for lat, _ in coordinates) / len(coordinates)
    center_lng = sum(lng for _, lng in coordinates) / len(coordinates)
    return sorted(coordinates, key=lambda item: math.atan2(item[0] - center_lat, item[1] - center_lng))


def _polygon_wkt(coordinates: list[tuple[float, float]]) -> str:
    """Constroi o WKT POLYGON a partir de tuplas (lat, lng).

    ATENCAO ordem de coordenada: WKT/PostGIS/GeoJSON usam (X Y) =
    (longitude latitude), o INVERSO da convencao (latitude, longitude) usada em
    todo o resto deste repositorio (project_tags, tuplas Python, Leaflet).
    Este e o unico ponto do backend que constroi WKT — nao duplicar em lugar
    nenhum. O anel e fechado explicitamente repetindo o primeiro ponto.
    """
    ring = _ordered_ring(coordinates)
    closed = ring + [ring[0]]
    points = ", ".join(f"{lng} {lat}" for lat, lng in closed)  # lng primeiro
    return f"POLYGON(({points}))"


def _validate_ring_shape(coordinates: list[tuple[float, float]]) -> None:
    """Checagens baratas em Python, antes de qualquer ida ao banco (GEOF-03)."""
    if len(coordinates) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Polígono precisa de no mínimo 4 vértices")
    if len(coordinates) > MAX_PROJECT_TAG_VERTICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Polígono excede o limite técnico de {MAX_PROJECT_TAG_VERTICES} vértices",
        )
    if len(set(coordinates)) != len(coordinates):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vértices duplicados não são permitidos")
    if any(lat < -90 or lat > 90 or lng < -180 or lng > 180 for lat, lng in coordinates):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coordenadas fora do intervalo válido")


def _area_divergence_pct(declared_area_ha: float, calculated_area_ha: float) -> float:
    return round(abs(declared_area_ha - calculated_area_ha) / max(declared_area_ha, 1e-9) * 100, 4)


async def _validate_boundary_geometry(session: AsyncSession, wkt: str) -> float:
    """Bateria PostGIS do GEOF-03. Devolve a area geodesica em hectares.

    Uma unica ida ao banco. O WKT viaja como PARAMETRO LIGADO (:wkt) — nunca
    interpolar coordenada dentro do texto SQL entregue a session.execute().
    ST_Area precisa do cast ::geography: em geometry(Polygon, 4326) o retorno
    sai em graus quadrados, que nao viram hectare.
    """
    row = (
        await session.execute(
            text(
                """
                select
                  ST_IsValid(g) as is_valid,
                  ST_IsValidReason(g) as invalid_reason,
                  ST_IsSimple(g) as is_simple,
                  ST_Area(g::geography) / 10000.0 as area_ha
                from (select ST_GeomFromText(:wkt, 4326) as g) t
                """
            ),
            {"wkt": wkt},
        )
    ).mappings().one()

    if not bool(row["is_valid"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geometria inválida: {row['invalid_reason'] or 'motivo não informado pelo PostGIS'}",
        )
    if not bool(row["is_simple"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Polígono possui autointerseção")
    return float(row["area_ha"])


def project_lifecycle_for_status(project_status: str | None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    normalized_status = (project_status or "CREATED").upper()
    current_code = PROJECT_STATUS_TO_LIFECYCLE_CODE.get(normalized_status, "CREATED")
    current_index = next(
        (index for index, stage in enumerate(PROJECT_LIFECYCLE_STAGES) if stage["code"] == current_code),
        0,
    )
    total = len(PROJECT_LIFECYCLE_STAGES)
    is_blocked = normalized_status in BLOCKED_PROJECT_STATUSES
    lifecycle: list[dict[str, Any]] = []

    for index, stage in enumerate(PROJECT_LIFECYCLE_STAGES):
        is_current = index == current_index
        if index < current_index:
            state = "completed"
        elif is_current and is_blocked:
            state = "blocked"
        elif is_current:
            state = "current"
        else:
            state = "pending"

        item: dict[str, Any] = {
            **stage,
            "index": index + 1,
            "total": total,
            "state": state,
            "isCurrent": is_current,
        }
        if is_current:
            item["projectStatus"] = normalized_status
        lifecycle.append(item)

    return lifecycle, lifecycle[current_index]


def initial_project_timeline(now: datetime, *, tag_count: int) -> list[dict[str, str]]:
    today = now.date().isoformat()
    events = [
        {
            "code": "CREATED",
            "title": "Projeto criado",
            "date": today,
            "status": "complete",
            "desc": "Projeto registrado na API persistente.",
        },
        {
            "code": "BASELINE_CREATED",
            "title": "Baseline determinístico criado",
            "date": today,
            "status": "complete",
            "desc": "Baseline inicial registrado sem consulta Sentinel live.",
        },
        {
            "code": "DOCUMENTS_PENDING",
            "title": "Documentos pendentes",
            "date": today,
            "status": "pending",
            "desc": "Documentos legais e técnicos ainda aguardam upload.",
        },
        {
            "code": "AWAITING_CERTIFICATION",
            "title": "Aguardando certificação",
            "date": today,
            "status": "active",
            "desc": "Projeto enviado para a fila da certificadora.",
        },
    ]
    if tag_count > 0:
        events.insert(
            1,
            {
                "code": "QTAGS_RECORDED",
                "title": "Vértices registrados",
                "date": today,
                "status": "complete",
                "desc": f"{tag_count} vértices foram registrados para formar a área do projeto.",
            },
        )
    return events


def catalog_item(organization: Organization) -> dict[str, Any]:
    item = {
        "id": organization.external_id,
        "name": organization.name,
        "role": organization.role,
        "website": organization.website,
        "logo": organization.logo_url or "",
        "authorized": organization.authorized,
        "verified": organization.authorized,
        "document": mask_document(organization.document),
        **(organization.metadata_ or {}),
    }
    item.setdefault("projects", 0)
    item.setdefault("total_impact", 0)
    return item


def mask_document(document: str | None) -> str | None:
    if not document:
        return None
    clean = "".join(ch for ch in document if ch.isdigit())
    if len(clean) <= 4:
        return "***"
    return f"***{clean[-4:]}"


def tag_item(tag: ProjectTag) -> dict[str, Any]:
    has_qtag = bool(tag.has_qtag)
    return {
        "id": str(tag.id),
        "hasQtag": has_qtag,
        "tagUid": tag.tag_uid,
        "cmac": mask_token(tag.cmac) if has_qtag else None,
        "latitude": float(tag.latitude),
        "longitude": float(tag.longitude),
        "vertex": tag.vertex_label,
        "status": tag.status,
        "firstSeenAt": tag.first_seen_at.isoformat(),
        "lastSeenAt": tag.last_seen_at.isoformat() if tag.last_seen_at else None,
        "metadata": tag.metadata_ or {},
    }


def baseline_item(baseline: ProjectBaseline | None) -> dict[str, Any] | None:
    if baseline is None:
        return None
    return {
        "id": str(baseline.id),
        "sentinelSceneId": baseline.sentinel_scene_id,
        "baselineHash": baseline.baseline_hash,
        "pointsAnalyzed": baseline.points_analyzed,
        "vegetationCoverPct": float(baseline.vegetation_cover_pct),
        "ndviMean": float(baseline.ndvi_mean),
        "capturedAt": baseline.captured_at.isoformat(),
        "evidenceUri": baseline.evidence_uri,
    }


def certification_item(certification: Certification) -> dict[str, Any]:
    return {
        "id": str(certification.id),
        "methodology": certification.methodology,
        "creditPotential": float(certification.credit_potential),
        "decision": certification.decision,
        "notes": certification.notes,
        "signedDocumentHash": certification.signed_document_hash,
        "signedAt": certification.signed_at.isoformat() if certification.signed_at else None,
        "createdAt": certification.created_at.isoformat(),
    }


def public_certification_item(certification: Certification) -> dict[str, Any]:
    """Serializacao minimizada (D-20/D-22): sem notas internas."""
    return {
        "id": str(certification.id),
        "methodology": certification.methodology,
        "creditPotential": float(certification.credit_potential),
        "decision": certification.decision,
        "signedDocumentHash": certification.signed_document_hash,
        "signedAt": certification.signed_at.isoformat() if certification.signed_at else None,
        "createdAt": certification.created_at.isoformat(),
    }


def public_boundary_item(boundary: dict[str, Any] | None) -> dict[str, Any] | None:
    """Visao publica da geometria (D-20/D-22).

    Mesmo padrao de public_certification_item/public_document_item: a geometria
    em si ja e publica (os vertices aparecem no dossie desde a Phase 3), mas
    declaredSource e a telemetria de divergencia de area sao metadados internos
    de validacao e nao saem no dossie publico.
    """
    if boundary is None:
        return None
    return {
        "declared": boundary["declared"],
        "active": boundary["active"],
        "declaredAreaHa": boundary["declaredAreaHa"],
        "declaredVertexCount": boundary["declaredVertexCount"],
        "activeTier": boundary["activeTier"],
    }


def public_document_item(document: Document) -> dict[str, Any]:
    """Documento publico: referencia e hash, sem metadados operacionais internos."""
    return {
        "id": str(document.id),
        "type": document.document_type,
        "sha256Hash": document.sha256_hash,
        "mimeType": document.mime_type,
        "sizeBytes": document.size_bytes,
        "uploadedAt": document.uploaded_at.isoformat(),
        "storagePath": document.storage_path,
        "downloadAvailable": bool(document.storage_object_path),
    }


def audit_item(audit: Audit) -> dict[str, Any]:
    return {
        "id": str(audit.id),
        "status": audit.status,
        "reportText": audit.report_text,
        "latitude": float(audit.latitude) if audit.latitude is not None else None,
        "longitude": float(audit.longitude) if audit.longitude is not None else None,
        "evidenceUrls": list(audit.evidence_urls or []),
        "digitalSignature": audit.digital_signature,
        "auditedAt": audit.audited_at.isoformat() if audit.audited_at else None,
        "createdAt": audit.created_at.isoformat(),
    }


def document_item(document: Document) -> dict[str, Any]:
    # Dossiê público: nunca expor bucket/caminho de storage, hash completo ou
    # metadata bruta (pode conter filename original) — só o suficiente para
    # a UI listar o documento. Caminho/hash reais ficam restritos a rotas
    # autenticadas que já os retornam via draft_document_item().
    return {
        "id": str(document.id),
        "type": document.document_type,
        "sha256Hash": mask_token(document.sha256_hash),
        "mimeType": document.mime_type,
        "sizeBytes": document.size_bytes,
        "uploadedAt": document.uploaded_at.isoformat(),
    }


def draft_document_item(document: ProjectDraftDocument) -> ProjectDraftDocumentItem:
    metadata = document.metadata_ or {}
    return ProjectDraftDocumentItem(
        id=str(document.id),
        documentType=document.document_type,
        filename=metadata.get("filename"),
        mimeType=document.mime_type,
        sizeBytes=document.size_bytes,
        sha256=document.sha256_hash,
        storageBucket=document.storage_bucket,
        storageObjectPath=document.storage_object_path,
        storagePath=document.storage_path,
        uploadedAt=document.uploaded_at.isoformat(),
        status="UPLOADED",
    )


def credit_item(credit: EnvironmentalCredit) -> dict[str, Any]:
    return {
        "id": str(credit.id),
        "vintage": credit.vintage,
        "quantityTotal": float(credit.quantity_total),
        "quantityAvailable": float(credit.quantity_available),
        "quantityRetired": float(credit.quantity_retired),
        "status": credit.status,
        "unit": credit.unit,
        "serialStart": credit.serial_start,
        "serialEnd": credit.serial_end,
        "tokenMetadata": credit.token_metadata or {},
    }


def chain_event_item(event: ChainEvent) -> dict[str, Any]:
    return {
        "id": str(event.id),
        "eventType": event.event_type,
        "chain": event.chain,
        "transactionHash": event.transaction_hash,
        "sourceTxHash": event.source_tx_hash,
        "amount": float(event.amount) if event.amount is not None else None,
        "status": event.status,
        "payload": event.payload or {},
        "createdAt": event.created_at.isoformat(),
    }


def ledger_transaction_item(
    entry: LedgerEntry,
    account: LedgerAccount,
    project: Project | None,
    event: ChainEvent | None,
) -> dict[str, Any]:
    metadata = entry.metadata_ or {}
    tx_type = {
        "PURCHASE": "received",
        "RECEIVED": "received",
        "CREDIT_ISSUED": "received",
        "TRANSFER_SENT": "sent",
        "RETIREMENT": "retired",
        "BURN": "retired",
        "MINT": "minted",
    }.get(entry.entry_type, "received")
    return {
        "id": metadata.get("frontend_id") or str(entry.id),
        "type": tx_type,
        "asset": metadata.get("asset") or (project.name if project is not None else "Crédito SINARCA"),
        "amount": f"{abs(float(entry.amount)):g}",
        "unit": entry.unit,
        "date": metadata.get("date_label") or entry.created_at.isoformat(),
        "createdAt": entry.created_at.isoformat(),
        "status": metadata.get("status") or ("pending" if event is not None and event.status == "PENDING" else "completed"),
        "hash": metadata.get("hash") or (event.transaction_hash if event is not None else entry.idempotency_key),
        "projectId": project.friendly_id if project is not None else None,
        "buyer": account.external_id,
        "entities": {
            "from": entry.counterparty or "Protocolo",
            "to": "Minha Conta" if float(entry.amount) >= 0 else "Aposentadoria",
        },
        "ledgerAccount": account.external_id,
    }


def mask_token(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return value
    return f"{value[:4]}...{value[-4:]}"


def entity_from_org(organization: Organization | None, *, default_role: str) -> ParticipatingEntity:
    if organization is None:
        return ParticipatingEntity(id="pending", name="Pendente", role=default_role, verified=False)
    normalized_role = ROLE_LABELS.get(organization.role.strip().lower(), default_role)
    return ParticipatingEntity(
        id=organization.external_id,
        name=organization.name,
        role=normalized_role,  # type: ignore[arg-type]
        verified=organization.authorized,
    )


def _methodology_for_type(project_type: str) -> str:
    normalized = project_type.strip().lower()
    if "solar" in normalized or "energy" in normalized:
        return "ACM0002"
    if "forest" in normalized or "reforest" in normalized or "restaur" in normalized:
        return "AR-ACM0003"
    return "VM0015 (Verra)"


def _area_from_tags(tags: list[Any] | None) -> float:
    if not tags:
        return 1000.0
    lat_span = max(tag.latitude for tag in tags) - min(tag.latitude for tag in tags)
    lng_span = max(tag.longitude for tag in tags) - min(tag.longitude for tag in tags)
    return max(round((abs(lat_span * lng_span) * 12321) + 100, 2), 100.0)


def _credit_potential_from_baseline(baseline: BaselineDTO) -> float:
    return round(baseline.vegetation_cover_pct * baseline.ndvi_mean * 100, 2)
