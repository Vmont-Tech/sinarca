# Phase 04: certification-workbench - Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 11 (backend: 5, frontend: 4, tests: 1, migration: 1)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `backend_app/modules/certifier/routes.py` (extend) | controller/route | request-response + file-I/O | itself (existing `decide_project`/`certifier_queue`) + `backend_app/modules/projects/routes.py::upload_project_document` for the multipart/upload half | exact (self) + role-match (upload) |
| `backend_app/modules/projects/service.py` (extend: `get_public_dossier`, `certification_item`, `document_item`, new dossier-completeness helper) | service | CRUD + transform | itself (existing `get_public_dossier`) + `_validate_required_draft_documents` for the completeness-check pattern | exact (self) + role-match (validation) |
| `backend_app/db/models.py` (add `CertificationPendency`, `TreasuryAuthorization`; drop `certifications_project_decision_idx`) | model | CRUD | `Certification`/`Audit`/`Document` models (same file) | exact |
| `backend_app/db/repositories.py` (no changes expected — reuse `create_audit_event`) | utility | event-driven | itself | exact |
| `supabase/migrations/2026081500NN_certification_workbench.sql` (new) | migration | batch/DDL | `supabase/migrations/202605270001_relax_document_hash_uniqueness.sql` (constraint drop pattern) + `202605260003_project_drafts.sql` (new-table + enum pattern) | role-match |
| `backend_app/modules/treasury/routes.py` (add `GET /treasury/authorizations`, read-only) | route | request-response | `backend_app/modules/audit/routes.py::audit_queue` (simple `require_role` + filtered `select` queue) | role-match |
| `src/pages/Dashboard/CertifierReview.tsx` (evolve) | component/page | request-response + file-I/O | `src/pages/Dashboard/AuditorReview.tsx` (expandable card + tabs + toggle state) | exact (structure) + itself (baseline) |
| `src/pages/Dashboard/MrcaDetails.tsx` (extend: certificate section, limited public history) | component/page | request-response | itself (existing tab-nav + dossier rendering) | exact |
| `src/services/api.ts` (no changes expected — `apiPatch`/`apiPost` already support `FormData`) | utility | request-response | itself | exact |
| `src/services/database.ts` (extend `ProjectPublicDossier`/`ProjectDossierDocument` types; possibly add `certificate` field) | service/provider | transform | itself | exact |
| `src/services/certifierReview.ts` (NEW, optional per RESEARCH.md) | service | file-I/O + request-response | `src/services/projectDocuments.ts` (`FormData` → `apiPost` typed wrapper) | exact |
| `tests/test_certifier_workbench.py` (new) | test | integration | `tests/test_api_integration.py` (`TestClient`, `client.post`/`client.patch`, plain assertions, no fixtures beyond `conftest.py`) | exact |

## Pattern Assignments

### `backend_app/modules/certifier/routes.py` (controller, request-response + file-I/O)

**Analog:** itself (`backend_app/modules/certifier/routes.py:1-159`, current version) + `backend_app/modules/projects/routes.py::upload_project_document` (lines 224-309) for the multipart/storage half.

**Imports pattern (current file, lines 1-19) — extend, do not replace:**
```python
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import require_role
from backend_app.core.security import AuthenticatedUser
from backend_app.db.models import Certification, EnvironmentalCredit, Project
from backend_app.db.repositories import create_audit_event
from backend_app.db.session import get_session
from backend_app.modules.projects.schemas import QueueResponse
from backend_app.modules.projects.service import ProjectsService
```
Add for the new multipart decision endpoint: `File, Form, UploadFile` from `fastapi`; `PurePath` from `pathlib`; `ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, MIME_BY_EXTENSION, validate_magic_bytes` from `backend_app.modules.inventory.routes`; `upload_storage_object` from `backend_app.modules.supabase_storage`; `project_document_location` from `backend_app.modules.storage_paths`; `Document` from `backend_app.db.models`.

**Auth pattern (lines 31-35, unchanged convention):**
```python
@router.get("/certifier/queue", response_model=QueueResponse)
async def certifier_queue(
    _: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> QueueResponse:
```
Every new certifier-only endpoint (review, pendency queue, treasury-package creation, history) must use the identical `Depends(require_role("certifier", "admin"))` dependency. Producer-facing pendency-read endpoints need the *different* org-scoped check from `_assert_project_edit_permission` (see Shared Patterns below), not `require_role`.

