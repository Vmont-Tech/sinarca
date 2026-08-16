from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Sequence

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.config import Settings, get_settings
from backend_app.db.models import Claim, Conflict, Document, Evidence, Project, ProjectRiskAssessment, RiskSignal
from backend_app.db.repositories import create_audit_event
from backend_app.modules.integrity.constants import (
    CLAIM_CONFIDENCE_DECLARED,
    CLAIM_CONFIDENCE_EVIDENCE_PENDING,
    CLAIM_CONFIDENCE_EVIDENCE_VERIFIED,
    CLAIM_TYPE_LAND_OWNERSHIP,
    CLAIM_TYPE_LAND_POSSESSION,
    CLAIM_TYPE_RIGHT_TO_OPERATE,
    CONFLICT_SEVERITIES,
    PUBLIC_INTEGRITY_STATUS_BY_INTERNAL,
    RISK_CLASS_AUTO_HOLD,
)
from backend_app.modules.integrity.risk_engine import (
    ClaimSnapshot,
    ConflictSnapshot,
    compute_signals,
    integrity_status_for,
    risk_class_for_score,
    score_from_signals,
)

# D-18: documentos que sustentam o Claim de terra. Qualquer outro tipo de
# documento (inventario, KML/SHP, certificado, etc.) e evidencia do Claim
# RIGHT_TO_OPERATE.
LAND_DOCUMENT_TYPES: frozenset[str] = frozenset({"LEGAL_OWNERSHIP", "CAR"})

# D-20: ordem de severidade para ordenar /conflicts com CRITICAL primeiro.
_SEVERITY_RANK: dict[str, int] = {name: idx for idx, name in enumerate(CONFLICT_SEVERITIES)}


def overlap_severity(percentage: float, settings: Settings | None = None) -> str:
    """Severidade do overlap (D-10 / Bible secao 16), limiares configuraveis.

    0%           -> CLEAR
    >0% ate 1%   -> INFO
    >1% ate 5%   -> LOW
    >5% ate 20%  -> MEDIUM
    >20% ate 50% -> HIGH
    >50%         -> CRITICAL
    """
    config = settings or get_settings()
    if percentage <= 0:
        return "CLEAR"
    if percentage <= config.integrity_overlap_severity_info_pct:
        return "INFO"
    if percentage <= config.integrity_overlap_severity_low_pct:
        return "LOW"
    if percentage <= config.integrity_overlap_severity_medium_pct:
        return "MEDIUM"
    if percentage <= config.integrity_overlap_severity_high_pct:
        return "HIGH"
    return "CRITICAL"


def _evidence_item(evidence: Evidence) -> dict[str, Any]:
    return {
        "id": str(evidence.id),
        "claimId": str(evidence.claim_id) if evidence.claim_id is not None else None,
        "documentId": str(evidence.document_id) if evidence.document_id is not None else None,
        "type": evidence.type,
        "source": evidence.source,
        "sourceType": evidence.source_type,
        "hash": evidence.hash,
        "validationMethod": evidence.validation_method,
        "validationStatus": evidence.validation_status,
        "verifiedAt": evidence.verified_at.isoformat() if evidence.verified_at else None,
        "createdAt": evidence.created_at.isoformat(),
    }


