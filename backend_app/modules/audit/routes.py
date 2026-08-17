from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import PurePath
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import Audit, Document, EnvironmentalCredit, Project
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.audit.signature import AUDIT_SIGNATURE_KIND, compute_audit_signature
from backend_app.modules.integrity.service import IntegrityService
from backend_app.modules.inventory.routes import validate_magic_bytes
from backend_app.modules.projects.schemas import QueueResponse
from backend_app.modules.projects.service import ProjectsService
from backend_app.modules.storage_paths import project_document_location
from backend_app.modules.supabase_storage import upload_storage_object

router = APIRouter(tags=["audit"])

# D-01/SATM-01: a evidencia de campo aceita VIDEO alem dos tipos ja permitidos
# para documento de projeto. A allowlist global (inventory/routes.py) NAO e
# alterada de proposito: video so faz sentido em auditoria de campo, e ampliar
# a allowlist global liberaria .mp4 para todo upload de documento do sistema.
AUDIT_EVIDENCE_DOCUMENT_TYPE = "AUDIT_EVIDENCE"
MAX_AUDIT_EVIDENCE_BYTES = 50 * 1024 * 1024
AUDIT_EVIDENCE_EXTENSIONS: frozenset[str] = frozenset({".pdf", ".png", ".jpg", ".jpeg", ".mp4"})
AUDIT_EVIDENCE_MIME_BY_EXTENSION: dict[str, str] = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".mp4": "video/mp4",
}


class AuditVerifyRequest(BaseModel):
    status: Literal["APPROVED", "BLOCKED", "RECALCULATED"]
    laudo_texto: str = ""
    latitude: float | None = None
    longitude: float | None = None
    evidencias_url: list[str] = Field(
        default=[],
        description=(
            "IDs (UUID) de Document do tipo AUDIT_EVIDENCE do mesmo projeto, "
            "originados de POST /audit/{project_id}/evidence. Nome do campo "
            "preservado por compatibilidade de contrato (D-02)."
        ),
    )
    # D-03: valor recebido e IGNORADO; a assinatura e recalculada no servidor.
    assinatura_digital: str = "assinatura-digital-pendente"
    auditor_id: str | int | None = None


def _validate_mp4_magic_bytes(content: bytes) -> None:
    # ISO BMFF: box "ftyp" no offset 4 dos primeiros bytes.
    if len(content) < 12 or content[4:8] != b"ftyp":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Magic bytes inválidos para MP4")


async def _validated_audit_evidence_payload(file: UploadFile) -> dict[str, object]:
    filename = file.filename or "upload"
    extension = PurePath(filename).suffix.lower()
    if extension not in AUDIT_EVIDENCE_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Extensão de arquivo não permitida")

    content = await file.read(MAX_AUDIT_EVIDENCE_BYTES + 1)
    if len(content) > MAX_AUDIT_EVIDENCE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")

    if extension == ".mp4":
        _validate_mp4_magic_bytes(content)
    else:
        validate_magic_bytes(extension, content)

    return {
        "document_type": AUDIT_EVIDENCE_DOCUMENT_TYPE,
        "filename": filename,
        "extension": extension,
        "content": content,
        "content_type": file.content_type,
        "sha256": hashlib.sha256(content).hexdigest(),
        "mime_type": AUDIT_EVIDENCE_MIME_BY_EXTENSION[extension],
        "size_bytes": len(content),
    }


