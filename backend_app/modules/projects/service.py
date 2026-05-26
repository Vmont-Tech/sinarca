from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import (
    Audit,
    Certification,
    ChainEvent,
    Document,
    EnvironmentalCredit,
    LedgerAccount,
    LedgerEntry,
    Organization,
    Profile,
    Project,
    ProjectBaseline,
    ProjectTag,
)
from backend_app.db.repositories import create_audit_event
from backend_app.modules.projects.schemas import (
    BaselineDTO,
    BlockchainData,
    CatalogResponse,
    ParticipatingEntity,
    ProjectCreate,
    ProjectEntities,
    ProjectLocation,
    ProjectMetrics,
    ProjectMRCA,
    ProjectPublicDossierResponse,
)

ROLE_LABELS = {
    "certifier": "Certifier",
    "auditor": "Auditor",
    "developer": "Developer",
    "producer": "Developer",
    "registry": "Registry",
    "compensator": "Compensator",
    "company": "Compensator",
}


class ProjectsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_projects(self, *, status_filter: str | None, state: str | None, limit: int) -> list[ProjectMRCA]:
        statement = select(Project)
        if status_filter and status_filter.lower() != "all":
            statement = statement.where(Project.status.ilike(status_filter.strip()))
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

        return ProjectPublicDossierResponse(
            project=project_dto,
            tags=[tag_item(tag) for tag in tags],
            baseline=baseline_item(baseline),
            certifications=[certification_item(item) for item in certifications],
            audits=[audit_item(item) for item in audits],
            documents=[document_item(item) for item in documents],
            credits=[credit_item(item) for item in credits],
            chainEvents=[chain_event_item(item) for item in chain_events],
            transactions=[ledger_transaction_item(entry, account, project, event) for entry, account, event in transaction_rows],
        )

    async def create_project(self, payload: ProjectCreate, *, actor_id: str | None, actor_role: str | None) -> ProjectMRCA:
        validate_project_tags(payload.tags)

        producer = await self._resolve_producer(payload.producer_id, actor_id)
        certifier = await self._get_organization(payload.certifier_id)
        registry = await self._get_first_organization_by_role("registry")
        auditor = await self._get_first_organization_by_role("auditor")
        friendly_id = await self._next_friendly_id()
        baseline = deterministic_baseline(payload)
        now = datetime.now(timezone.utc)
        source_hash = "baseline-" + baseline.baseline_hash

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
            producer_organization_id=producer.id,
            developer_organization_id=producer.id,
            auditor_organization_id=auditor.id if auditor else None,
            certifier_organization_id=certifier.id,
            registry_organization_id=registry.id if registry else None,
            city=payload.location.city,
            state=payload.location.state,
            state_id=payload.location.stateId,
            biome=payload.location.bioma,
            latitude=Decimal(str(payload.location.coordinates.lat)),
            longitude=Decimal(str(payload.location.coordinates.lng)),
            svg_x=Decimal(str(payload.location.coordinates.svgX)) if payload.location.coordinates.svgX is not None else None,
            svg_y=Decimal(str(payload.location.coordinates.svgY)) if payload.location.coordinates.svgY is not None else None,
            area_hectares=Decimal(str(payload.area_hectares or _area_from_tags(payload.tags))),
            carbon_stock=Decimal(str(payload.carbon_stock or _credit_potential_from_baseline(baseline))),
            investment_value_brl=Decimal("0"),
            vintage=str(now.year),
            image_url="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
            serial_start=f"BR-{now.year}-{friendly_id[-3:]}-000001",
            serial_end=f"BR-{now.year}-{friendly_id[-3:]}-{int(_credit_potential_from_baseline(baseline)):06d}",
            contract_address="pending",
            merkle_root=baseline.baseline_hash,
            blockchain_timestamp=baseline.captured_at,
            timeline=initial_project_timeline(now, has_tags=bool(payload.tags)),
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
            self.session.add(
                ProjectTag(
                    project_id=project.id,
                    tag_uid=tag.tag_uid,
                    cmac=tag.cmac,
                    latitude=Decimal(str(tag.latitude)),
                    longitude=Decimal(str(tag.longitude)),
                    vertex_label=tag.vertex_label.strip().upper(),
                    first_seen_at=now,
                    last_seen_at=now,
                    metadata_={"source": "api-v1-project-create"},
                )
            )

        await create_audit_event(
            self.session,
            action="PROJECT_CREATED",
            entity_type="projects",
            entity_id=project.id,
            actor_role=actor_role,
            metadata={"actor_external_id": actor_id, "friendly_id": friendly_id},
        )
        await self.session.commit()
        return await self.project_to_mrca(project)

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
    if len(tags) != 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Projeto deve informar exatamente 4 tags NFC")
    labels = [tag.vertex_label.strip().upper() for tag in tags]
    if sorted(labels) != ["A", "B", "C", "D"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Projeto deve informar os vértices A, B, C e D")


def initial_project_timeline(now: datetime, *, has_tags: bool) -> list[dict[str, str]]:
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
    if has_tags:
        events.insert(
            1,
            {
                "code": "QTAGS_RECORDED",
                "title": "QTAGs registradas",
                "date": today,
                "status": "complete",
                "desc": "Quatro QTAGs/vértices A, B, C e D foram registrados.",
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
    return {
        "id": str(tag.id),
        "tagUid": tag.tag_uid,
        "cmac": mask_token(tag.cmac),
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
    return {
        "id": str(document.id),
        "type": document.document_type,
        "storagePath": document.storage_path,
        "sha256Hash": document.sha256_hash,
        "mimeType": document.mime_type,
        "sizeBytes": document.size_bytes,
        "uploadedAt": document.uploaded_at.isoformat(),
        "metadata": document.metadata_ or {},
    }


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
