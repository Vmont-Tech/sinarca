from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import Claim, Document, Evidence, Project
from backend_app.db.repositories import create_audit_event
from backend_app.modules.integrity.constants import (
    CLAIM_CONFIDENCE_DECLARED,
    CLAIM_CONFIDENCE_EVIDENCE_PENDING,
    CLAIM_CONFIDENCE_EVIDENCE_VERIFIED,
    CLAIM_TYPE_LAND_OWNERSHIP,
    CLAIM_TYPE_LAND_POSSESSION,
    CLAIM_TYPE_RIGHT_TO_OPERATE,
)

# D-18: documentos que sustentam o Claim de terra. Qualquer outro tipo de
# documento (inventario, KML/SHP, certificado, etc.) e evidencia do Claim
# RIGHT_TO_OPERATE.
LAND_DOCUMENT_TYPES: frozenset[str] = frozenset({"LEGAL_OWNERSHIP", "CAR"})


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