**Core decision pattern to extend (lines 46-106) — becomes multipart, same shape:**
```python
@router.patch("/certifier/projects/{project_id}/decision")
async def decide_project(
    project_id: str,
    payload: CertifierDecisionRequest,          # → becomes Form(...) fields per RESEARCH.md Pattern 1
    current_user: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    decision: str = payload.decision
    service = ProjectsService(session)
    project = await service._get_project_model(project_id)
    previous_status = project.status
    ...
    await create_audit_event(session, action=f"CERTIFIER_{decision}", entity_type="projects", entity_id=project.id, ...)
    await session.commit()   # SINGLE commit at the end — reuse for D-14/D-19 atomicity
    return {"success": True, "project_id": project.friendly_id, "new_status": project.status, ...}
```
Critical fix required (Pitfall 1): the analog's `_get_or_create_certification` (lines 109-125) does a `select(...).where(project_id, decision)` lookup-and-reuse. New code must always `session.add(Certification(...))` — never look up an existing row — to satisfy D-09 (append-only decisions).

**File-upload half to copy from `projects/routes.py:224-309` (`upload_project_document`):**
```python
# validate → hash → storage location → upload_storage_object → Document row → audit_event → commit
upload = await _validated_upload_payload(document_type, file)   # reuse this helper directly
location = project_document_location(project.friendly_id, "CERTIFICATION_CERTIFICATE", str(upload["sha256"]), str(upload["extension"]))
await upload_storage_object(location.bucket, location.object_path, bytes(upload["content"]), str(upload["mime_type"]))
document = Document(project_id=project.id, document_type="CERTIFICATION_CERTIFICATE", storage_bucket=location.bucket, storage_object_path=location.object_path, storage_path=location.uri, sha256_hash=str(upload["sha256"]), mime_type=str(upload["mime_type"]), size_bytes=int(upload["size_bytes"]), metadata_={"filename": upload["filename"]})
session.add(document)
await session.flush()
```
`_validated_upload_payload` itself is defined in `projects/routes.py:42-66` — either import it or replicate its magic-bytes/extension/size checks inline; do not reinvent PDF validation.

**Error handling pattern (implicit — no try/except in analog):**
The codebase's convention is to raise `HTTPException` early (before any `session.add`/`session.flush`) and let one `session.commit()` at the very end be the only commit — anything raised before it naturally rolls back nothing yet added, satisfying D-14/D-19 atomicity without needing an explicit `try/except/rollback` block. Example from `_validated_upload_payload` (`projects/routes.py:42-66`):
```python
if extension not in ALLOWED_EXTENSIONS:
    raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Extensão de arquivo não permitida")
content = await file.read(MAX_UPLOAD_BYTES + 1)
if len(content) > MAX_UPLOAD_BYTES:
    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")
validate_magic_bytes(extension, content)
```

**Validation pattern (Pydantic `Literal`, current file line 24-28 — extend with new fields):**
```python
class CertifierDecisionRequest(BaseModel):
    decision: Literal["APPROVE", "REJECT", "REQUEST_CHANGES"]
    credit_potential: float | None = Field(default=None, gt=0)
    certifier_id: str | None = None
    notes: str = ""
```
Note: RESEARCH.md Pattern 1 changes this to `Form(...)` parameters directly on the route signature (multipart requires `Form`, not a JSON body model) — keep the same field names/types, just move them from a Pydantic body model to individual `Form(...)` function parameters, and add `rejection_category: str | None = Form(default=None)`, `credit_potential_adjustment_reason: str | None = Form(default=None)`, `methodology: str | None = Form(default=None)`.

---

### `backend_app/modules/projects/service.py` (service, CRUD + transform)

**Analog:** itself — `get_public_dossier` (lines 200-262), `certification_item` (1592-1602), `document_item` (1619-1631), `_validate_required_draft_documents` (1335-1346), `_credit_potential_from_baseline` (1753-1754), `_assert_project_edit_permission` (991-1009).