@router.post("/audit/{project_id}/evidence", status_code=status.HTTP_201_CREATED)
async def upload_audit_evidence(
    project_id: str,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("auditor", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    upload = await _validated_audit_evidence_payload(file)
    service = ProjectsService(session)
    # Guard org-scoped (nao apenas require_role) -- ver ProjectsService.get_project_for_auditor
    # (Phase 05 deviation: get_editable_project_model nao serve para auditoria,
    # ver 05-02-SUMMARY.md).
    project = await service.get_project_for_auditor(project_id, actor_id=current_user.id, actor_role=current_user.role)

    existing_document = (
        await session.execute(
            select(Document).where(
                Document.project_id == project.id,
                Document.document_type == AUDIT_EVIDENCE_DOCUMENT_TYPE,
                Document.sha256_hash == str(upload["sha256"]),
            )
        )
    ).scalar_one_or_none()
    if existing_document is not None:
        return {
            "success": True,
            "id": str(existing_document.id),
            "project_id": project.friendly_id,
            "document_type": existing_document.document_type,
            "filename": (existing_document.metadata_ or {}).get("filename"),
            "sha256": existing_document.sha256_hash,
            "mime_type": existing_document.mime_type,
            "size_bytes": existing_document.size_bytes,
            "storage_bucket": existing_document.storage_bucket,
            "storage_object_path": existing_document.storage_object_path,
            "storage_path": existing_document.storage_path,
            "status": "UPLOADED",
        }

    location = project_document_location(
        project.friendly_id,
        AUDIT_EVIDENCE_DOCUMENT_TYPE,
        str(upload["sha256"]),
        str(upload["extension"]),
    )
    await upload_storage_object(
        location.bucket,
        location.object_path,
        bytes(upload["content"]),
        str(upload["mime_type"]),
    )
    document = Document(
        project_id=project.id,
        document_type=AUDIT_EVIDENCE_DOCUMENT_TYPE,
        storage_bucket=location.bucket,
        storage_object_path=location.object_path,
        storage_path=location.uri,
        sha256_hash=str(upload["sha256"]),
        mime_type=str(upload["mime_type"]),
        size_bytes=int(upload["size_bytes"]),
        metadata_={
            "filename": upload["filename"],
            "content_type": upload["content_type"],
            "captured_in": "FIELD_AUDIT",
        },
    )
    session.add(document)
    await session.flush()
    # Phase 04.2 / INTG-02 (D-25): mesmo gancho automatico de Evidence usado por
    # upload_project_document.
    await IntegrityService(session).create_evidence_for_document(
        document,
        project=project,
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    await create_audit_event(
        session,
        action="AUDIT_EVIDENCE_UPLOADED",
        entity_type="documents",
        entity_id=document.id,
        actor_role=current_user.role,
        metadata={
            "actor_external_id": current_user.id,
            "friendly_id": project.friendly_id,
            "document_type": AUDIT_EVIDENCE_DOCUMENT_TYPE,
            "sha256": upload["sha256"],
        },
    )
    await session.commit()
    return {
        "success": True,
        "id": str(document.id),
        "project_id": project.friendly_id,
        "document_type": AUDIT_EVIDENCE_DOCUMENT_TYPE,
        "filename": upload["filename"],
        "sha256": upload["sha256"],
        "mime_type": upload["mime_type"],
        "size_bytes": upload["size_bytes"],
        "storage_bucket": location.bucket,
        "storage_object_path": location.object_path,
        "storage_path": location.uri,
        "status": "UPLOADED",
    }


@router.get("/audit/queue", response_model=QueueResponse)
async def audit_queue(
    _: AuthenticatedUser = Depends(require_role("auditor", "admin")),
    session: AsyncSession = Depends(get_session),
) -> QueueResponse:
    service = ProjectsService(session)
    statement = (
        select(Project)
        .where(Project.status.in_(["CERTIFIED_AWAITING_TREASURY", "AWAITING_AUDIT", "BLOCKED_AUDIT_REQUIRED"]))
        .order_by(Project.created_at.asc())
    )
    projects = [await service.project_to_mrca(project) for project in (await session.execute(statement)).scalars().all()]
    return QueueResponse(total=len(projects), projects=projects)


async def _resolve_audit_evidence_documents(
    session: AsyncSession, project: Project, raw_ids: list[str]
) -> list[Document]:
    """Resolve e valida evidencias de auditoria (D-02, T-05-10).

    Cada item precisa ser um Document.id (UUID) real, do tipo AUDIT_EVIDENCE,
    pertencente a ESTE projeto. Nunca aceita string livre (ex. local://...)
    nem Document.id de outro projeto -- HTTP 400 em ambos os casos.
    """
    if not raw_ids:
        return []

    parsed_ids: list[uuid.UUID] = []
    for raw_id in raw_ids:
        try:
            parsed_ids.append(uuid.UUID(str(raw_id)))
        except (ValueError, AttributeError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Evidência de auditoria inválida: {raw_id}",
            )

    documents = (
        await session.execute(
            select(Document).where(
                Document.id.in_(parsed_ids),
                Document.project_id == project.id,
                Document.document_type == AUDIT_EVIDENCE_DOCUMENT_TYPE,
            )
        )
    ).scalars().all()

    found_ids = {document.id for document in documents}
    missing = [str(item) for item in parsed_ids if item not in found_ids]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Evidência de auditoria não encontrada para este projeto: {missing}",
        )

    return sorted(documents, key=lambda document: str(document.id))


@router.patch("/audit/verify/{project_id}")
async def verify_project(
    project_id: str,
    payload: AuditVerifyRequest,
    current_user: AuthenticatedUser = Depends(require_role("auditor", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    previous_status = project.status

    documents = await _resolve_audit_evidence_documents(session, project, payload.evidencias_url)

    if payload.status == "APPROVED":
        project.status = "ACTIVE"
        await _unlock_credits(session, project)
    elif payload.status == "BLOCKED":
        project.status = "BLOCKED_AUDIT_REQUIRED"
        await _block_credits(session, project)
    else:
        project.status = "RECALCULATION_REQUIRED"
        await _block_credits(session, project)

    audit = await _get_or_create_audit(session, project, payload.status)
    audit.report_text = payload.laudo_texto
    audit.latitude = Decimal(str(payload.latitude)) if payload.latitude is not None else None
    audit.longitude = Decimal(str(payload.longitude)) if payload.longitude is not None else None

    signed_at = datetime.now(timezone.utc)
    evidence_ids = [str(document.id) for document in documents]
    audit.evidence_urls = evidence_ids
    # D-03: assinatura sempre recalculada no servidor; payload.assinatura_digital
    # (entrada do cliente) e descartado. project_id usa friendly_id (nao o uuid
    # interno project.id) porque e o mesmo identificador ja devolvido em
    # "project_id" nesta resposta -- o cliente precisa dele para reproduzir o
    # hash (ver <behavior> deste plano); o uuid interno nunca e exposto por
    # nenhuma rota publica.
    audit.digital_signature = compute_audit_signature(
        auditor_id=str(payload.auditor_id or current_user.id),
        project_id=project.friendly_id,
        report_text=payload.laudo_texto,
        signed_at=signed_at,
        evidence_ids=evidence_ids,
    )
    audit.audited_at = signed_at

    project.timeline = [
        *(project.timeline or []),
        {
            "title": _audit_title(payload.status),
            "date": signed_at.date().isoformat(),
            "status": "completed" if payload.status == "APPROVED" else "active",
            "desc": payload.laudo_texto or "Verificação registrada pelo auditor.",
        },
    ]
    await create_audit_event(
        session,
        action=f"AUDIT_{payload.status}",
        entity_type="projects",
        entity_id=project.id,
        actor_role=current_user.role,
        before_data={"status": previous_status},
        after_data={"status": project.status},
        metadata={
            "actor_external_id": current_user.id,
            "evidence_count": len(evidence_ids),
            "signature_kind": AUDIT_SIGNATURE_KIND,
            "signed_at": signed_at.isoformat(),
            "evidence_ids": evidence_ids,
        },
    )
    await session.commit()
    return {
        "success": True,
        "project_id": project.friendly_id,
        "new_status": project.status,
        "audit_date": signed_at.isoformat(),
        "assinatura_digital": audit.digital_signature,
        "assinatura_tipo": AUDIT_SIGNATURE_KIND,
        "assinatura_verificavel_em": signed_at.isoformat(),
        "evidencias_url": evidence_ids,
    }


async def _get_or_create_audit(session: AsyncSession, project: Project, status: str) -> Audit:
    result = await session.execute(select(Audit).where(Audit.project_id == project.id, Audit.status == status))
    audit = result.scalar_one_or_none()
    if audit is not None:
        return audit
    audit = Audit(project_id=project.id, auditor_organization_id=project.auditor_organization_id, status=status)
    session.add(audit)
    await session.flush()
    return audit


async def _unlock_credits(session: AsyncSession, project: Project) -> None:
    result = await session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
    for credit in result.scalars().all():
        credit.status = "AVAILABLE"
        credit.quantity_available = credit.quantity_total - credit.quantity_retired


async def _block_credits(session: AsyncSession, project: Project) -> None:
    result = await session.execute(select(EnvironmentalCredit).where(EnvironmentalCredit.project_id == project.id))
    for credit in result.scalars().all():
        credit.status = "SUSPENDED"
        credit.quantity_available = Decimal("0")


def _audit_title(status: str) -> str:
    if status == "APPROVED":
        return "Auditoria em campo aprovada"
    if status == "BLOCKED":
        return "Projeto bloqueado por auditoria"
    return "Recálculo solicitado pelo auditor"
