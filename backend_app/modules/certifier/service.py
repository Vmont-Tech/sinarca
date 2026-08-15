from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import PurePath

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import (
    Certification,
    CertificationPendency,
    Document,
    EnvironmentalCredit,
    Project,
)
from backend_app.db.repositories import create_audit_event
from backend_app.modules.inventory import routes as inventory_upload
from backend_app.modules.projects.service import (
    CERTIFICATION_CERTIFICATE_DOCUMENT_TYPE,
    DOSSIER_INCOMPLETE_DETAIL,
    ProjectsService,
)
from backend_app.modules.storage_paths import project_document_location
from backend_app.modules.supabase_storage import upload_storage_object

DECISION_APPROVE = "APPROVE"
DECISION_REJECT = "REJECT"
DECISION_REQUEST_CHANGES = "REQUEST_CHANGES"

PENDENCY_CATEGORIES: tuple[str, ...] = (
    "DOCUMENTACAO_INCOMPLETA",
    "GEOFENCE_INVALIDA",
    "BASELINE_INCONSISTENTE",
    "METODOLOGIA_INADEQUADA",
    "POTENCIAL_DIVERGENTE",
    "OUTRO",
)
PENDENCY_CATEGORY_LABELS: dict[str, str] = {
    "DOCUMENTACAO_INCOMPLETA": "Documentação incompleta",
    "GEOFENCE_INVALIDA": "Geofence/QTAGs inválidas",
    "BASELINE_INCONSISTENTE": "Baseline inconsistente",
    "METODOLOGIA_INADEQUADA": "Metodologia inadequada",
    "POTENCIAL_DIVERGENTE": "Potencial de crédito divergente",
    "OUTRO": "Outro",
}
CERTIFICATE_REQUIRED_DETAIL = "Certificado em PDF é obrigatório para aprovação."
CATEGORY_REQUIRED_DETAIL = "Categoria estruturada é obrigatória para reprovação ou pedido de ajustes."
DESCRIPTION_REQUIRED_DETAIL = "Descrição do motivo é obrigatória para reprovação ou pedido de ajustes."
ADJUSTMENT_REASON_REQUIRED_DETAIL = (
    "Justificativa é obrigatória quando o potencial de crédito difere do valor sugerido pelo sistema."
)
CERTIFICATE_EXTENSION = ".pdf"
CREDIT_POTENTIAL_TOLERANCE = 0.01
STATUS_LABELS_APPROVED = ["Certificação aprovada", "Mint autorizado", "Aguardando tesouraria"]