**Dossier assembly pattern to extend (lines 200-262):**
```python
async def get_public_dossier(self, project_id: str) -> ProjectPublicDossierResponse:
    project = await self._get_project_model(project_id)
    ...
    certifications = (await self.session.execute(
        select(Certification).where(Certification.project_id == project.id).order_by(Certification.created_at.desc())
    )).scalars().all()
    ...
    documents = (await self.session.execute(
        select(Document).where(Document.project_id == project.id).order_by(Document.uploaded_at.desc())
    )).scalars().all()
    ...
    return ProjectPublicDossierResponse(
        ...,
        certifications=[certification_item(item) for item in certifications],   # → split into public vs internal serializer
        documents=[document_item(item) for item in documents],                  # → filter to public-safe document_type
    )
```
**Required fix (Pitfall 2, D-20/D-22):** `certification_item` (1592-1602) unconditionally returns `notes`. Add a second function, e.g. `public_certification_item(certification)`, that omits `notes` and includes only `decision, methodology, creditPotential, signedDocumentHash, signedAt, createdAt`. Filter `documents` in the public path to `document_type in {"CERTIFICATION_CERTIFICATE"}` (at minimum) before mapping through `document_item`.

**Dossiê-mínimo completeness check to adapt (lines 1335-1346):**
```python
def _validate_required_draft_documents(documents: list[ProjectDraftDocument]) -> None:
    types = {document.document_type.upper() for document in documents}
    errors: list[str] = []
    if not ({"LEGAL_OWNERSHIP", "CAR"} & types):
        errors.append("documento legal ou CAR")
    if "FOREST_INVENTORY" not in types:
        errors.append("inventário florestal")
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Envie {', '.join(errors)} antes de enviar o projeto.")
```
Adapt for certifier gate (D-03): query `Document` (not `ProjectDraftDocument`) by `project_id`, plus require `ProjectBaseline` exists and `ProjectTag` has ≥4 rows with `status == "ACTIVE"`/valid geofence. Raise `HTTPException(400, ...)` on failure — same convention.

**Credit-potential suggestion to reuse unmodified (lines 1753-1754):**
```python
def _credit_potential_from_baseline(baseline: BaselineDTO) -> float:
    return round(baseline.vegetation_cover_pct * baseline.ndvi_mean * 100, 2)
```
D-07 requires exactly this: call it to produce the suggested value, let the certifier override with `credit_potential_adjustment_reason` required when the value differs from the suggestion.

**Auth/permission pattern to reuse for producer-visible pendency data (lines 991-1009):**
```python
async def _assert_project_edit_permission(self, project: Project, *, actor_id: str | None, actor_role: str | None) -> None:
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
```
Reuse this exact org-scoping approach (not just `require_role`) for any endpoint where a producer must see/respond to their own project's `certification_pendencies` row.

**Project lookup pattern to reuse (lines 912-922):**
```python
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
```
Use identically for any new endpoint resolving `project_id` (accepts UUID, friendly_id, or source_hash).

---

### `backend_app/db/models.py` (model, CRUD)

**Analog:** `Certification` (lines 228-243), `Audit` (245-260), `Document` (457-476) — all in the same file.