class IntegrityService:
    """Camada Claim/Evidence do Sinarca Integrity Layer (Phase 04.2).

    D-01/D-03: todo dado enviado pelo cliente vira uma declaracao (Claim)
    DECLARED, nunca um fato verificado. D-07/D-08: Evidence so reaproveita o
    hash ja calculado pelo backend em documents.sha256_hash e so grava os
    validation_method computaveis sem registro externo (HASH_INTEGRITY,
    STRUCTURAL_COMPLETENESS) nesta fase.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # Claims de originacao
    # ------------------------------------------------------------------

    async def create_origination_claims(
        self,
        project: Project,
        *,
        actor_id: str | None,
        actor_role: str | None,
    ) -> list[Claim]:
        land_claim_type = await self._land_claim_type(project)
        claim_specs = (
            (land_claim_type, self._land_claim_statement(project, land_claim_type)),
            (
                CLAIM_TYPE_RIGHT_TO_OPERATE,
                f"Produtor declara direito de operar o projeto {project.friendly_id} "
                f"sob a metodologia {project.methodology}.",
            ),
        )

        now = datetime.now(timezone.utc)
        created: list[Claim] = []
        for claim_type, statement in claim_specs:
            existing = (
                await self.session.execute(
                    select(Claim).where(Claim.project_id == project.id, Claim.type == claim_type)
                )
            ).scalar_one_or_none()
            if existing is not None:
                continue
            claim = Claim(
                project_id=project.id,
                claimant_organization_id=project.producer_organization_id,
                type=claim_type,
                statement=statement,
                status="DECLARED",
                confidence_score=CLAIM_CONFIDENCE_DECLARED,
                valid_from=now,
                metadata_={"source": "origination", "friendly_id": project.friendly_id},
            )
            self.session.add(claim)
            created.append(claim)

        if created:
            await self.session.flush()
            for claim in created:
                await create_audit_event(
                    self.session,
                    action="CLAIM_CREATED",
                    entity_type="claims",
                    entity_id=claim.id,
                    actor_role=actor_role,
                    metadata={
                        "actor_external_id": actor_id,
                        "friendly_id": project.friendly_id,
                        "project_id": str(project.id),
                        "claim_type": claim.type,
                        "status": claim.status,
                        "confidence_score": claim.confidence_score,
                    },
                )

        return (
            await self.session.execute(
                select(Claim).where(Claim.project_id == project.id).order_by(Claim.created_at)
            )
        ).scalars().all()  # type: ignore[return-value]

    async def _land_claim_type(self, project: Project) -> str:
        has_legal_ownership = (
            await self.session.execute(
                select(Document.id)
                .where(Document.project_id == project.id, Document.document_type == "LEGAL_OWNERSHIP")
                .limit(1)
            )
        ).scalar_one_or_none()
        return CLAIM_TYPE_LAND_OWNERSHIP if has_legal_ownership is not None else CLAIM_TYPE_LAND_POSSESSION

    def _land_claim_statement(self, project: Project, claim_type: str) -> str:
        possession_word = "propriedade" if claim_type == CLAIM_TYPE_LAND_OWNERSHIP else "posse"
        return (
            f"Produtor declara {possession_word} da area de {float(project.area_hectares):.2f} ha "
            f"em {project.city}/{project.state_id.upper()}."
        )

    # ------------------------------------------------------------------
    # Evidence a partir de Document
    # ------------------------------------------------------------------

    async def create_evidence_for_document(
        self,
        document: Document,
        *,
        project: Project,
        actor_id: str | None,
        actor_role: str | None,
    ) -> Evidence | None:
        if document.project_id is None:
            # Documentos de inventario (nao vinculados a projeto) nao geram Evidence.
            return None

        document_type = document.document_type.upper()

        # D-18: reconciliar ANTES de resolver o Claim alvo, para que um upload
        # LEGAL_OWNERSHIP ja aponte para o Claim LAND_OWNERSHIP na mesma chamada.
        if document_type == "LEGAL_OWNERSHIP":
            await self._reconcile_land_claim_type(project, actor_id=actor_id, actor_role=actor_role)

        claim = await self._resolve_target_claim(project, document_type)
        if claim is None:
            # Projeto legado sem Claims de originacao: garante-os agora.
            await self.create_origination_claims(project, actor_id=actor_id, actor_role=actor_role)
            claim = await self._resolve_target_claim(project, document_type)

        existing_evidence = (
            await self.session.execute(
                select(Evidence).where(
                    Evidence.document_id == document.id,
                    Evidence.validation_method == "HASH_INTEGRITY",
                )
            )
        ).scalar_one_or_none()
        if existing_evidence is not None:
            return existing_evidence

        evidence = Evidence(
            project_id=document.project_id,
            claim_id=claim.id if claim is not None else None,
            document_id=document.id,
            type=document.document_type,
            source=document.document_type,
            source_type="SELF_DECLARED",
            hash=document.sha256_hash,
            validation_method="HASH_INTEGRITY",
            validation_status="VERIFIED",
            verified_at=datetime.now(timezone.utc),
            issued_at=document.uploaded_at,
            metadata_={"storage_path": document.storage_path, "mime_type": document.mime_type},
        )
        self.session.add(evidence)
        await self.session.flush()

        await self._sync_structural_completeness_evidence(project, actor_id=actor_id, actor_role=actor_role)
        await self._recompute_claim_states(project)

        await create_audit_event(
            self.session,
            action="EVIDENCE_CREATED",
            entity_type="evidence",
            entity_id=evidence.id,
            actor_role=actor_role,
            metadata={
                "actor_external_id": actor_id,
                "friendly_id": project.friendly_id,
                "document_id": str(document.id),
                "document_type": document.document_type,
                "sha256": document.sha256_hash,
                "claim_id": str(claim.id) if claim is not None else None,
                "validation_method": "HASH_INTEGRITY",
            },
        )
        return evidence

    async def _resolve_target_claim(self, project: Project, document_type: str) -> Claim | None:
        if document_type in LAND_DOCUMENT_TYPES:
            statement = select(Claim).where(
                Claim.project_id == project.id,
                Claim.type.in_((CLAIM_TYPE_LAND_OWNERSHIP, CLAIM_TYPE_LAND_POSSESSION)),
            )
        else:
            statement = select(Claim).where(
                Claim.project_id == project.id, Claim.type == CLAIM_TYPE_RIGHT_TO_OPERATE
            )
        return (await self.session.execute(statement)).scalar_one_or_none()

    async def _reconcile_land_claim_type(
        self, project: Project, *, actor_id: str | None, actor_role: str | None
    ) -> None:
        claim = (
            await self.session.execute(
                select(Claim).where(Claim.project_id == project.id, Claim.type == CLAIM_TYPE_LAND_POSSESSION)
            )
        ).scalar_one_or_none()
        if claim is None:
            return

        has_legal_ownership = (
            await self.session.execute(
                select(Document.id)
                .where(Document.project_id == project.id, Document.document_type == "LEGAL_OWNERSHIP")
                .limit(1)
            )
        ).scalar_one_or_none()
        if has_legal_ownership is None:
            return

        before_type = claim.type
        claim.type = CLAIM_TYPE_LAND_OWNERSHIP
        claim.statement = self._land_claim_statement(project, CLAIM_TYPE_LAND_OWNERSHIP)
        claim.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await create_audit_event(
            self.session,
            action="CLAIM_TYPE_RECONCILED",
            entity_type="claims",
            entity_id=claim.id,
            actor_role=actor_role,
            before_data={"type": before_type},
            after_data={"type": claim.type},
            metadata={"actor_external_id": actor_id, "friendly_id": project.friendly_id},
        )

    async def _sync_structural_completeness_evidence(
        self, project: Project, *, actor_id: str | None, actor_role: str | None
    ) -> None:
        document_types = {
            str(row[0]).upper()
            for row in (
                await self.session.execute(select(Document.document_type).where(Document.project_id == project.id))
            ).all()
        }
        complete = bool(LAND_DOCUMENT_TYPES & document_types) and "FOREST_INVENTORY" in document_types

        right_to_operate_claim = (
            await self.session.execute(
                select(Claim).where(Claim.project_id == project.id, Claim.type == CLAIM_TYPE_RIGHT_TO_OPERATE)
            )
        ).scalar_one_or_none()
        if right_to_operate_claim is None:
            return

        now = datetime.now(timezone.utc)
        validation_status = "VERIFIED" if complete else "PENDING"
        metadata = {"document_types": sorted(document_types), "required": ["LEGAL_OWNERSHIP|CAR", "FOREST_INVENTORY"]}

        existing = (
            await self.session.execute(
                select(Evidence).where(
                    Evidence.claim_id == right_to_operate_claim.id,
                    Evidence.validation_method == "STRUCTURAL_COMPLETENESS",
                )
            )
        ).scalar_one_or_none()

        if existing is not None:
            existing.validation_status = validation_status
            existing.verified_at = now if complete else None
            existing.metadata_ = metadata
            existing.updated_at = now
            await self.session.flush()
            return

        evidence = Evidence(
            project_id=project.id,
            claim_id=right_to_operate_claim.id,
            document_id=None,
            type="DOSSIER_STRUCTURE",
            source="project_dossier",
            source_type="SELF_DECLARED",
            hash=project.source_hash or project.friendly_id,
            validation_method="STRUCTURAL_COMPLETENESS",
            validation_status=validation_status,
            verified_at=now if complete else None,
            metadata_=metadata,
        )
        self.session.add(evidence)
        await self.session.flush()

    async def _recompute_claim_states(self, project: Project) -> None:
        claims = (
            await self.session.execute(select(Claim).where(Claim.project_id == project.id))
        ).scalars().all()

        structural = (
            await self.session.execute(
                select(Evidence).where(
                    Evidence.project_id == project.id,
                    Evidence.validation_method == "STRUCTURAL_COMPLETENESS",
                )
            )
        ).scalar_one_or_none()
        structural_verified = structural is not None and structural.validation_status == "VERIFIED"

        now = datetime.now(timezone.utc)
        for claim in claims:
            evidence_rows = (
                await self.session.execute(select(Evidence).where(Evidence.claim_id == claim.id))
            ).scalars().all()
            has_verified_hash = any(
                item.validation_method == "HASH_INTEGRITY" and item.validation_status == "VERIFIED"
                for item in evidence_rows
            )

            if has_verified_hash and structural_verified:
                new_status, new_confidence = "EVIDENCE_VERIFIED", CLAIM_CONFIDENCE_EVIDENCE_VERIFIED
            elif evidence_rows:
                new_status, new_confidence = "EVIDENCE_PENDING", CLAIM_CONFIDENCE_EVIDENCE_PENDING
            else:
                new_status, new_confidence = "DECLARED", CLAIM_CONFIDENCE_DECLARED
            # D-08: status "VERIFIED" NUNCA e atribuido nesta fase — exige
            # verificacao independente, disponivel apenas na Phase 05.1.

            if claim.status == new_status and claim.confidence_score == new_confidence:
                continue

            before_status, before_confidence = claim.status, claim.confidence_score
            claim.status = new_status
            claim.confidence_score = new_confidence
            claim.updated_at = now
            await self.session.flush()
            await create_audit_event(
                self.session,
                action="CLAIM_STATE_RECOMPUTED",
                entity_type="claims",
                entity_id=claim.id,
                before_data={"status": before_status, "confidence_score": before_confidence},
                after_data={"status": new_status, "confidence_score": new_confidence},
                metadata={"friendly_id": project.friendly_id, "claim_type": claim.type},
            )

    # ------------------------------------------------------------------
    # Leitura (rotas org-scoped)
    # ------------------------------------------------------------------

    async def list_claims(self, project: Project) -> list[dict[str, Any]]:
        claims = (
            await self.session.execute(
                select(Claim).where(Claim.project_id == project.id).order_by(Claim.created_at)
            )
        ).scalars().all()

        items: list[dict[str, Any]] = []
        for claim in claims:
            evidence_rows = (
                await self.session.execute(
                    select(Evidence).where(Evidence.claim_id == claim.id).order_by(Evidence.created_at)
                )
            ).scalars().all()
            items.append(
                {
                    "id": str(claim.id),
                    "type": claim.type,
                    "status": claim.status,
                    "confidenceScore": claim.confidence_score,
                    "statement": claim.statement,
                    "validFrom": claim.valid_from.isoformat() if claim.valid_from else None,
                    "createdAt": claim.created_at.isoformat(),
                    "evidence": [_evidence_item(item) for item in evidence_rows],
                }
            )
        return items

    async def list_evidence(self, project: Project) -> list[dict[str, Any]]:
        evidence_rows = (
            await self.session.execute(
                select(Evidence).where(Evidence.project_id == project.id).order_by(Evidence.created_at)
            )
        ).scalars().all()
        return [_evidence_item(item) for item in evidence_rows]

    # ------------------------------------------------------------------
    # Conflict: interpretacao do overlap geoespacial (Phase 04.2 / INTG-03)
    # ------------------------------------------------------------------

    async def detect_and_persist_conflicts(
        self,
        project: Project,
        *,
        actor_id: str | None = None,
        actor_role: str | None = None,
    ) -> list[Project]:
        """Interpreta o overlap geoespacial (Phase 04.1) como Conflict.

        D-09/D-10: cada overlap vira uma linha GEOSPATIAL_OVERLAP com
        severidade CLEAR->CRITICAL, nos dois sentidos. D-12: DOUBLE_CLAIM so
        e avaliado entre pares JA sobrepostos (nunca varredura O(n^2)).
        D-11/D-20/D-23: re-derivado a cada chamada, idempotente, nunca
        deleta linha (RESOLVE ou atualiza severidade). Reusa
        detect_boundary_overlaps sem reescrever a query espacial (RESEARCH
        Pitfall 1). Retorna os projetos relacionados afetados (a Plan 04
        usa isso para recalcular o risco deles).
        """
        from backend_app.modules.projects.service import ProjectsService

        overlaps = await ProjectsService(self.session).detect_boundary_overlaps(str(project.id))

        now = datetime.now(timezone.utc)
        settings = get_settings()
        project_id_str = str(project.id)

        desired: dict[tuple[str, str, str], dict[str, Any]] = {}
        related_projects: dict[str, Project] = {}

        for item in overlaps:
            related_id = item["relatedProjectId"]
            pct_mine = float(item["overlapPercentage"])
            pct_related = float(item["overlapPercentageOfRelated"])
            area_ha = item["overlapAreaHa"]

            desired[(project_id_str, related_id, "GEOSPATIAL_OVERLAP")] = {
                "overlap_percentage": pct_mine,
                "overlap_area_ha": area_ha,
                "severity": overlap_severity(pct_mine, settings),
                "metadata_": {
                    "related_friendly_id": item["relatedProjectFriendlyId"],
                    "overlap_percentage_of_related": pct_related,
                },
            }
            desired[(related_id, project_id_str, "GEOSPATIAL_OVERLAP")] = {
                "overlap_percentage": pct_related,
                "overlap_area_ha": area_ha,
                "severity": overlap_severity(pct_related, settings),
                "metadata_": {
                    "related_friendly_id": project.friendly_id,
                    "overlap_percentage_of_related": pct_mine,
                },
            }

            # D-12: DOUBLE_CLAIM restrito aos pares que JA estao no overlap
            # geoespacial acima — nunca uma varredura global O(n^2).
            related = related_projects.get(related_id)
            if related is None:
                related = await self.session.get(Project, uuid.UUID(related_id))
                if related is not None:
                    related_projects[related_id] = related
            if (
                related is not None
                and related.methodology == project.methodology
                and related.vintage == project.vintage
            ):
                dc_metadata = {
                    "methodology": project.methodology,
                    "vintage": project.vintage,
                    "basis": "GEOSPATIAL_OVERLAP",
                }
                desired[(project_id_str, related_id, "DOUBLE_CLAIM")] = {
                    "overlap_percentage": pct_mine,
                    "overlap_area_ha": area_ha,
                    "severity": overlap_severity(pct_mine, settings),
                    "metadata_": dc_metadata,
                }
                desired[(related_id, project_id_str, "DOUBLE_CLAIM")] = {
                    "overlap_percentage": pct_related,
                    "overlap_area_ha": area_ha,
                    "severity": overlap_severity(pct_related, settings),
                    "metadata_": dc_metadata,
                }

        existing_rows = (
            await self.session.execute(
                select(Conflict).where(
                    or_(Conflict.project_id == project.id, Conflict.related_project_id == project.id)
                )
            )
        ).scalars().all()
        existing_by_key: dict[tuple[str, str, str], Conflict] = {
            (str(row.project_id), str(row.related_project_id), row.type): row for row in existing_rows
        }

        affected_ids: set[str] = set()

        # Reconciliar (D-20): par existente que saiu do conjunto desejado e
        # ainda OPEN -> RESOLVED. Nunca deletar (T-04.2-12).
        for key, row in existing_by_key.items():
            if key in desired or row.status != "OPEN":
                continue
            row.status = "RESOLVED"
            row.resolved_at = now
            row.updated_at = now
            await self.session.flush()
            await create_audit_event(
                self.session,
                action="CONFLICT_RESOLVED",
                entity_type="conflicts",
                entity_id=row.id,
                actor_role=actor_role,
                metadata={
                    "actor_external_id": actor_id,
                    "project_id": key[0],
                    "related_project_id": key[1],
                    "type": key[2],
                    "severity": row.severity,
                    "overlap_percentage": float(row.overlap_percentage) if row.overlap_percentage is not None else None,
                },
            )
            if key[0] != project_id_str:
                affected_ids.add(key[0])
            if key[1] != project_id_str:
                affected_ids.add(key[1])

        # Criar ou atualizar cada linha do conjunto desejado.
        for key, spec in desired.items():
            row_project_id, row_related_id, row_type = key
            row = existing_by_key.get(key)
            if row is None:
                row = Conflict(
                    project_id=uuid.UUID(row_project_id),
                    related_project_id=uuid.UUID(row_related_id),
                    type=row_type,
                    severity=spec["severity"],
                    overlap_percentage=spec["overlap_percentage"],
                    overlap_area_ha=spec["overlap_area_ha"],
                    status="OPEN",
                    detected_at=now,
                    metadata_=spec["metadata_"],
                )
                self.session.add(row)
                await self.session.flush()
                await create_audit_event(
                    self.session,
                    action="CONFLICT_DETECTED",
                    entity_type="conflicts",
                    entity_id=row.id,
                    actor_role=actor_role,
                    metadata={
                        "actor_external_id": actor_id,
                        "project_id": row_project_id,
                        "related_project_id": row_related_id,
                        "type": row_type,
                        "severity": row.severity,
                        "overlap_percentage": spec["overlap_percentage"],
                    },
                )
            else:
                before_severity = row.severity
                row.overlap_percentage = spec["overlap_percentage"]
                row.overlap_area_ha = spec["overlap_area_ha"]
                row.severity = spec["severity"]
                row.status = "OPEN"
                row.resolved_at = None
                row.metadata_ = spec["metadata_"]
                row.updated_at = now
                await self.session.flush()
                if before_severity != row.severity:
                    await create_audit_event(
                        self.session,
                        action="CONFLICT_SEVERITY_CHANGED",
                        entity_type="conflicts",
                        entity_id=row.id,
                        actor_role=actor_role,
                        before_data={"severity": before_severity},
                        after_data={"severity": row.severity},
                        metadata={
                            "actor_external_id": actor_id,
                            "project_id": row_project_id,
                            "related_project_id": row_related_id,
                            "type": row_type,
                            "severity": row.severity,
                            "overlap_percentage": spec["overlap_percentage"],
                        },
                    )
            if row_project_id != project_id_str:
                affected_ids.add(row_project_id)
            if row_related_id != project_id_str:
                affected_ids.add(row_related_id)

        await self.session.flush()

        affected: list[Project] = []
        for pid in affected_ids:
            related = related_projects.get(pid)
            if related is None:
                related = await self.session.get(Project, uuid.UUID(pid))
                if related is not None:
                    related_projects[pid] = related
            if related is not None:
                affected.append(related)
        return affected

    async def list_conflicts(
        self, project: Project, *, status_filter: str | None = None
    ) -> list[dict[str, Any]]:
        statement = select(Conflict).where(Conflict.project_id == project.id)
        if status_filter is not None:
            statement = statement.where(Conflict.status == status_filter)
        rows = (await self.session.execute(statement)).scalars().all()

        def _sort_key(row: Conflict) -> tuple[int, datetime]:
            return (_SEVERITY_RANK.get(row.severity, 0), row.detected_at)

        rows = sorted(rows, key=_sort_key, reverse=True)

        return [
            {
                "id": str(row.id),
                "type": row.type,
                "severity": row.severity,
                "status": row.status,
                "overlapPercentage": float(row.overlap_percentage) if row.overlap_percentage is not None else None,
                "overlapAreaHa": float(row.overlap_area_ha) if row.overlap_area_ha is not None else None,
                "relatedProjectId": str(row.related_project_id) if row.related_project_id is not None else None,
                "relatedProjectFriendlyId": (row.metadata_ or {}).get("related_friendly_id"),
                "detectedAt": row.detected_at.isoformat() if row.detected_at else None,
                "resolvedAt": row.resolved_at.isoformat() if row.resolved_at else None,
            }
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Risk Engine: recalculo append-only + Auto Hold (Phase 04.2 / INTG-04)
    # ------------------------------------------------------------------

    async def recalculate_risk_score(
        self,
        project: Project,
        *,
        trigger: str,
        actor_id: str | None = None,
        actor_role: str | None = None,
    ) -> ProjectRiskAssessment:
        """Recompute PURO do risco (D-13/D-19, RESEARCH Pitfall 5).

        A cada chamada, le do banco TODO o estado atual de Claim/Evidence/
        Conflict do projeto -- nunca mantem total acumulado entre chamadas,
        o que garante que recalcular duas vezes com o mesmo estado produz o
        mesmo score. O resultado e sempre gravado como uma linha NOVA em
        risk_assessments (append-only, nunca update/delete) com um RiskSignal
        por sinal computado, para que o score nunca apareca sem a explicacao
        que o produziu.
        """
        claims = (
            await self.session.execute(select(Claim).where(Claim.project_id == project.id))
        ).scalars().all()
        evidence = (
            await self.session.execute(select(Evidence).where(Evidence.project_id == project.id))
        ).scalars().all()
        conflicts = (
            await self.session.execute(select(Conflict).where(Conflict.project_id == project.id))
        ).scalars().all()

        evidence_by_claim: dict[uuid.UUID, list[Evidence]] = {}
        for item in evidence:
            if item.claim_id is not None:
                evidence_by_claim.setdefault(item.claim_id, []).append(item)

        claim_snapshots = [
            ClaimSnapshot(
                type=claim.type,
                status=claim.status,
                has_evidence=bool(evidence_by_claim.get(claim.id)),
                has_verified_evidence=any(
                    e.validation_status == "VERIFIED" for e in evidence_by_claim.get(claim.id, [])
                ),
            )
            for claim in claims
        ]
        conflict_snapshots = [
            ConflictSnapshot(
                type=c.type,
                severity=c.severity,
                status=c.status,
                overlap_percentage=float(c.overlap_percentage or 0),
            )
            for c in conflicts
        ]

        signals = compute_signals(claim_snapshots, conflict_snapshots)
        score = score_from_signals(signals)
        risk_class = risk_class_for_score(score)
        integrity_status = integrity_status_for(claim_snapshots, risk_class=risk_class)
        auto_hold = risk_class == RISK_CLASS_AUTO_HOLD

        previous_integrity_status = project.integrity_status
        previous_risk_score = project.risk_score

        open_conflict_count = len([c for c in conflicts if c.status == "OPEN"])

        assessment = ProjectRiskAssessment(
            project_id=project.id,
            risk_score=score,
            risk_class=risk_class,
            integrity_status=integrity_status,
            auto_hold=auto_hold,
            trigger=trigger,
            metadata_={
                "claim_count": len(claims),
                "conflict_count": open_conflict_count,
                "evidence_count": len(evidence),
            },
        )
        self.session.add(assessment)
        await self.session.flush()

        for signal in signals:
            self.session.add(
                RiskSignal(
                    risk_assessment_id=assessment.id,
                    code=signal.code,
                    weight=Decimal(str(signal.weight)),
                    reason=signal.reason,
                    public_safe=signal.public_safe,
                    metadata_=signal.metadata,
                )
            )
        await self.session.flush()

        # D-04/D-06 (RESEARCH Pitfall 4): Auto Hold escreve exclusivamente o
        # eixo de integridade do projeto. "ON_HOLD" NAO e valor valido de
        # ProjectStatusEnum e "SUSPENDED" colidiria com a rejeicao da
        # certificadora -- a coluna operacional NUNCA e tocada aqui.
        project.risk_score = score
        project.integrity_status = integrity_status

        await create_audit_event(
            self.session,
            action="RISK_RECALCULATED",
            entity_type="risk_assessments",
            entity_id=assessment.id,
            actor_role=actor_role,
            before_data={"integrity_status": previous_integrity_status, "risk_score": previous_risk_score},
            after_data={"integrity_status": integrity_status, "risk_score": score, "risk_class": risk_class},
            metadata={
                "actor_external_id": actor_id,
                "friendly_id": project.friendly_id,
                "trigger": trigger,
                "signals": [s.code for s in signals],
            },
        )

        if auto_hold and previous_integrity_status != "ON_HOLD":
            # D-06: transicao para Auto Hold e uma regra de aceite
            # nao-discricionaria; precisa de trilha de auditoria propria,
            # separada do recalculo rotineiro.
            await create_audit_event(
                self.session,
                action="INTEGRITY_AUTO_HOLD",
                entity_type="risk_assessments",
                entity_id=assessment.id,
                actor_role=actor_role,
                before_data={"integrity_status": previous_integrity_status},
                after_data={"integrity_status": integrity_status, "risk_score": score},
                metadata={
                    "actor_external_id": actor_id,
                    "friendly_id": project.friendly_id,
                    "trigger": trigger,
                    "risk_score": score,
                    "signals": [s.code for s in signals],
                },
            )

        return assessment

    async def recalculate_for_related(
        self,
        projects: Sequence[Project],
        *,
        trigger: str,
        actor_id: str | None = None,
        actor_role: str | None = None,
    ) -> None:
        """Recalcula o risco dos projetos relacionados devolvidos por
        detect_and_persist_conflicts (o vizinho tambem passou a ter Conflict
        e sem isso o risco dele so seria atualizado na proxima edicao dele
        mesmo). Deduplicado por id; NUNCA chama detect_and_persist_conflicts
        aqui (evitaria recursao entre projetos vizinhos).
        """
        seen: set[uuid.UUID] = set()
        for related in projects:
            if related.id in seen:
                continue
            seen.add(related.id)
            await self.recalculate_risk_score(related, trigger=trigger, actor_id=actor_id, actor_role=actor_role)

    async def integrity_summary(self, project: Project) -> dict[str, Any]:
        """Visao INTERNA completa do risco do projeto (sinais explicados).

        A visao publica minimizada (allowlist de PUBLIC_RISK_SIGNAL_CODES,
        sem metadata) fica para a Plan 05.
        """
        assessment = (
            await self.session.execute(
                select(ProjectRiskAssessment)
                .where(ProjectRiskAssessment.project_id == project.id)
                .order_by(ProjectRiskAssessment.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        open_conflict_count = (
            await self.session.execute(
                select(Conflict).where(Conflict.project_id == project.id, Conflict.status == "OPEN")
            )
        ).scalars().all()
        claim_count = (
            await self.session.execute(select(Claim).where(Claim.project_id == project.id))
        ).scalars().all()

        signals: list[dict[str, Any]] = []
        if assessment is not None:
            signal_rows = (
                await self.session.execute(
                    select(RiskSignal)
                    .where(RiskSignal.risk_assessment_id == assessment.id)
                    .order_by(RiskSignal.created_at)
                )
            ).scalars().all()
            signals = [
                {
                    "code": row.code,
                    "weight": float(row.weight),
                    "reason": row.reason,
                    "publicSafe": row.public_safe,
                }
                for row in signal_rows
            ]

        return {
            "integrityStatus": project.integrity_status,
            "publicStatus": PUBLIC_INTEGRITY_STATUS_BY_INTERNAL.get(project.integrity_status, "UNDER_REVIEW"),
            "riskScore": project.risk_score,
            "riskClass": assessment.risk_class if assessment is not None else None,
            "autoHold": assessment.auto_hold if assessment is not None else False,
            "assessedAt": assessment.created_at.isoformat() if assessment is not None else None,
            "trigger": assessment.trigger if assessment is not None else None,
            "conflictCount": len(open_conflict_count),
            "claimCount": len(claim_count),
            "signals": signals,
        }