class CertifierService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.projects = ProjectsService(session)

    async def _optional_actor_profile_id(self, actor: AuthenticatedUser) -> object | None:
        try:
            profile = await self.projects._actor_profile(actor.id)
        except HTTPException:
            return None
        return profile.id

    async def _validated_certificate(self, certificate: UploadFile) -> dict[str, object]:
        filename = certificate.filename or "certificado.pdf"
        extension = PurePath(filename).suffix.lower()
        if extension != CERTIFICATE_EXTENSION:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Somente certificado em PDF é aceito nesta fase.",
            )
        content = await certificate.read(inventory_upload.MAX_UPLOAD_BYTES + 1)
        if len(content) > inventory_upload.MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Arquivo excede o limite configurado",
            )
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Certificado enviado está vazio.")
        inventory_upload.validate_magic_bytes(extension, content)
        return {
            "filename": filename,
            "extension": extension,
            "content": content,
            "content_type": certificate.content_type,
            "sha256": hashlib.sha256(content).hexdigest(),
            "mime_type": inventory_upload.MIME_BY_EXTENSION[extension],
            "size_bytes": len(content),
        }

    async def _persist_certificate(self, project: Project, upload: dict[str, object]) -> Document:
        existing_document = (
            await self.session.execute(
                select(Document).where(
                    Document.project_id == project.id,
                    Document.sha256_hash == upload["sha256"],
                )
            )
        ).scalar_one_or_none()
        if existing_document is not None:
            return existing_document

        location = project_document_location(
            project.friendly_id,
            CERTIFICATION_CERTIFICATE_DOCUMENT_TYPE,
            str(upload["sha256"]),
            str(upload["extension"]),
        )
        await upload_storage_object(location.bucket, location.object_path, bytes(upload["content"]), str(upload["mime_type"]))
        document = Document(
            project_id=project.id,
            document_type=CERTIFICATION_CERTIFICATE_DOCUMENT_TYPE,
            storage_bucket=location.bucket,
            storage_object_path=location.object_path,
            storage_path=location.uri,
            sha256_hash=str(upload["sha256"]),
            mime_type=str(upload["mime_type"]),
            size_bytes=int(upload["size_bytes"]),
            metadata_={
                "filename": upload["filename"],
                "content_type": upload["content_type"],
                "source": "certifier_decision",
            },
        )
        self.session.add(document)
        await self.session.flush()
        return document

    async def _create_pendency(
        self,
        project: Project,
        *,
        category: str,
        description: str,
        actor: AuthenticatedUser,
        certification: Certification | None = None,
        metadata: dict[str, object] | None = None,
    ) -> CertificationPendency:
        pendency = CertificationPendency(
            project_id=project.id,
            certification_id=certification.id if certification is not None else None,
            certifier_organization_id=project.certifier_organization_id,
            raised_by_profile_id=await self._optional_actor_profile_id(actor),
            category=category,
            description=description,
            status="OPEN",
            metadata_=metadata or {},
        )
        self.session.add(pendency)
        await self.session.flush()

        await create_audit_event(
            self.session,
            action="CERTIFICATION_PENDENCY_CREATED",
            entity_type="projects",
            entity_id=project.id,
            actor_role=actor.role,
            metadata={
                "actor_external_id": actor.id,
                "friendly_id": project.friendly_id,
                "category": category,
                "description": description,
                "pendency_id": str(pendency.id),
            },
        )
        return pendency

    def _append_timeline(self, project: Project, *, title: str, desc: str, status_value: str) -> None:
        project.timeline = [
            *(project.timeline or []),
            {
                "title": title,
                "date": datetime.now(timezone.utc).date().isoformat(),
                "status": status_value,
                "desc": desc,
            },
        ]

    async def record_decision(
        self,
        project_id: str,
        *,
        decision: str,
        methodology: str | None,
        credit_potential: float | None,
        credit_potential_adjustment_reason: str | None,
        notes: str,
        rejection_category: str | None,
        certificate: UploadFile | None,
        actor: AuthenticatedUser,
    ) -> dict[str, object]:
        project = await self.projects._get_project_model(project_id)
        previous_status = project.status

        # 2. Validação de campos por tipo de decisão (antes de qualquer escrita).
        if decision in (DECISION_REJECT, DECISION_REQUEST_CHANGES):
            if not (rejection_category or "").strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=CATEGORY_REQUIRED_DETAIL)
            normalized_category = rejection_category.strip().upper()
            if normalized_category not in PENDENCY_CATEGORIES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Categoria inválida. Use uma de: {', '.join(PENDENCY_CATEGORIES)}",
                )
            if not (notes or "").strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=DESCRIPTION_REQUIRED_DETAIL)
            rejection_category = normalized_category
        elif decision == DECISION_APPROVE and certificate is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=CERTIFICATE_REQUIRED_DETAIL)

        # 3. Gate de dossiê mínimo (D-03/D-04): vale para APPROVE e REJECT, não para REQUEST_CHANGES.
        dossier = await self.projects.certification_dossier_status(project)
        if decision != DECISION_REQUEST_CHANGES and not dossier["complete"]:
            await self._create_pendency(
                project,
                category="DOCUMENTACAO_INCOMPLETA",
                description="Itens faltantes no dossiê mínimo: " + ", ".join(dossier["missing"]) + ".",
                actor=actor,
                metadata={"missing": dossier["missing"], "trigger": "DECISION_BLOCKED"},
            )
            await self.session.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=DOSSIER_INCOMPLETE_DETAIL)

        # 4. Cálculo do potencial (D-07).
        calculation = await self.projects.suggested_credit_potential(project)
        suggested = float(calculation["suggestedCreditPotential"])
        if decision == DECISION_APPROVE:
            final_potential = float(credit_potential) if credit_potential is not None else suggested
            if (
                abs(final_potential - suggested) > CREDIT_POTENTIAL_TOLERANCE
                and not (credit_potential_adjustment_reason or "").strip()
            ):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ADJUSTMENT_REASON_REQUIRED_DETAIL)
        else:
            final_potential = 0.0

        # 5. Certificado (só APPROVE) — validar ANTES de inserir a Certification.
        upload: dict[str, object] | None = None
        if decision == DECISION_APPROVE:
            assert certificate is not None
            upload = await self._validated_certificate(certificate)

        # 6. INSERT append-only da certificação — nunca reutilizar linha existente.
        certification = Certification(
            project_id=project.id,
            certifier_organization_id=project.certifier_organization_id,
            certifier_profile_id=await self._optional_actor_profile_id(actor),
            methodology=(methodology or project.methodology),
            credit_potential=Decimal(str(final_potential)),
            decision=decision,
            notes=notes or None,
            signed_document_hash=(f"sha256-{upload['sha256']}" if upload is not None else None),
            signed_at=(datetime.now(timezone.utc) if decision == DECISION_APPROVE else None),
        )
        self.session.add(certification)
        await self.session.flush()

        # 7. Transições de status e efeitos por decisão.
        document: Document | None = None
        pendency: CertificationPendency | None = None

        if decision == DECISION_APPROVE:
            assert upload is not None
            document = await self._persist_certificate(project, upload)
            project.status = "CERTIFIED_AWAITING_TREASURY"
            await self._ensure_locked_credit(project, Decimal(str(final_potential)))
            self._append_timeline(
                project,
                title="Certificação aprovada",
                desc="Certificação aprovada pela certificadora.",
                status_value="completed",
            )
        elif decision == DECISION_REJECT:
            project.status = "SUSPENDED"
            assert rejection_category is not None
            pendency = await self._create_pendency(
                project,
                category=rejection_category,
                description=notes,
                actor=actor,
                certification=certification,
            )
            # project.timeline é exposto publicamente (mesmo serializador do dossiê público e da
            # revisão interna) — nunca ecoar `notes` internas aqui; o motivo detalhado fica apenas
            # na pendência/certificação, lidas por endpoints com guard de papel.
            self._append_timeline(
                project,
                title="Projeto reprovado pela certificadora",
                desc="Reprovação registrada pela certificadora. Uma pendência foi aberta para o produtor.",
                status_value="active",
            )
        else:
            assert rejection_category is not None
            pendency = await self._create_pendency(
                project,
                category=rejection_category,
                description=notes,
                actor=actor,
                certification=certification,
            )
            self._append_timeline(
                project,
                title="Ajustes solicitados pela certificadora",
                desc="Ajustes solicitados pela certificadora. Uma pendência foi aberta para o produtor.",
                status_value="active",
            )

        # 8. Eventos de auditoria canônicos (D-21), todos antes do commit.
        if decision == DECISION_APPROVE:
            assert document is not None and upload is not None
            await create_audit_event(
                self.session,
                action="CERTIFICATION_APPROVED",
                entity_type="projects",
                entity_id=project.id,
                actor_role=actor.role,
                before_data={"status": previous_status},
                after_data={"status": project.status, "credit_potential": final_potential},
                metadata={
                    "actor_external_id": actor.id,
                    "friendly_id": project.friendly_id,
                    "certification_id": str(certification.id),
                    "methodology": certification.methodology,
                    "credit_potential_suggested": suggested,
                    "credit_potential_adjustment_reason": credit_potential_adjustment_reason,
                },
            )
            await create_audit_event(
                self.session,
                action="CERTIFICATION_CERTIFICATE_ATTACHED",
                entity_type="projects",
                entity_id=project.id,
                actor_role=actor.role,
                metadata={
                    "actor_external_id": actor.id,
                    "document_id": str(document.id),
                    "sha256": upload["sha256"],
                    "storage_path": document.storage_path,
                },
            )
        elif decision == DECISION_REJECT:
            await create_audit_event(
                self.session,
                action="CERTIFICATION_REJECTED",
                entity_type="projects",
                entity_id=project.id,
                actor_role=actor.role,
                before_data={"status": previous_status},
                after_data={"status": project.status, "credit_potential": final_potential},
                metadata={
                    "actor_external_id": actor.id,
                    "friendly_id": project.friendly_id,
                    "certification_id": str(certification.id),
                    "rejection_category": rejection_category,
                },
            )
        else:
            await create_audit_event(
                self.session,
                action="CERTIFICATION_CHANGES_REQUESTED",
                entity_type="projects",
                entity_id=project.id,
                actor_role=actor.role,
                before_data={"status": previous_status},
                after_data={"status": project.status, "credit_potential": final_potential},
                metadata={
                    "actor_external_id": actor.id,
                    "friendly_id": project.friendly_id,
                    "certification_id": str(certification.id),
                    "rejection_category": rejection_category,
                },
            )

        # 9. Único commit do caminho feliz.
        await self.session.commit()

        # 10. Retorno.
        return {
            "success": True,
            "project_id": project.friendly_id,
            "new_status": project.status,
            "previous_status": previous_status,
            "decision": decision,
            "credit_potential": final_potential,
            "suggested_credit_potential": suggested,
            "certification_id": str(certification.id),
            "certificate": (
                {
                    "documentId": str(document.id),
                    "documentType": CERTIFICATION_CERTIFICATE_DOCUMENT_TYPE,
                    "sha256": upload["sha256"],
                    "mimeType": upload["mime_type"],
                    "sizeBytes": upload["size_bytes"],
                    "storagePath": document.storage_path,
                }
                if decision == DECISION_APPROVE and document is not None and upload is not None
                else None
            ),
            "pendency_id": (str(pendency.id) if pendency is not None else None),
            "statusLabels": (STATUS_LABELS_APPROVED if decision == DECISION_APPROVE else []),
        }

    async def _ensure_locked_credit(self, project: Project, amount: Decimal) -> EnvironmentalCredit:
        result = await self.session.execute(
            select(EnvironmentalCredit).where(
                EnvironmentalCredit.project_id == project.id,
                EnvironmentalCredit.vintage == project.vintage,
            )
        )
        credit = result.scalar_one_or_none()
        if credit is None:
            credit = EnvironmentalCredit(
                project_id=project.id,
                vintage=project.vintage,
                quantity_total=amount,
                quantity_available=Decimal("0"),
                status="LOCKED",
                token_metadata={"source": "certifier_decision", "project": project.friendly_id},
                serial_start=project.serial_start,
                serial_end=project.serial_end,
            )
            self.session.add(credit)
        else:
            credit.quantity_total = amount
            credit.status = "LOCKED"
            credit.token_metadata = {**(credit.token_metadata or {}), "source": "certifier_decision"}
        await self.session.flush()
        return credit