**Existing model shape to mirror for `CertificationPendency` and `TreasuryAuthorization`:**
```python
class Certification(Base):
    __tablename__ = "certifications"
    __table_args__ = (UniqueConstraint("project_id", "decision", name="certifications_project_decision_idx"),)  # ← DROP this in new migration (Pitfall 1)

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    certifier_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    certifier_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    methodology: Mapped[str] = mapped_column(String, nullable=False)
    credit_potential: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    decision: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    signed_document_hash: Mapped[str | None] = mapped_column(String)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_column()
```
New models should follow the identical conventions: `id: Mapped[uuid.UUID] = uuid_pk()`, `created_at: Mapped[datetime] = created_at_column()`, `status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'OPEN'"))` (plain `String` status columns are the codebase norm — see `Audit.status`, `EnvironmentalCredit.status` uses a real `Enum` only when the value set is closed/reused elsewhere; a project-local status like pendency `OPEN/RESOLVED` can be a plain `String` per `Audit.status`'s precedent), `metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))` for any freeform payload, FK columns as `Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))`.

`ProjectStatusEnum` (lines 17-37) already contains `CERTIFIED_AWAITING_TREASURY` (line 23) — unused until this phase; no enum migration needed for the status transition itself (only for the two new tables).

---

### `backend_app/db/repositories.py` (utility, event-driven) — no changes, reuse as-is

**Analog:** itself, `create_audit_event` (lines 22-46).
```python
async def create_audit_event(
    session: AsyncSession, *, action: str, entity_type: str, entity_id: Any | None = None,
    actor_profile_id: Any | None = None, actor_role: str | None = None,
    before_data: dict[str, Any] | None = None, after_data: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    event = AuditEvent(action=action, entity_type=entity_type, entity_id=entity_id, actor_profile_id=actor_profile_id,
                        actor_role=actor_role, before_data=before_data, after_data=after_data, metadata_=metadata or {})
    session.add(event)
    await session.flush()
    return event
```
Call this once per D-21 event type (`CERTIFICATION_REVIEW_OPENED`, `CERTIFICATION_PENDENCY_CREATED`, `CERTIFICATION_APPROVED`, `MINT_AUTHORIZED`, `TREASURY_QUEUE_CREATED`, etc.) — all inside the same `session` before the single `commit()`.

---

### `supabase/migrations/2026081500NN_certification_workbench.sql` (migration, batch/DDL)

**Analog:** `supabase/migrations/202605270001_relax_document_hash_uniqueness.sql` (constraint drop, idempotent guard pattern) — full file reproduced above (39 lines).

**Constraint-drop pattern to copy for `certifications_project_decision_idx`:**
```sql
alter table certifications drop constraint if exists certifications_project_decision_idx;
```
**Idempotent-add pattern (copy for any new constraint on the new tables):**
```sql
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'some_new_constraint_name' and conrelid = 'some_table'::regclass
  ) then
    alter table some_table add constraint some_new_constraint_name unique (...);
  end if;
end $$;
```
For the `create table` shape of `certification_pendencies`/`treasury_authorizations`, follow the column conventions visible in `backend_app/db/models.py` (uuid pk via `uuid_generate_v4()`, `metadata jsonb not null default '{}'::jsonb`, `created_at timestamptz not null default now()`) — check `supabase/migrations/202605220001_initial_schema.sql` and `202605260003_project_drafts.sql` directly during planning for the exact `CREATE TABLE`/RLS boilerplate this project uses (not read in this pass; both exist and follow the same shape as `db/models.py`).

---

### `backend_app/modules/treasury/routes.py` (route, request-response)

**Analog:** `backend_app/modules/audit/routes.py::audit_queue` (lines 33-41).
```python
@router.get("/audit/queue", response_model=QueueResponse)
async def audit_queue(
    _: AuthenticatedUser = Depends(require_role("auditor", "admin")),
    session: AsyncSession = Depends(get_session),
) -> QueueResponse:
    service = ProjectsService(session)
    statement = select(Project).where(Project.status.in_(["AWAITING_AUDIT", "BLOCKED_AUDIT_REQUIRED"])).order_by(Project.created_at.asc())
    projects = [await service.project_to_mrca(project) for project in (await session.execute(statement)).scalars().all()]
    return QueueResponse(total=len(projects), projects=projects)
```
Mirror this exactly for `GET /treasury/authorizations`: `require_role("treasury", "admin")` (or whatever role exists — confirm in `core/roles.py` during planning), `select(TreasuryAuthorization).order_by(...)`, no execution/adapter call (read-only per D-16).

---

### `src/pages/Dashboard/CertifierReview.tsx` (component, request-response + file-I/O)

**Analog:** `src/pages/Dashboard/AuditorReview.tsx` (expandable card + tabs) for structure; itself for the queue-loading/decision baseline.

**Imports pattern (current file, lines 1-3) — extend:**
```typescript
import React from 'react';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
```
Add icons for tabs (`FileText, Tag, FileCheck2, Calculator, ClipboardCheck, History` or similar from `lucide-react`, already installed) and import the new `src/services/certifierReview.ts` module if created.

**Queue-load pattern to keep (lines 29-41):**
```typescript
const loadQueue = React.useCallback(async () => {
    setLoading(true);
    try {
        const response = await apiGet<any>('/certifier/queue');
        setItems(response?.projects || []);
    } finally {
        setLoading(false);
    }
}, []);

React.useEffect(() => { loadQueue(); }, [loadQueue]);
```
Extend to also call `/certifier/queue?scope=corrections` for the second queue (D-10), storing in a separate state array with its own counter.

**Expandable-card + toggle-state pattern to copy from `AuditorReview.tsx` (lines 167, 195-216, 402, 436):**
```typescript
const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
const [monitoringByProject, setMonitoringByProject] = React.useState<Record<string, MonitoringProjectResponse>>({});

const openEvidenceReview = async (project: AuditItem) => {
    const projectKey = project.friendlyId || project.id;
    if (activeProjectId === projectKey) { setActiveProjectId(null); return; }
    setActiveProjectId(projectKey);
    ...
    if (monitoringByProject[projectKey]) return;   // cache — don't refetch
    setEvidenceLoading(projectKey);
    try {
        const monitoring = await database.getMonitoringProject(project.friendlyId || project.id);
        setMonitoringByProject((current) => ({ ...current, [projectKey]: monitoring }));
    } finally { setEvidenceLoading(null); }
};
```
```jsx
<article key={project.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
  ...header...
  {activeProjectId === (project.friendlyId || project.id) && (
    <div className="mt-6 space-y-6 border-t border-gray-100 pt-6">
      {/* replace AuditorReview's flat sections with the 6-tab nav here */}
    </div>
  )}
</article>
```
**Tab-nav pattern to copy from `MrcaDetails.tsx` (lines 200-219), swap `bg-primary`/`text-primary` → `emerald-600` per UI-SPEC:**
```jsx
<nav className="flex gap-6 border-b border-gray-100 overflow-x-auto">
  {[
    { id: 'resumo', label: 'Resumo' },
    { id: 'qtags', label: 'QTAGs / Geofence' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'calculo', label: 'Cálculo' },
    { id: 'decisao', label: 'Decisão' },
    { id: 'historico', label: 'Histórico' },
  ].map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`pb-5 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all relative ${
        activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400 hover:text-black'
      }`}
    >
      {tab.label}
      {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600 rounded-full" />}
    </button>
  ))}
</nav>
```
**Decision action buttons — keep unmodified except label rename (current lines 97-106):**
```jsx
<button onClick={() => decide(project.id, 'APPROVE')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">
    <CheckCircle2 className="h-4 w-4" /> Aprovar certificação
</button>
<button onClick={() => decide(project.id, 'REQUEST_CHANGES')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600">
    <RotateCcw className="h-4 w-4" /> Solicitar ajustes
</button>
<button onClick={() => decide(project.id, 'REJECT')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700">
    <XCircle className="h-4 w-4" /> Reprovar projeto
</button>
```
**Certificate upload dropzone shell — copy visual only from `AuditorReview.tsx:517-531`, NOT the `local://` file-handling logic:**
```jsx
<label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50">
    <span className="mt-2 text-sm font-bold text-gray-800">Anexar certificado (PDF)</span>
    <input type="file" accept="application/pdf" className="sr-only" onChange={(event) => { /* store File in decision draft state, real upload happens in FormData submit */ }} />
</label>
```
For the real upload, do NOT use `AuditorReview.tsx`'s `local://` blob pattern (lines 226-249) — build a `FormData` and call `apiPatch` (or a `certifierReview.ts` wrapper), mirroring `src/services/projectDocuments.ts` exactly (see below).

**Current JSON decision call to replace (Pitfall 5, current lines 43-51):**
```typescript
// OLD — must be replaced, do not keep this shape:
await apiPatch(`/certifier/projects/${encodeURIComponent(projectId)}/decision`, { decision, notes, certifier_id: 'std-001' });
```
```typescript
// NEW — FormData body per D-11/D-14/D-19:
const body = new FormData();
body.append('decision', decision);
body.append('methodology', methodology);
body.append('credit_potential', String(creditPotential));
body.append('notes', notes);
if (decision === 'APPROVE') body.append('certificate', certificateFile);
if (decision !== 'APPROVE') body.append('rejection_category', category);
await apiPatch(`/certifier/projects/${projectId}/decision`, body);
```

---

### `src/pages/Dashboard/MrcaDetails.tsx` (component, request-response)

**Analog:** itself — "Certificações" block (lines 339-361) and event-timeline block (lines 249-267).

**Certificate section to extend (lines 343-357) — add certificate hash/reference + conditional download, must NOT render `cert.notes` for public-only certifications:**
```jsx
{dossier.certifications.map((cert) => (
  <div key={cert.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
              <p className="text-sm font-black uppercase">{cert.decision}</p>
              <p className="text-xs text-gray-500 mt-1">{cert.methodology} - potencial {formatTons(cert.creditPotential)}</p>
          </div>
          <p className="text-[10px] font-mono text-primary break-all">{cert.signedDocumentHash || 'Documento não registrado'}</p>
      </div>
      {/* cert.notes must NOT be rendered here anymore per D-20/D-22 — public serializer omits it server-side */}
  </div>
))}
```
**Timeline row shell to reuse for the new public history tab (lines 250-262):**
```jsx
<div className="flex gap-5">
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-5 h-5" />
    </div>
    <div>
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{event.code || 'EVENT'} · {event.date}</p>
        <h4 className="text-base font-bold text-black mt-1">{timelineCodeLabel(event.code) || event.title}</h4>
        <p className="text-sm text-gray-500 mt-1">{event.desc}</p>
    </div>
</div>
```
**Empty-state component to reuse unmodified (lines 71-75):**
```jsx
const EmptyState = ({ text }: { text: string }) => (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm font-medium text-gray-500">{text}</div>
);
```

---

### `src/services/api.ts` — no changes needed, reuse as-is

**Analog:** itself (lines 25-75). Both `apiPost` and `apiPatch` already branch on `FormData`:
```typescript
let body: BodyInit | undefined;
if (options.body instanceof FormData) {
    body = options.body;
} else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
}
```
No `Content-Type` header is set manually for `FormData` (the browser sets the multipart boundary automatically) — do not add `headers: { 'Content-Type': 'multipart/form-data' }` anywhere, that would break the boundary.

---

### `src/services/database.ts` (service/provider, transform)

**Analog:** itself — `ProjectPublicDossier`/`ProjectDossierDocument` types (lines 104-128), `PROJECT_STATUS_PRESENTATION` map (21-36).

**Type to extend for certificate reference:**
```typescript
export type ProjectPublicDossier = {
    success: boolean;
    project: ProjectMRCA;
    tags: Array<Record<string, any>>;
    baseline: Record<string, any> | null;
    certifications: Array<Record<string, any>>;   // shape narrows once public serializer ships — notes omitted
    audits: Array<Record<string, any>>;
    documents: ProjectDossierDocument[];
    credits: Array<Record<string, any>>;
    transactions: TransactionRecord[];
    chainEvents: Array<Record<string, any>>;
};
```
`CERTIFIED_AWAITING_TREASURY` already has a presentation entry (line 33): `{ label: 'Tesouraria pendente', type: 'certificacao' }` — reuse this label; do not invent a new one for D-17's "Aguardando tesouraria" status chip (map D-17's three-status progression to new UI copy, but the underlying `project.status` value/label mapping already exists here).

