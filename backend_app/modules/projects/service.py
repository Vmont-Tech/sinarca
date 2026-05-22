from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import Organization, Project, ProjectBaseline, ProjectTag
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

    async def create_project(self, payload: ProjectCreate, *, actor_id: str | None, actor_role: str | None) -> ProjectMRCA:
        if payload.tags is not None and len(payload.tags) != 4:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Projeto deve informar exatamente 4 tags NFC")

        producer = await self._get_organization(payload.producer_id)
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
            area_hectares=Decimal(str(_area_from_tags(payload.tags))),
            carbon_stock=Decimal(str(_credit_potential_from_baseline(baseline))),
            investment_value_brl=Decimal("0"),
            vintage=str(now.year),
            image_url="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
            serial_start=f"BR-{now.year}-{friendly_id[-3:]}-000001",
            serial_end=f"BR-{now.year}-{friendly_id[-3:]}-{int(_credit_potential_from_baseline(baseline)):06d}",
            contract_address="pending",
            merkle_root=baseline.baseline_hash,
            blockchain_timestamp=baseline.captured_at,
            timeline=[
                {
                    "title": "Registro do Projeto",
                    "date": now.date().isoformat(),
                    "status": "active",
                    "desc": "Projeto registrado na API persistente e aguardando certificação.",
                }
            ],
            metadata_={"project_type": payload.project_type, "baseline_adapter": "deterministic_mock"},
        )
        self.session.add(project)
        await self.session.flush()

        self.session.add(
            ProjectBaseline(
                project_id=project.id,
                sentinel_scene_id=f"MOCK_SENTINEL_{friendly_id}",
                baseline_hash=baseline.baseline_hash,
                points_analyzed=baseline.points_analyzed,
                vegetation_cover_pct=Decimal(str(baseline.vegetation_cover_pct)),
                ndvi_mean=Decimal(str(baseline.ndvi_mean)),
                captured_at=baseline.captured_at,
                evidence_uri=f"s3://sinarca-demo/baselines/{friendly_id}.json",
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
                    vertex_label=tag.vertex_label,
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
        return CatalogResponse(**{response_key: items})

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
                developer=entity_from_org(orgs.get(project.developer_organization_id), fallback_role="Developer"),
                auditor=entity_from_org(orgs.get(project.auditor_organization_id), fallback_role="Auditor"),
                certifier=entity_from_org(orgs.get(project.certifier_organization_id), fallback_role="Certifier"),
                registry=entity_from_org(orgs.get(project.registry_organization_id), fallback_role="Registry"),
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

    async def _get_first_organization_by_role(self, role: str) -> Organization | None:
        result = await self.session.execute(
            select(Organization).where(func.lower(Organization.role) == role.lower()).order_by(Organization.name).limit(1)
        )
        return result.scalar_one_or_none()

    async def _organization_map(self, ids: list[Any | None]) -> dict[Any, Organization]:
        clean_ids = [item for item in ids if item is not None]
        if not clean_ids:
            return {}
        rows = list((await self.session.execute(select(Organization).where(Organization.id.in_(clean_ids)))).scalars().all())
        return {row.id: row for row in rows}

    async def _next_friendly_id(self) -> str:
        year = datetime.now(timezone.utc).year
        count = await self.session.scalar(select(func.count()).select_from(Project))
        return f"PRC-{year}-{int(count or 0) + 1:03d}"


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


def catalog_item(organization: Organization) -> dict[str, Any]:
    item = {
        "id": organization.external_id,
        "name": organization.name,
        "role": organization.role,
        "website": organization.website,
        "logo": organization.logo_url or "",
        "authorized": organization.authorized,
        "verified": organization.authorized,
        **(organization.metadata_ or {}),
    }
    item.setdefault("projects", 0)
    item.setdefault("total_impact", 0)
    return item


def entity_from_org(organization: Organization | None, *, fallback_role: str) -> ParticipatingEntity:
    if organization is None:
        return ParticipatingEntity(id="pending", name="Pendente", role=fallback_role, verified=False)
    normalized_role = ROLE_LABELS.get(organization.role.strip().lower(), fallback_role)
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

