from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser, optional_user
from backend_app.db.models import Certification, CertificationPendency, Document
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.certifier.routes import pendency_item
from backend_app.modules.integrity.service import IntegrityService
from backend_app.modules.inventory.routes import (
    ALLOWED_EXTENSIONS,
    MAX_UPLOAD_BYTES,
    MIME_BY_EXTENSION,
    validate_magic_bytes,
)
from backend_app.modules.projects.schemas import (
    CatalogResponse,
    PendencyRespondRequest,
    ProjectCertificationHistoryResponse,
    ProjectCreate,
    ProjectDraftCreate,
    ProjectDraftResponse,
    ProjectDraftSubmitResponse,
    ProjectDraftsResponse,
    ProjectDraftUpdate,
    ProjectPublicDossierResponse,
    ProjectResponse,
    ProjectsResponse,
    ProjectBoundaryOverlapsResponse,
    ProjectUpdate,
    PublicProfileResponse,
)
from backend_app.modules.projects.service import CERTIFICATION_HISTORY_LABELS, ProjectsService, certification_item
from backend_app.modules.supabase_storage import download_storage_object, upload_storage_object
from backend_app.modules.storage_paths import project_document_location

router = APIRouter(tags=["projects"])


async def _validated_upload_payload(document_type: str, file: UploadFile) -> dict[str, object]:
    normalized_document_type = document_type.strip().upper()
    if not normalized_document_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de documento é obrigatório")

    filename = file.filename or "upload"
    extension = PurePath(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Extensão de arquivo não permitida")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")
    validate_magic_bytes(extension, content)

    return {
        "document_type": normalized_document_type,
        "filename": filename,
        "extension": extension,
        "content": content,
        "content_type": file.content_type,
        "sha256": hashlib.sha256(content).hexdigest(),
        "mime_type": MIME_BY_EXTENSION[extension],
        "size_bytes": len(content),
    }