---

### `src/services/certifierReview.ts` (NEW, optional per RESEARCH.md — service, file-I/O + request-response)

**Analog:** `src/services/projectDocuments.ts` (full file, 60 lines) — copy this shape exactly.
```typescript
import { apiPatch } from './api';

export const decideCertification = async (
    projectId: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES',
    fields: { methodology?: string; creditPotential?: number; notes: string; certificate?: File; rejectionCategory?: string; adjustmentReason?: string },
): Promise<...> => {
    const body = new FormData();
    body.append('decision', decision);
    if (fields.methodology) body.append('methodology', fields.methodology);
    if (fields.creditPotential !== undefined) body.append('credit_potential', String(fields.creditPotential));
    body.append('notes', fields.notes);
    if (fields.certificate) body.append('certificate', fields.certificate);
    if (fields.rejectionCategory) body.append('rejection_category', fields.rejectionCategory);
    if (fields.adjustmentReason) body.append('credit_potential_adjustment_reason', fields.adjustmentReason);

    const response = await apiPatch<...>(`/certifier/projects/${projectId}/decision`, body);
    if (!response) throw new Error('Decisão da certificadora sem resposta da API.');
    return response;
};
```

---

### `tests/test_certifier_workbench.py` (test, integration)

**Analog:** `tests/test_api_integration.py` (full pattern, lines 1-65) + `tests/conftest.py` (`isolate_optional_storage_env` fixture, lines 24-31).
```python
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from backend_app.main import app

client = TestClient(app)


def test_approve_requires_real_pdf() -> None:
    response = client.patch(
        "/api/v1/certifier/projects/PRC-2024-002/decision",
        data={"decision": "APPROVE", "methodology": "VM0007", "credit_potential": "100.0", "notes": "ok"},
        headers={"Authorization": f"Bearer {token}"},
        # no files= → certificate missing → expect 400
    )
    assert response.status_code == 400
```
Use `TestClient.patch(..., data={...}, files={"certificate": ("cert.pdf", pdf_bytes, "application/pdf")})` for multipart requests — `httpx`/`starlette` TestClient supports this directly, no new test dependency needed. `isolate_optional_storage_env` (autouse fixture in `conftest.py`) already clears Supabase Storage env vars for every test — tests asserting "upload succeeds" must `monkeypatch.setenv(...)` fake credentials or monkeypatch `upload_storage_object`; tests asserting "fails closed" rely on the fixture's default empty-env state.

---

## Shared Patterns

### Authentication / Authorization
**Source:** `backend_app/core/roles.py::require_role` (used at `certifier/routes.py:33`, `audit/routes.py:35`, `projects/routes.py:96` etc.) + `backend_app/modules/projects/service.py::_assert_project_edit_permission` (lines 991-1009) for org-scoped (non-role-only) checks.
**Apply to:** All new/modified certifier and treasury route handlers use `Depends(require_role("certifier", "admin"))`; any endpoint a producer must read (pendency detail) needs the org-scoped check, not `require_role` alone.

### Audit trail / event log
**Source:** `backend_app/db/repositories.py::create_audit_event` (lines 22-46).
**Apply to:** Every new state-changing action in `certifier/routes.py` and `treasury/routes.py` — one call per D-21 event type, all before the single `session.commit()`.
```python
await create_audit_event(
    session, action="CERTIFICATION_PENDENCY_CREATED", entity_type="projects",
    entity_id=project.id, actor_role=current_user.role,
    metadata={"actor_external_id": current_user.id, "category": category, "description": description},
)
```

### File upload (PDF certificate)
**Source:** `backend_app/modules/projects/routes.py::_validated_upload_payload` (lines 42-66) + `upload_project_document` (224-309); magic-byte check from `backend_app/modules/inventory/routes.py::validate_magic_bytes` (171-177); storage path from `backend_app/modules/storage_paths.py::project_document_location` (26-29).
**Apply to:** The certificate upload branch of the new multipart decision endpoint. Do not build a new PDF validator or a new storage-path convention — `document_type="CERTIFICATION_CERTIFICATE"` slots directly into `project_document_location`'s existing signature.