@router.get("/projects", response_model=ProjectsResponse)
async def list_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    state: str | None = Query(default=None),
    public_marketplace: bool = Query(default=False),
    portfolio_only: bool = Query(default=False),
    scope: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    current_user: AuthenticatedUser | None = Depends(optional_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectsResponse:
    projects = await ProjectsService(session).list_projects(
        status_filter=status_filter,
        state=state,
        public_marketplace=public_marketplace,
        portfolio_only=portfolio_only,
        scope=scope,
        limit=limit,
        actor_id=current_user.id if current_user else None,
        actor_role=current_user.role if current_user else None,
    )
    return ProjectsResponse(total=len(projects), projects=projects)


@router.get("/project-drafts", response_model=ProjectDraftsResponse)
async def list_project_drafts(
    status_filter: str | None = Query(default="DRAFT", alias="status"),
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectDraftsResponse:
    return await ProjectsService(session).list_project_drafts(
        actor_id=current_user.id,
        actor_role=current_user.role,
        status_filter=status_filter,
    )


@router.post("/project-drafts", response_model=ProjectDraftResponse, status_code=status.HTTP_201_CREATED)
async def create_project_draft(
    payload: ProjectDraftCreate,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectDraftResponse:
    draft = await ProjectsService(session).create_project_draft(payload, actor_id=current_user.id, actor_role=current_user.role)
    return ProjectDraftResponse(draft=draft)


@router.get("/project-drafts/{draft_id}", response_model=ProjectDraftResponse)
async def get_project_draft(
    draft_id: str,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectDraftResponse:
    draft = await ProjectsService(session).get_project_draft(draft_id, actor_id=current_user.id, actor_role=current_user.role)
    return ProjectDraftResponse(draft=draft)


@router.patch("/project-drafts/{draft_id}", response_model=ProjectDraftResponse)
async def update_project_draft(
    draft_id: str,
    payload: ProjectDraftUpdate,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectDraftResponse:
    draft = await ProjectsService(session).update_project_draft(
        draft_id,
        payload,
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    return ProjectDraftResponse(draft=draft)


@router.post("/project-drafts/{draft_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_project_draft_document(
    draft_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    upload = await _validated_upload_payload(document_type, file)
    document = await ProjectsService(session).add_project_draft_document(
        draft_id,
        document_type=str(upload["document_type"]),
        filename=str(upload["filename"]),
        content_type=upload["content_type"] if isinstance(upload["content_type"], str) else None,
        extension=str(upload["extension"]),
        content=bytes(upload["content"]),
        sha256=str(upload["sha256"]),
        mime_type=str(upload["mime_type"]),
        size_bytes=int(upload["size_bytes"]),
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    return {
        "success": True,
        "id": document.id,
        "draft_id": draft_id,
        "document_type": document.documentType,
        "filename": document.filename,
        "sha256": document.sha256,
        "storage_bucket": document.storageBucket,
        "storage_object_path": document.storageObjectPath,
        "storage_path": document.storagePath,
        "size_bytes": document.sizeBytes,
        "mime_type": document.mimeType,
        "status": document.status,
    }


@router.post("/project-drafts/{draft_id}/submit", response_model=ProjectDraftSubmitResponse)
async def submit_project_draft(
    draft_id: str,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectDraftSubmitResponse:
    draft, project = await ProjectsService(session).submit_project_draft(
        draft_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    return ProjectDraftSubmitResponse(draft=draft, project=project)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, session: AsyncSession = Depends(get_session)) -> ProjectResponse:
    project = await ProjectsService(session).get_project(project_id)
    return ProjectResponse(project=project)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    project = await ProjectsService(session).update_project(
        project_id,
        payload,
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    return ProjectResponse(project=project)


@router.get("/projects/{project_id}/public-dossier", response_model=ProjectPublicDossierResponse)
async def get_project_public_dossier(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> ProjectPublicDossierResponse:
    return await ProjectsService(session).get_public_dossier(project_id)


@router.get("/projects/{project_id}/certification-history", response_model=ProjectCertificationHistoryResponse)
async def get_project_certification_history(
    project_id: str,
    event_type: str | None = Query(default=None),
    actor_role: str | None = Query(default=None),
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectCertificationHistoryResponse:
    """Trilha INTERNA de certificação do projeto (D-22).

    A rota do módulo da certificadora (`/certifier/projects/{id}/history`) é fechada em
    require_role("certifier", "admin"). Esta rota existe para o produtor dono do projeto,
    que a D-22 lista explicitamente entre quem vê notas internas completas, junto com
    certificadora, admin e tesouraria — e a tesouraria opera hoje sob o papel `admin`,
    porque `backend_app/core/roles.py` não define papel `treasury`.
    O acesso NÃO é garantido só pelo papel: `_assert_project_edit_permission` restringe
    à organização dona (producer/developer) ou à certificadora do projeto.
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(
        project, actor_id=current_user.id, actor_role=current_user.role
    )

    all_events = await service.certification_history(project)
    events = all_events
    if event_type:
        events = [event for event in events if event["action"] == event_type.upper()]
    if actor_role:
        events = [event for event in events if (event["actorRole"] or "") == actor_role.lower()]

    certifications = (
        await session.execute(
            select(Certification)
            .where(Certification.project_id == project.id)
            .order_by(Certification.created_at.desc())
        )
    ).scalars().all()

    available_types = sorted({event["action"] for event in all_events})
    return ProjectCertificationHistoryResponse(
        total=len(events),
        events=events,
        certifications=[certification_item(item) for item in certifications],
        certificate=await service.certification_certificate(project),
        availableEventTypes=[
            {"value": action, "label": CERTIFICATION_HISTORY_LABELS.get(action, action)}
            for action in available_types
        ],
        availableActorRoles=sorted({event["actorRole"] for event in all_events if event["actorRole"]}),
    )


CERTIFICATE_DOWNLOAD_FORBIDDEN_DETAIL = (
    "Download do certificado disponível apenas para o produtor, a certificadora e a "
    "administração do projeto."
)


@router.get("/projects/{project_id}/certificate")
async def download_project_certificate(
    project_id: str,
    current_user: AuthenticatedUser | None = Depends(optional_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Download do certificado da certificação (D-13, "quando permitido").

    O bucket `projects` é privado (supabase/migrations/202605260006_...): não existe URL
    pública utilizável, então o arquivo é servido pelo backend com a service role.
    Falhas de permissão devolvem 403 (e não 401) de propósito: o cliente `src/services/api.ts`
    limpa a sessão em 401, e esta rota é linkada a partir do dossiê PÚBLICO, onde o visitante
    legitimamente não tem token.
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=CERTIFICATE_DOWNLOAD_FORBIDDEN_DETAIL
        )
    try:
        await service._assert_project_edit_permission(
            project, actor_id=current_user.id, actor_role=current_user.role
        )
    except HTTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=CERTIFICATE_DOWNLOAD_FORBIDDEN_DETAIL
        ) from exc

    certificate = await service.certification_certificate(project)
    if certificate is None or not certificate.get("storageObjectPath"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificado ainda não anexado a este projeto.",
        )

    content = await download_storage_object(
        str(certificate["storageBucket"]), str(certificate["storageObjectPath"])
    )
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Certificado indisponível: Supabase Storage não está configurado.",
        )

    filename = str(certificate.get("filename") or f"certificado-{project.friendly_id}.pdf")
    safe_filename = PurePath(filename).name.replace('"', "")
    return Response(
        content=content,
        media_type=str(certificate.get("mimeType") or "application/pdf"),
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


@router.get("/projects/{project_id}/pendencies")
async def list_project_pendencies(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, object]]:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)
    pendencies = (
        await session.execute(
            select(CertificationPendency)
            .where(CertificationPendency.project_id == project.id)
            .order_by(CertificationPendency.created_at.desc())
        )
    ).scalars().all()
    return [pendency_item(item) for item in pendencies]


@router.get("/projects/{project_id}/boundary-overlaps", response_model=ProjectBoundaryOverlapsResponse)
async def get_project_boundary_overlaps(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectBoundaryOverlapsResponse:
    """Overlap interno entre geometrias de projetos Sinarca (GEOF-04).

    Somente deteccao/medicao. Nao cria Conflict nem aplica severidade — isso e
    Phase 04.2. Guardado org-scoped pelo mesmo _assert_project_edit_permission
    usado por /projects/{id}/pendencies, porque overlap revela a existencia e a
    posicao de projetos de terceiros.
    """
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)
    overlaps = await service.detect_boundary_overlaps(project_id)
    return ProjectBoundaryOverlapsResponse(
        project_id=str(project.id),
        total=len(overlaps),
        overlaps=overlaps,
    )


@router.post("/projects/{project_id}/pendencies/{pendency_id}/respond")
async def respond_project_pendency(
    project_id: str,
    pendency_id: str,
    payload: PendencyRespondRequest,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    # T-04-17/T-04-18: guard org-scoped (nao apenas require_role) impede leitura/resposta
    # por ID adivinhado de outra organizacao.
    await service._assert_project_edit_permission(project, actor_id=current_user.id, actor_role=current_user.role)

    try:
        pendency_uuid = uuid.UUID(pendency_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pendência não encontrada") from exc

    pendency = (
        await session.execute(
            select(CertificationPendency).where(
                CertificationPendency.id == pendency_uuid,
                CertificationPendency.project_id == project.id,
            )
        )
    ).scalar_one_or_none()
    if pendency is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pendência não encontrada")
    # T-04-19: pendencia resolvida e imutavel (D-09 por analogia) -- 409 nao 200 silencioso.
    if pendency.status != "OPEN":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Esta pendência já foi respondida")

    text_response = payload.response.strip()
    if not text_response:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A resposta à pendência é obrigatória")

    now = datetime.now(timezone.utc)
    pendency.producer_response = text_response
    pendency.responded_at = now
    pendency.resolved_at = now
    pendency.status = "RESOLVED"
    try:
        profile = await service._actor_profile(current_user.id)
        pendency.responded_by_profile_id = profile.id
    except HTTPException:
        pendency.responded_by_profile_id = None

    project.timeline = [
        *(project.timeline or []),
        {
            "title": "Produtor respondeu à pendência",
            "date": now.date().isoformat(),
            "status": "completed",
            "desc": text_response,
        },
    ]

    # T-04-20: resposta do produtor rastreada com actor_external_id + pendency_id (repudiation).
    await create_audit_event(
        session,
        action="CERTIFICATION_PENDENCY_ANSWERED",
        entity_type="projects",
        entity_id=project.id,
        actor_role=current_user.role,
        before_data={"pendency_status": "OPEN"},
        after_data={"pendency_status": pendency.status},
        metadata={
            "actor_external_id": current_user.id,
            "friendly_id": project.friendly_id,
            "pendency_id": str(pendency.id),
            "category": pendency.category,
            "response": text_response,
        },
    )
    await session.commit()

    open_remaining = (
        await session.execute(
            select(func.count()).select_from(CertificationPendency).where(
                CertificationPendency.project_id == project.id,
                CertificationPendency.status == "OPEN",
            )
        )
    ).scalar_one()

    return {
        "success": True,
        "project_id": project.friendly_id,
        "pendency_id": str(pendency.id),
        "status": pendency.status,
        "open_pendencies": int(open_remaining),
        "back_to_main_queue": int(open_remaining) == 0,
    }


@router.post("/projects/{project_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_project_document(
    project_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    upload = await _validated_upload_payload(document_type, file)
    service = ProjectsService(session)
    project = await service.get_editable_project_model(project_id, actor_id=current_user.id, actor_role=current_user.role)
    existing_document = (
        await session.execute(
            select(Document).where(
                Document.project_id == project.id,
                Document.document_type == str(upload["document_type"]),
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
            "sha256": existing_document.sha256_hash,
            "storage_bucket": existing_document.storage_bucket,
            "storage_object_path": existing_document.storage_object_path,
            "storage_path": existing_document.storage_path,
            "size_bytes": existing_document.size_bytes,
            "mime_type": existing_document.mime_type,
            "status": "UPLOADED",
        }

    location = project_document_location(
        project.friendly_id,
        str(upload["document_type"]),
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
        document_type=str(upload["document_type"]),
        storage_bucket=location.bucket,
        storage_object_path=location.object_path,
        storage_path=location.uri,
        sha256_hash=str(upload["sha256"]),
        mime_type=str(upload["mime_type"]),
        size_bytes=int(upload["size_bytes"]),
        metadata_={"filename": upload["filename"], "content_type": upload["content_type"]},
    )
    session.add(document)
    await session.flush()
    # Phase 04.2 / INTG-02 (D-07): Evidence reaproveita documents.sha256_hash.
    await IntegrityService(session).create_evidence_for_document(
        document,
        project=project,
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    await create_audit_event(
        session,
        action="PROJECT_DOCUMENT_UPLOADED",
        entity_type="documents",
        entity_id=document.id,
        actor_role=current_user.role,
        metadata={
            "actor_external_id": current_user.id,
            "friendly_id": project.friendly_id,
            "document_type": upload["document_type"],
            "sha256": upload["sha256"],
        },
    )
    await session.commit()
    return {
        "success": True,
        "id": str(document.id),
        "project_id": project.friendly_id,
        "document_type": upload["document_type"],
        "sha256": upload["sha256"],
        "storage_bucket": document.storage_bucket,
        "storage_object_path": document.storage_object_path,
        "storage_path": document.storage_path,
        "size_bytes": upload["size_bytes"],
        "mime_type": upload["mime_type"],
        "status": "UPLOADED",
    }


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: AuthenticatedUser = Depends(require_role("producer", "certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    project = await ProjectsService(session).create_project(payload, actor_id=current_user.id, actor_role=current_user.role)
    return ProjectResponse(project=project)


@router.get("/certifiers", response_model=CatalogResponse)
async def list_certifiers(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("certifiers")


@router.get("/auditors", response_model=CatalogResponse)
async def list_auditors(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("auditors")


@router.get("/companies", response_model=CatalogResponse)
async def list_companies(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("companies")


@router.get("/producers", response_model=CatalogResponse)
async def list_producers(session: AsyncSession = Depends(get_session)) -> CatalogResponse:
    return await ProjectsService(session).catalog("producers")


@router.get("/profiles/{profile_id}", response_model=PublicProfileResponse)
async def get_public_profile(profile_id: str, session: AsyncSession = Depends(get_session)) -> PublicProfileResponse:
    profile = await ProjectsService(session).public_profile(profile_id)
    return PublicProfileResponse(profile=profile)