### Single-commit atomicity
**Source:** every existing mutating route (`certifier/routes.py:99`, `audit/routes.py:92`, `projects/routes.py:296`) calls `session.commit()` exactly once, at the very end, after all `session.add`/`session.flush` calls.
**Apply to:** The APPROVE branch must add `Certification`, `Document` (certificate), and `TreasuryAuthorization` rows, then commit once — satisfies D-14/D-19 without manual `try/rollback`.

### FormData API client
**Source:** `src/services/api.ts` (lines 31-37, both `apiPost`/`apiPatch`) + `src/services/projectDocuments.ts` (full file).
**Apply to:** Any new frontend service function that uploads a file — never set `Content-Type` manually, always pass a `FormData` object as `body`.

### Expandable-card-with-tabs UI
**Source:** `src/pages/Dashboard/AuditorReview.tsx` (`activeProjectId` toggle, lines 167/195-216/436) for the card-expand mechanic; `src/pages/Dashboard/MrcaDetails.tsx` (`activeTab` state + `nav`, lines 81/200-219) for the internal tab bar.
**Apply to:** `CertifierReview.tsx`'s new expanded review card — combine both patterns (card-level toggle + tab-level state) rather than inventing a new interaction model.

## No Analog Found

None. Every file in scope has at least a role-match analog in the existing codebase; RESEARCH.md's own conclusion ("100% internal extension of existing patterns") holds after direct inspection.

## Metadata

**Analog search scope:** `backend_app/modules/{certifier,projects,audit,inventory,treasury,blockchain}/`, `backend_app/db/`, `supabase/migrations/`, `src/pages/Dashboard/`, `src/services/`, `tests/`
**Files scanned:** 18 (11 target files + 7 additional analog/reference files: `audit/routes.py`, `inventory/routes.py`, `storage_paths.py`, `projectDocuments.ts`, `api.ts`, `database.ts`, one migration file, `conftest.py`, `test_api_integration.py`)
**Pattern extraction date:** 2026-08-15
