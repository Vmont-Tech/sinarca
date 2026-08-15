# Phase 04: certification-workbench - Research

**Researched:** 2026-08-15
**Domain:** FastAPI + SQLAlchemy async backend, React/Vite frontend, Supabase Postgres (SQL migrations, not Alembic-driven), Supabase Storage for PDF uploads
**Confidence:** HIGH (codebase directly inspected; no external library research required — this phase is 100% internal extension of existing patterns)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Revisão detalhada

- **D-01:** A fila da certificadora permanece como base. A revisão detalhada abre como card expansível na própria fila, seguindo o padrão da área do auditor.
- **D-02:** O card expandido usa abas internas para organizar o dossiê técnico. As abas esperadas são: resumo, QTAGs/geofence, documentos, cálculo, decisão e histórico.
- **D-03:** A decisão fica bloqueada sem dossiê mínimo completo: baseline, quatro QTAGs válidas/geofence e documentos obrigatórios.
- **D-04:** Quando o dossiê mínimo estiver incompleto, a certificadora não decide. Ela gera uma pendência estruturada para o produtor/origem, vinculada ao projeto, e o projeto fica marcado como pendente de correção.

### Decisão técnica

- **D-05:** Aprovação, reprovação e pedido de ajustes usam formulário completo por decisão.
- **D-06:** Aprovação exige metodologia, potencial de crédito, notas, justificativa quando o potencial for ajustado e certificado em PDF anexado.
- **D-07:** O potencial de crédito deve ser sugerido pelo sistema a partir dos dados do projeto/baseline/metodologia, mas a certificadora pode editar o valor com justificativa obrigatória.
- **D-08:** Reprovação e pedido de ajustes exigem categoria estruturada e descrição obrigatória.
- **D-09:** Decisão registrada não deve ser editada. Correções devem entrar como nova decisão ou evento auditável vinculado.
- **D-10:** Solicitar ajustes gera demanda para correção, tira o projeto da fila principal da certificadora e o move para uma fila separada de "aguardando retorno do produtor", com contador no dashboard. O projeto só volta para a fila principal quando o produtor/responsável responder ou corrigir a pendência.

### Certificado e referência documental

- **D-11:** Aprovação exige upload obrigatório de certificado/documento assinado em PDF. Hash determinístico sem arquivo real não conta como entrega da fase.
- **D-12:** A Phase 04 aceita PDF apenas para certificado. Imagem, XML/JSON de assinatura e templates ficam fora desta fase.
- **D-13:** O certificado aparece no dossiê interno e no dossiê público. O dossiê interno mostra metadados completos; o dossiê público mostra referência/hash e download quando permitido.
- **D-14:** Se o upload do certificado falhar, a aprovação não conclui. A decisão fica em rascunho/pendente até o certificado ser anexado com sucesso.

### Mint bloqueado e tesouraria

- **D-15:** A certificação autoriza a emissão/mint, mas não executa provider ou adapter externo nesta fase.
- **D-16:** A execução do mint bloqueado fica para a tesouraria, em fila própria.
- **D-17:** A aprovação deve gerar status visível no card e no histórico: `Certificação aprovada`, `Mint autorizado` e `Aguardando tesouraria`.
- **D-18:** A fila da tesouraria recebe um pacote mínimo de autorização: projeto, certificadora, potencial aprovado, metodologia, certificado/hash, data, status e trilha de auditoria.
- **D-19:** Aprovação e criação da pendência de tesouraria são atômicas. Se a pendência de tesouraria falhar, a aprovação não conclui.

### Histórico de decisões

- **D-20:** Certificadora e produtor veem a trilha completa por projeto. O dossiê público mostra apenas decisões finais e certificado/referência, sem notas internas sensíveis.
- **D-21:** O histórico inclui todos os eventos da certificação: abertura de revisão, pendência criada, resposta do produtor, aprovação, reprovação, pedido de ajustes, certificado anexado, mint autorizado e envio à tesouraria.
- **D-22:** Notas internas completas ficam visíveis para certificadora, admin, produtor e tesouraria. O público vê apenas o dossiê público limitado.
- **D-23:** O histórico deve aparecer como linha do tempo por projeto com filtros básicos por tipo de evento/status e ator.

### Claude's Discretion

- O agente pode definir nomes técnicos de tabelas, DTOs, endpoints e componentes, desde que preserve os comportamentos acima, use `/api/v1`, mantenha eventos auditáveis e não reintroduza mock runtime no frontend.
- O agente pode decidir a composição exata das abas internas, desde que todas as informações exigidas estejam disponíveis antes da decisão.

### Deferred Ideas (OUT OF SCOPE)

- Criar área futura para template de certificado, preenchimento automático com dados do sistema e assinatura digital pela certificadora.
- Executar mint bloqueado em provider/adapters externos; isso pertence à tesouraria/blockchain, especialmente Phase 08.
- Console completo de tesouraria, reprocessamento operacional e gestão ampla de filas; isso pertence a fases posteriores, especialmente Phase 8 e Phase 9.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CERT-01 | A certificadora abre revisão detalhada com baseline, documentos, QTAGs e cálculo de potencial. | New `GET /certifier/projects/{id}/review` (or extend existing project/dossier fetch) assembling `ProjectBaseline`, `ProjectTag[]`, `Document[]`, and `_credit_potential_from_baseline` suggestion — see Architecture Patterns / Pattern 1 and Don't Hand-Roll |
| CERT-02 | Aprovação/reprovação permite notas, metodologia, potencial de crédito e motivo estruturado. | Multipart decision endpoint with `Form(...)` fields for methodology/credit_potential/notes/category — see Pattern 1; Pydantic `Literal` validators for structured reject/adjust categories |
| CERT-03 | Certificado digital ou referência documental é registrado e exibido no projeto. | Reuse `validate_magic_bytes`/`ALLOWED_EXTENSIONS`/storage upload pipeline for the certificate PDF; new `documents` row with `document_type=CERTIFICATION_CERTIFICATE` — see Don't Hand-Roll and Code Examples |
| CERT-04 | Aprovação aciona ou prepara explicitamente o fluxo de lastro/mint bloqueado com status visível. | New `treasury_authorizations` table + `project.status = CERTIFIED_AWAITING_TREASURY` (existing unused enum value) + 3 chained `audit_events` — see Pitfall 4 and System Architecture Diagram |
| CERT-05 | Histórico de decisões por projeto fica disponível para certificadora e dossiê público quando aplicável. | Reuse `audit_events` as queryable timeline (Pattern 2); fix `get_public_dossier`/`certification_item`/`document_item` to redact internal notes and restrict document types for the public path — see Pitfall 2 |
</phase_requirements>

## Summary

Phase 04 does not introduce a new technology domain — it extends four things that already exist and work: the certifier queue (`/api/v1/certifier/queue`), the certifier decision endpoint (`/api/v1/certifier/projects/{id}/decision`), the document-upload pattern (`FormData` → `UploadFile` → magic-byte validation → Supabase Storage → `documents` row), and the generic `audit_events` table. The codebase already anticipated most of this phase's shape: `ProjectStatusEnum` already has an unused `CERTIFIED_AWAITING_TREASURY` value, `CONVENTIONS.md` already documents certifier/tesouraria rules almost verbatim to CONTEXT.md's decisions, and `AuditorReview.tsx` already implements the expandable-card-with-tabs pattern the certifier UI must mirror.

Three real gaps exist and drive all new work. First, `certifications` has a `UNIQUE (project_id, decision)` constraint, so the current `_get_or_create_certification` **overwrites** the existing row instead of appending — this directly violates D-09 ("decisão registrada não deve ser editada") and must be fixed by dropping the constraint and always inserting a new row. Second, there is no schema for correction pendências (D-04, D-08, D-10) or for a treasury authorization queue/package (D-18); both need new tables via a new `supabase/migrations/*.sql` file — this project does **not** use Alembic to generate migrations even though `alembic.ini`/`backend_app/db/env.py` exist (no `versions/` directory; schema is applied via hand-written SQL files + `npx supabase db reset`). Third, the public dossier (`get_public_dossier` → `MrcaDetails.tsx`) currently leaks **all** certification notes and **all** documents for a project with no visibility filtering — this is a direct violation of D-20/D-22 that must be fixed regardless of what else Phase 04 builds, because CERT-05 requires the public dossier to show only final decisions and the certificate reference, never internal notes.

The certificate upload requirement (D-11 through D-14) should reuse the exact FormData → `UploadFile` → magic-bytes → Supabase Storage pattern already used by `/projects/{project_id}/documents` — **not** the fake `local://` blob-URL pattern used by `AuditorReview.tsx`'s evidence upload, which never touches the backend and would fail D-11's "hash determinístico sem arquivo real não conta como entrega da fase" requirement.

**Primary recommendation:** Extend `backend_app/modules/certifier/routes.py` with a multipart decision endpoint (fields as `Form(...)` + certificate as `File(...)` for APPROVE), add two new tables (`certification_pendencies`, `treasury_authorizations`) via one new SQL migration, drop the `certifications_project_decision_idx` unique constraint, reuse `audit_events` as the queryable timeline (no new history table needed), and fix public-dossier serialization to redact internal notes and restrict documents/certifications to public-safe fields before touching the frontend.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Certifier queue split (principal / aguardando produtor) | API / Backend | Frontend (Client) | Filtering by `project.status` is a query concern; frontend only renders two lists + counters |
| Expandable review card with tabs (resumo, QTAGs/geofence, documentos, cálculo, decisão, histórico) | Browser / Client | API / Backend (data assembly) | Tab UI/state is client-side; each tab's data comes from existing/extended API responses |
| Dossiê mínimo validation (baseline + 4 vértices + documentos obrigatórios) | API / Backend | — | Must be enforced server-side (gate on decision endpoint), not just UI-disabled buttons — client-only gating is bypassable |
| Decision recording (APPROVE/REJECT/REQUEST_CHANGES) | API / Backend | Database / Storage | Business rule + atomic transaction (certificate + treasury package) belongs in `ProjectsService`/certifier service, not routes |
| Certificate PDF upload | API / Backend | Database / Storage (Supabase Storage) | Same as existing document upload: validate → store → persist `documents` row inside the same transaction as the decision |
| Correction pendência (produtor) | API / Backend | Database / Storage | New table; must be visible to producer's own project view too, not certifier-only |
| Treasury authorization package | API / Backend | Database / Storage | New table; explicitly a hand-off artifact for Phase 08, no adapter/mint call in this tier |
| Decision history / timeline | API / Backend | Browser / Client | Backend exposes filterable `audit_events` query; frontend renders + filters client-side or via query params |
| Public dossier certificate + limited history | API / Backend | Browser / Client | Data minimization (hide internal notes, restrict document types) must happen in `ProjectsService.get_public_dossier`, not in the frontend |

## Standard Stack

This phase adds no new dependencies. All work uses the existing installed stack.

### Core (already installed — verify only)
| Library | Verified Version | Purpose | Why Standard (for this codebase) |
|---------|---------|---------|--------------|
| fastapi | ≥0.115.0 [VERIFIED: pyproject.toml] | Route/decision/upload endpoints | Already the only backend framework in use |
| sqlalchemy[asyncio] | ≥2.0.30 [VERIFIED: pyproject.toml] | ORM models, async session | Already the only DB access layer |
| asyncpg | ≥0.29.0 [VERIFIED: pyproject.toml] | Postgres driver | Already wired via `backend_app/db/session.py` |
| pydantic | ≥2.7.0 [VERIFIED: pyproject.toml] | Request/response schemas | Already used for all `backend_app/modules/*/schemas.py` |
| alembic | ≥1.13.0 [VERIFIED: pyproject.toml] | **Present but unused for actual migrations** | `alembic.ini` + `backend_app/db/env.py` exist but there is no `versions/` directory; do not use `alembic revision` for this phase — see Pitfall below |
| React 19 / Vite 7 / Tailwind 3 | [VERIFIED: package.json] | Frontend | Already the only frontend stack |

### Supporting (no additions needed)
No new packages are required. The certificate upload reuses `fastapi.UploadFile`/`File`/`Form` (already imported in `projects/routes.py`, `inventory/routes.py`, `auth/routes.py`).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `certification_pendencies`/`treasury_authorizations` tables | Overload `documents.metadata_` or `audit_events.metadata_` as pseudo-tables | Rejected: pendências and treasury packages need their own status lifecycle (`OPEN/RESOLVED`, `PENDING/...`), FK integrity, and queryable columns for dashboard counters — JSONB blobs inside another entity's metadata cannot be indexed/queried efficiently and violate the existing convention of one table per domain concept |
| New dedicated `certification_history` table | Reuse `audit_events` (already generic: actor, entity, before/after, metadata, created_at) | Recommended: `audit_events` already has everything D-21/D-23 need (event type via `action`, actor via `actor_role`/`actor_profile_id`, filtering via `entity_id`+`created_at`). A new table would duplicate data already written on every decision |

**Installation:** None required.

**Version verification:** Ran `grep` against `pyproject.toml`/`package.json` directly (no registry lookup needed — these are pinned ranges already in use in the repo, not new additions).

## Architecture Patterns

### System Architecture Diagram

```
Certifier (browser)
   │
   ▼
CertifierReview.tsx (expandable card, tabs)
   │  apiGet /certifier/queue            ──► certifier/routes.py::certifier_queue
   │  apiGet /certifier/queue?scope=corrections (NEW)
   │  apiGet /certifier/projects/{id}/review (NEW, dossier for tabs)
   │  apiPost FormData /certifier/projects/{id}/decision (CHANGED: multipart)
   │  apiGet /certifier/projects/{id}/history (NEW)
   │
   ▼
certifier/routes.py
   │  require_role("certifier","admin")
   │  1. load Project + ProjectBaseline + ProjectTag[] + Document[] via ProjectsService
   │  2. validate "dossiê mínimo" (baseline present, ≥4 valid tags, required doc types present)
   │     → if incomplete: create certification_pendencies row, move project to
   │       correction-queue status, audit_event, return 409/422 — NO decision recorded
   │  3. if APPROVE: require certificate PDF in same multipart request
   │     - validate PDF (extension + magic bytes, reuse inventory.routes helpers)
   │     - upload to Supabase Storage (project_document_location pattern)
   │     - INSERT new certifications row (no upsert — see Pitfall)
   │     - INSERT documents row (document_type=CERTIFICATION_CERTIFICATE)
   │     - INSERT treasury_authorizations row (package: project, certifier org,
   │       approved credit_potential, methodology, certificate hash, date, status)
   │     - project.status = CERTIFIED_AWAITING_TREASURY (reuse existing unused enum value)
   │     - append 3 audit_events: CERTIFICATION_APPROVED, MINT_AUTHORIZED,
   │       TREASURY_QUEUE_CREATED — all inside ONE db transaction (atomicity, D-19)
   │     - if certificate upload OR treasury insert fails → rollback whole transaction (D-14/D-19)
   │  4. if REJECT/REQUEST_CHANGES: require category + description (Pydantic validators)
   │     - REQUEST_CHANGES also creates certification_pendencies row + moves project
   │       out of main queue into correction queue (D-10)
   │
   ▼
Postgres (Supabase local, Docker 54321-54323)
   - projects, certifications (constraint dropped), documents, audit_events (existing)
   - certification_pendencies (NEW), treasury_authorizations (NEW)
   │
   ▼
Public dossier path (separate, must be fixed regardless of new work):
ProjectsService.get_public_dossier()
   → certification_item() must be split into internal vs public serializer
     (public: decision, methodology, credit_potential, certificate reference/hash,
      date — NO notes)
   → documents list must filter to public-safe document_type
     (public: CERTIFICATION_CERTIFICATE only, unless a doc is explicitly public)
   ▼
MrcaDetails.tsx (public /projeto/:id) — renders certificate + limited history
```

### Recommended Project Structure
No new top-level modules. Extend existing files in place:
```
backend_app/
├── modules/
│   ├── certifier/
│   │   ├── routes.py        # extend: multipart decision, pendency queue, review, history endpoints
│   │   └── service.py        # NEW (optional) — extract decision/validation logic out of routes.py
│   ├── projects/
│   │   ├── service.py        # fix get_public_dossier() visibility; add dossier-completeness check reused by certifier
│   │   └── schemas.py        # add CertificationDecisionRequest (multipart), PendencyItem, TreasuryAuthorizationItem
│   └── treasury/
│       └── routes.py         # add GET /treasury/authorizations queue endpoint (read-only in this phase)
├── db/
│   └── models.py              # add CertificationPendency, TreasuryAuthorization models; drop unique constraint
supabase/
└── migrations/
    └── 2026081500NN_certification_workbench.sql   # NEW — enums, tables, constraint drop, RLS
src/
├── pages/Dashboard/
│   ├── CertifierReview.tsx    # evolve: expandable card, tabs, two queues, decision form, upload
│   └── MrcaDetails.tsx        # add certificate section + limited public history tab
└── services/
    ├── certifierReview.ts     # NEW — typed API calls (mirrors projectDocuments.ts pattern)
    └── database.ts            # extend ProjectPublicDossier type (certificate reference)
```

### Pattern 1: Multipart decision endpoint reusing the existing upload pipeline
**What:** APPROVE decisions must carry a PDF in the same request as the decision fields, and both must commit atomically.
**When to use:** Any endpoint where a file and structured decision data must succeed or fail together (D-14, D-19).
**Example (based on existing `upload_project_document` + `_get_or_create_certification`):**
```python
# Source: backend_app/modules/projects/routes.py:224-309 (existing upload pipeline)
#         backend_app/modules/certifier/routes.py:46-106 (existing decision pipeline)
@router.patch("/certifier/projects/{project_id}/decision")
async def decide_project(
    project_id: str,
    decision: Literal["APPROVE", "REJECT", "REQUEST_CHANGES"] = Form(...),
    methodology: str | None = Form(default=None),
    credit_potential: float | None = Form(default=None),
    credit_potential_adjustment_reason: str | None = Form(default=None),
    notes: str = Form(default=""),
    rejection_category: str | None = Form(default=None),
    certificate: UploadFile | None = File(default=None),
    current_user: AuthenticatedUser = Depends(require_role("certifier", "admin")),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    if decision == "APPROVE" and certificate is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Certificado PDF é obrigatório para aprovação")
    # ... validate dossiê mínimo, then do all writes + certificate upload,
    # then session.commit() ONCE at the end — anything raising before that
    # rolls back the whole decision (D-14, D-19).
```
**Frontend counterpart (mirrors `src/services/projectDocuments.ts`):**
```typescript
// Source: src/services/projectDocuments.ts:33-46 (existing FormData pattern)
const body = new FormData();
body.append('decision', 'APPROVE');
body.append('methodology', methodology);
body.append('credit_potential', String(creditPotential));
body.append('notes', notes);
body.append('certificate', certificateFile); // File from <input type="file" accept="application/pdf">
await apiPost(`/certifier/projects/${projectId}/decision`, body); // apiPatch doesn't exist for FormData — see Pitfall
```

### Pattern 2: Append-only decision history via `audit_events` (no new history table)
**What:** Every certifier action already goes through `create_audit_event`. D-21's required event list (abertura de revisão, pendência criada, resposta do produtor, aprovação, reprovação, pedido de ajustes, certificado anexado, mint autorizado, envio à tesouraria) is a list of `action` string values on the existing table.
**When to use:** Any "who did what when" requirement in this codebase — this is the established pattern (also used by `PROJECT_CREATED`, `PROJECT_DOCUMENT_UPLOADED`, `AUDIT_APPROVED`, etc.)
**Example:**
```python
# Source: backend_app/db/repositories.py:22-46
await create_audit_event(
    session, action="CERTIFICATION_PENDENCY_CREATED", entity_type="projects",
    entity_id=project.id, actor_role=current_user.role,
    metadata={"actor_external_id": current_user.id, "category": category, "description": description},
)
```
**Query for history endpoint:**
```python
select(AuditEvent).where(
    AuditEvent.entity_type == "projects", AuditEvent.entity_id == project.id,
    AuditEvent.action.in_(CERTIFICATION_HISTORY_ACTIONS),   # server-side event-type filter (D-23)
).order_by(AuditEvent.created_at.asc())
# actor filter: AuditEvent.actor_role == role_param or AuditEvent.actor_profile_id == actor_param
```

### Pattern 3: Card-with-tabs expandable review (mirror `AuditorReview.tsx`)
**What:** `AuditorReview.tsx` already implements: `activeProjectId` toggle state, per-project lazy-loaded detail fetch (`monitoringByProject` cache keyed by `friendlyId`), inline sections rendered conditionally when expanded.
**When to use:** `CertifierReview.tsx` must adopt the identical toggle/cache pattern, replacing the single `openEvidenceReview` section with a tabbed layout (`resumo | QTAGs/geofence | documentos | cálculo | decisão | histórico`) using the same `useState<'resumo'|...>` pattern already used by `MrcaDetails.tsx` (`activeTab` state + `nav` of buttons, lines 81 and 200-219).
**Do not copy:** `AuditorReview.tsx`'s evidence-file handling (`addEvidenceFiles`, `local://` URLs, `MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES`) — that is a **client-only, non-persisted stub** that never calls the backend. Copying it for the certificate would silently violate D-11.

### Anti-Patterns to Avoid
- **Reusing `_get_or_create_certification`'s upsert-by-decision-type as-is:** it violates D-09 (decisions must never be edited). The unique constraint `certifications_project_decision_idx` must be dropped in the new migration, and the service function changed to always `INSERT`.
- **Client-side-only dossier-completeness gating:** disabling the "Aprovar" button in React is necessary for UX but insufficient — D-03/D-04 require server-side rejection of an APPROVE decision when baseline/tags/documents are missing, because the endpoint is directly callable.
- **Treating `AuditorReview.tsx` evidence upload as the reference pattern for certificate upload:** it is fake/local-only. The reference pattern for *real* uploads is `projects/routes.py::upload_project_document` + `src/services/projectDocuments.ts`.
- **Adding a `PATCH .../decision` that accepts only JSON:** the certificate must travel in the same request as the decision (D-14, D-19 require atomicity); a JSON-only endpoint would force a two-step client flow (upload doc, then decide) that reintroduces the exact non-atomic failure mode D-14 forbids.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF validation | Custom PDF parser/signature check | `validate_magic_bytes()` from `backend_app/modules/inventory/routes.py:171-177` (checks `%PDF-` header) + existing `.pdf` entry in `ALLOWED_EXTENSIONS`/`MIME_BY_EXTENSION` | Already implemented, tested implicitly by existing inventory/project upload flows; D-12 explicitly limits scope to PDF only, which this already supports |
| File storage | Local filesystem writes, base64-in-DB | `backend_app/modules/supabase_storage.py::upload_storage_object` + `storage_paths.py::project_document_location` | Existing abstraction already handles bucket/object-path conventions and fails closed (`HTTPException 502`) when Supabase Storage is unreachable — consistent with project's fail-closed convention |
| Actor/decision audit trail | New logging table or in-memory event bus | `backend_app.db.repositories.create_audit_event` + `AuditEvent` model | Already the single audit mechanism used by every module (`projects`, `audit`, `certifier`); D-21/D-23 map directly onto its existing columns |
| Credit-potential suggestion | New calculation service | `_credit_potential_from_baseline(baseline)` in `backend_app/modules/projects/service.py:1753-1755` (already used at project-creation time: `vegetation_cover_pct * ndvi_mean * 100`) | D-07 asks for a system-suggested value from project/baseline/methodology data — this helper already exists and is the only "potential" calculation in the codebase; reuse it rather than inventing a second formula |
| Document-type completeness check | New validation logic for "dossiê mínimo" | Adapt `_validate_required_draft_documents()` (service.py:1335-1346), which already checks for `LEGAL_OWNERSHIP`/`CAR` + `FOREST_INVENTORY` document types | Same document-type vocabulary already exists; certifier gate should query `Document` (not `ProjectDraftDocument`) with the same type logic |

**Key insight:** This phase has essentially zero "new algorithm" surface. Every apparent gap (PDF handling, storage, audit trail, potential calculation, document-completeness check) already has a working, in-repo implementation one layer away (drafts, inventory, audits) that only needs to be pointed at the certifier's project-scoped data instead of duplicated.

## Common Pitfalls

### Pitfall 1: `certifications` unique constraint silently overwrites prior decisions
**What goes wrong:** `_get_or_create_certification` (certifier/routes.py:109-125) looks up an existing row by `(project_id, decision)` and reuses/mutates it if found. A second `REQUEST_CHANGES` decision on the same project (very likely, given D-10's correction loop) will silently overwrite the first one's `notes`/`credit_potential`, destroying history.
**Why it happens:** `UniqueConstraint("project_id", "decision", name="certifications_project_decision_idx")` in `db/models.py:230` and the matching SQL constraint in `supabase/migrations/202605220001_initial_schema.sql` were designed for a "one decision per type" MVP, before D-09's append-only requirement existed.
**How to avoid:** New migration must `DROP CONSTRAINT certifications_project_decision_idx` (or the equivalent unique index) and the service function must always `INSERT` a new `Certification` row per decision event, never look up-and-reuse.
**Warning signs:** Any certifier decision test that submits `REQUEST_CHANGES` twice on the same project and expects two distinct history rows will fail against current code.

### Pitfall 2: Public dossier leaks internal certification notes and all document types
**What goes wrong:** `ProjectsService.get_public_dossier` (service.py:200-262) calls `certification_item()` (service.py:1592-1602) which unconditionally includes `notes`, and returns **every** `Document` row for the project regardless of type. `MrcaDetails.tsx:354` already renders `cert.notes` publicly today.
**Why it happens:** The dossier endpoint was built before certifier decisions carried sensitive internal notes (Phase 02/03 predates Phase 04's structured notes/pendency workflow).
**How to avoid:** Split `certification_item()` into an internal serializer (all fields) and a public serializer (decision, methodology, credit_potential, certificate reference/hash, date — no notes); filter `documents` in the public path to public-safe `document_type`s (at minimum, the new `CERTIFICATION_CERTIFICATE` type; audit legal/inventory docs should probably also be excluded, but that is pre-existing behavior outside this phase's explicit scope — flag it, don't silently fix scope creep without confirming with the user).
**Warning signs:** `curl /api/v1/projects/{id}/public-dossier` (unauthenticated) returning certifier `notes` text or `LEGAL_OWNERSHIP`/`FOREST_INVENTORY` document rows.

### Pitfall 3: Alembic is configured but not the actual migration mechanism
**What goes wrong:** A planner unfamiliar with the repo could run `alembic revision --autogenerate` expecting it to produce the schema change, but there is no `versions/` directory and the project's actual migration/seed lifecycle is `supabase/migrations/*.sql` + `npx supabase db reset` (per `.planning/STATE.md`: "migrations e seed passam com `npx supabase db reset`").
**Why it happens:** `alembic.ini` and `backend_app/db/env.py` are present and wired to `Base.metadata`, giving the false impression Alembic is the live migration tool.
**How to avoid:** Write a new hand-authored SQL file under `supabase/migrations/` following the existing naming convention (`YYYYMMDDNNNN_description.sql`, see the 10 existing files), add matching `CREATE TYPE`/`CREATE TABLE` statements, and mirror them in `backend_app/db/models.py` with `create_type=False` for any new enum (matching the existing pattern for `ProjectStatusEnum` etc.). Apply locally with `npx supabase db reset` (also re-runs `seed.sql`).
**Warning signs:** A migration file appearing under `backend_app/db/versions/` instead of `supabase/migrations/`.

### Pitfall 4: `CERTIFIED_AWAITING_TREASURY` status exists but is unused — approval currently skips it
**What goes wrong:** `ProjectStatusEnum` already defines `CERTIFIED_AWAITING_TREASURY` and `PROJECT_STATUS_TO_LIFECYCLE_CODE` already maps it (and `TOKENIZED_LOCKED`) to the `"TOKENIZED_LOCKED"` lifecycle stage — but `decide_project`'s current `APPROVE` branch sets `project.status = "AWAITING_AUDIT"` directly, never touching `CERTIFIED_AWAITING_TREASURY`. RLS policies and `PROJECT_STATUS_PRESENTATION` in `src/services/database.ts:33` already have labels/policies for this status waiting to be used.
**Why it happens:** The enum value was added in anticipation of a treasury-authorization step that Phase 04 is the first phase to actually implement (D-15 through D-19).
**How to avoid:** On `APPROVE`, set `project.status = "CERTIFIED_AWAITING_TREASURY"` instead of `"AWAITING_AUDIT"` — this is what D-17's three status labels ("Certificação aprovada", "Mint autorizado", "Aguardando tesouraria") map onto, and what the treasury queue in Phase 08 will consume. Confirm the intended lifecycle ordering (certification → treasury/mint → audit → available) with the user/planner if any doubt remains, since this changes existing behavior relied upon by the audit queue (`/audit/queue` currently filters on `AWAITING_AUDIT`/`BLOCKED_AUDIT_REQUIRED` — moving APPROVE off `AWAITING_AUDIT` means projects will **not** appear in the audit queue until something (future Phase 08 treasury action) advances them further; this is out of Phase 04's scope to build, but the planner must decide/document what status change (if any) leaves the project in after the treasury package is created, since no phase before Phase 08 will move it forward).
**Warning signs:** `tests/test_api_integration.py` or any new certifier test asserting `new_status == "AWAITING_AUDIT"` after approval — that assertion encodes the *old* (pre-Phase-04) behavior.

### Pitfall 5: `apiPost`/`apiPatch` both accept `FormData`, but the certifier frontend currently calls `apiPatch` with a JSON body
**What goes wrong:** `CertifierReview.tsx:49` calls `apiPatch(..., { decision, notes, certifier_id })` — a JSON body. If the endpoint is changed to accept `multipart/form-data`, the existing JSON call must be replaced with a `FormData` body; `src/services/api.ts:32` already branches on `options.body instanceof FormData` for both `apiPost` and `apiPatch`, so either verb works — but the frontend rewrite must not forget to switch from `body: {...}` (JSON) to `body: formData`.
**Why it happens:** The current implementation predates the certificate-upload requirement.
**How to avoid:** New certifier service module (mirroring `projectDocuments.ts`) should build `FormData` explicitly and call `apiPatch<T>(path, formData)` (verb PATCH is semantically correct for "decide"; `apiPatch` already supports `FormData` per `api.ts`).
**Warning signs:** `Content-Type: application/json` header on a request that also tries to attach a `File`/`Blob` field — will silently drop the file or throw at `JSON.stringify`.

## Code Examples

### Reusable magic-byte + extension validation (already exists — extend, don't reinvent)
```python
# Source: backend_app/modules/inventory/routes.py:22-31, 171-177
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx"}
MIME_BY_EXTENSION = {".pdf": "application/pdf", ...}

def validate_magic_bytes(extension: str, content: bytes) -> None:
    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Magic bytes inválidos para PDF")
```
For the certificate field, reuse this function directly (it already handles `.pdf`); do not add a separate PDF-only validator — D-12 scopes this phase to PDF only, which the existing helper already supports without modification.

### Reusable storage-object path convention (for certificate)
```python
# Source: backend_app/modules/storage_paths.py:26-29
def project_document_location(project_friendly_id: str, document_type: str, sha256: str, extension: str) -> StorageLocation:
    normalized_type = normalize_document_type(document_type)
    object_path = f"projects/{project_friendly_id}/documents/{normalized_type}/{sha256}{extension}"
    return StorageLocation(PROJECTS_BUCKET, object_path, storage_uri(PROJECTS_BUCKET, object_path))
# Certificate: document_type="CERTIFICATION_CERTIFICATE" → reuses this function unmodified
```

### Existing "dossiê mínimo" document-completeness pattern to adapt for the certifier gate
```python
# Source: backend_app/modules/projects/service.py:1335-1346 (adapt: query Document, not ProjectDraftDocument)
def _validate_required_draft_documents(documents: list[ProjectDraftDocument]) -> None:
    types = {document.document_type.upper() for document in documents}
    errors: list[str] = []
    if not ({"LEGAL_OWNERSHIP", "CAR"} & types):
        errors.append("documento legal ou CAR")
    if "FOREST_INVENTORY" not in types:
        errors.append("inventário florestal")
    if errors:
        raise HTTPException(400, detail=f"Envie {', '.join(errors)} antes de enviar o projeto.")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `certifications` upsert-by-decision-type | Append-only insert per decision event | This phase (D-09) | Requires dropping `certifications_project_decision_idx` unique constraint |
| `APPROVE` → `project.status = "AWAITING_AUDIT"` | `APPROVE` → `project.status = "CERTIFIED_AWAITING_TREASURY"` | This phase (D-15..D-17) | `CERTIFIED_AWAITING_TREASURY` enum value (already in schema since initial migration) becomes used for the first time; audit-queue filter (`AWAITING_AUDIT`) will need a follow-up decision about when a project re-enters it (likely Phase 08 territory, but the planner should note the gap explicitly) |
| Certifier decision as JSON `PATCH` | Certifier decision as multipart `PATCH` (FormData) with optional certificate file | This phase (D-11, D-14, D-19) | Frontend `CertifierReview.tsx` decision call must change from JSON body to `FormData` |
| Public dossier serializes all `Certification`/`Document` fields | Public dossier must serialize a minimized, decision/certificate-only view | This phase (D-13, D-20, D-22) — but the underlying leak is pre-existing, not newly introduced | `ProjectsService.get_public_dossier` and `certification_item`/`document_item` need a public/internal split |

**Deprecated/outdated:** None — no external library versions are involved in this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `CERTIFIED_AWAITING_TREASURY` is the correct terminal status for Phase 04's APPROVE decision (rather than keeping `AWAITING_AUDIT` and adding a parallel "treasury package" without a status change) | Architecture Patterns / Pitfall 4 | If wrong, the planner should keep `project.status` on `AWAITING_AUDIT` (or another value) and treat the treasury package purely as a side-table with no status coupling — this needs explicit confirmation since it changes what the audit queue (`/audit/queue`) sees post-approval |
| A2 | `certification_pendencies` and `treasury_authorizations` should be brand-new tables rather than repurposed existing tables (e.g., overloading `documents.metadata_` or a status value on `certifications`) | Standard Stack / Alternatives Considered | Low risk — this follows the codebase's established "one table per domain concept" convention exactly, but the agent has explicit discretion (per CONTEXT.md) over exact table names/shapes |
| A3 | Public dossier document-type filtering should be scoped to *at minimum* hiding non-certificate internal docs, without necessarily redesigning the full public/internal document visibility model in this phase | Common Pitfalls / Pitfall 2 | If the planner treats this as fully in-scope beyond the certificate, it may balloon Phase 04's boundary beyond CONTEXT.md's explicit limits; if treated as fully out-of-scope, CERT-05/D-20 will not be met for the certificate case specifically |

## Open Questions

1. **Does `AWAITING_AUDIT` need a project to pass through `CERTIFIED_AWAITING_TREASURY` first, and what (if anything) in Phase 04 moves a project out of `CERTIFIED_AWAITING_TREASURY`?**
   - What we know: D-16 says treasury execution is a future phase (Phase 08); Phase 04 only creates the authorization package/pendency.
   - What's unclear: whether Phase 04 should leave the project parked indefinitely in `CERTIFIED_AWAITING_TREASURY` (likely, since D-15 explicitly says "não executa mint") or whether some Phase-04-scoped admin/certifier action can still advance it.
   - Recommendation: Plan should leave the project in `CERTIFIED_AWAITING_TREASURY` after approval and treat that as the correct terminal state for this phase — Phase 08 is responsible for the next transition. Confirm this reading with the user if the planner sees it differently.

2. **Should the correction-pendency queue and its "aguardando retorno do produtor" state be modeled as a `project.status` value, a separate flag, or purely via the new `certification_pendencies` table's own `status`?**
   - What we know: D-10 requires the project to leave the main certifier queue and appear in a separate queue with a dashboard counter; D-04 requires the project to be "marcado como pendente de correção."
   - What's unclear: whether this needs a new `ProjectStatusEnum` value (e.g., `CORRECTION_REQUIRED`) or can be derived purely by joining `projects` against open `certification_pendencies` rows (no status enum change needed).
   - Recommendation: Prefer deriving the queue split from `certification_pendencies.status = 'OPEN'` joined to `projects` rather than adding a new project status enum value — this avoids an enum migration and keeps `project.status` semantics (which several places already switch on: `PROJECT_STATUS_TO_LIFECYCLE_CODE`, `MARKETPLACE_READY_PROJECT_STATUSES`, RLS policies) unchanged. Flag for planner confirmation since CONTEXT.md gives the agent discretion on exact table/status design.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker (Supabase local stack) | Applying new migration, running integration tests against Postgres | Not probed in this session (no Bash execution against Docker daemon was needed/available context) [ASSUMED based on STATE.md: "Supabase local oficial roda via Docker em 54321/54322/54323"] | — | If unavailable at execution time, migrations can still be authored/reviewed; `npx supabase db reset` + `uv run pytest -q` require it running |
| Supabase Storage (local) | Certificate PDF persistence | Same as above — code already fails closed (`HTTPException 502`) when `get_supabase_storage_client()` returns `None`/errors, consistent with project convention | — | None needed — existing fail-closed behavior is the intended behavior, not a gap to fix |

No new external SaaS/API dependency is introduced by this phase (no new provider, no new third-party library).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest ≥9.0.3 [VERIFIED: pyproject.toml], async tests via existing `tests/conftest.py` fixtures |
| Config file | `pyproject.toml` ([tool.pytest] section not found by grep — confirm exact discovery config during planning; tests run via `uv run pytest -q` per README.md:38) |
| Quick run command | `uv run pytest tests/test_api_integration.py -x` (requires local Supabase Postgres at `127.0.0.1:54322`, per `tests/conftest.py:11-13`) |
| Full suite command | `uv run pytest -q` |

No frontend test framework exists (no Jest/Vitest in `package.json` devDependencies — only `eslint`, `typescript`, `vite`). Frontend validation for this phase relies on `npm run build` (tsc via Vite) plus the existing manual Playwright script (`tests/test_gui_flows.py`) as a smoke-test extension point — this is consistent with how Phase 02/03 validated frontend work (no unit tests, only build + manual GUI script).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CERT-01 | Certifier opens detailed review with baseline, documents, QTAGs, credit-potential calculation | integration | `uv run pytest tests/test_certifier_workbench.py::test_review_dossier_endpoint -x` | ❌ Wave 0 |
| CERT-02 | Approve/reject allows notes, methodology, credit potential, structured reason | integration | `uv run pytest tests/test_certifier_workbench.py::test_decision_requires_structured_fields -x` | ❌ Wave 0 |
| CERT-03 | Certificate/document reference is recorded and displayed on the project | integration | `uv run pytest tests/test_certifier_workbench.py::test_approve_requires_real_pdf -x` | ❌ Wave 0 |
| CERT-04 | Approval explicitly triggers/prepares lock-and-mint flow with visible status | integration | `uv run pytest tests/test_certifier_workbench.py::test_approve_creates_treasury_authorization -x` | ❌ Wave 0 |
| CERT-05 | Decision history available to certifier + public dossier (minimized) | integration | `uv run pytest tests/test_certifier_workbench.py::test_public_dossier_hides_internal_notes -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/test_certifier_workbench.py -x` (new file) plus `uv run pytest tests/test_api_integration.py -x` (regression on existing certifier/decision contract)
- **Per wave merge:** `uv run pytest -q` (full backend suite) + `npm run build` (frontend type-check/build)
- **Phase gate:** Full suite green before `/gsd-verify-work`; manually extend `tests/test_gui_flows.py` (or a new screenshot script) to cover the expanded certifier queue/tabs if a visual smoke check is desired — this is optional given no frontend test framework exists.

### Wave 0 Gaps
- [ ] `tests/test_certifier_workbench.py` — new file covering CERT-01..05, including: dossiê-mínimo gate (rejects APPROVE without baseline/tags/docs), append-only decision history (two `REQUEST_CHANGES` in a row produce two rows), atomic certificate+treasury-package creation (simulated storage failure rolls back the whole decision), public-dossier note redaction.
- [ ] No new fixtures needed beyond what `tests/conftest.py` already provides (`isolate_optional_storage_env` already isolates Supabase Storage env vars — tests that need to assert "upload succeeds" must set fake credentials or mock `upload_storage_object`; tests that need to assert "fails closed" can rely on the existing isolation fixture).
- [ ] Framework install: none — pytest already installed.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (indirect) | Already enforced upstream via `require_role("certifier", "admin")` dependency (`backend_app/core/roles.py`) — no change needed in this phase |
| V3 Session Management | no | JWT/bearer handling unchanged in this phase |
| V4 Access Control | yes | New endpoints (pendency queue, treasury-authorization read, history) must reuse `require_role("certifier", "admin")` for certifier-only views; producer-facing pendency visibility (so the producer can see and respond, per D-04/D-10) needs a **separate** authorization check scoped to the project's `producer_organization_id`/`developer_organization_id`, mirroring `_assert_project_edit_permission` (service.py:991-1009) |
| V5 Input Validation | yes | Reuse `validate_magic_bytes` + `ALLOWED_EXTENSIONS`/`MIME_BY_EXTENSION` for the certificate field; reuse Pydantic `Literal`/`Field` validators for decision/category enums (already the pattern in `CertifierDecisionRequest`) |
| V6 Cryptography | yes (hash only, not encryption) | SHA-256 content hashing already standard (`hashlib.sha256(content).hexdigest()`) for document integrity — do not hand-roll a different hash or introduce digital-signature crypto in this phase (D-12 explicitly excludes XML/JSON signature formats) |
| V8 Data Protection | yes | This is the core of Pitfall 2 — internal certification notes and non-public document types must not appear in `/projects/{id}/public-dossier` responses; classify this as a data-minimization/least-privilege control, not just a UX nicety |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/oversized PDF disguised as certificate (e.g., renamed `.exe`, zip-bomb PDF) | Tampering / DoS | Already mitigated by extension allowlist + `%PDF-` magic-byte check + `MAX_UPLOAD_BYTES` (10 MB) size cap — reuse unmodified |
| Certifier role bypassing dossiê-mínimo gate by calling the decision endpoint directly (skipping UI validation) | Elevation of Privilege / Tampering | Server-side validation in the route handler (not just disabled UI buttons) — see Architecture Patterns / Anti-Patterns |
| Non-certifier/non-owner reading a project's correction pendency or treasury authorization package via ID guessing | Information Disclosure | New endpoints must authorize by role AND (for producer-visible pendency data) organization ownership, not just "any authenticated user" |
| Public dossier information disclosure (internal certifier notes, non-public documents) leaking via `/projects/{id}/public-dossier` (no auth required) | Information Disclosure | Fix per Pitfall 2 — public/internal serializer split is a security fix, not just a feature nicety, since the endpoint requires no authentication at all |
| Non-atomic certificate+treasury-package write leaving a project in an inconsistent "approved but no certificate" or "certificate but no treasury package" state | Tampering / Repudiation | Single DB transaction (one `session.commit()` at the end of the decision handler) per D-14/D-19 — already the pattern other multi-write flows in this codebase use (e.g., `submit_project_draft`) |

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `backend_app/modules/certifier/routes.py` — current queue + decision endpoints, `_get_or_create_certification`, `_ensure_locked_credit`
- `backend_app/modules/projects/service.py` — `get_public_dossier`, `certification_item`, `document_item`, `_validate_required_draft_documents`, `_credit_potential_from_baseline`, lifecycle/status maps
- `backend_app/modules/projects/routes.py` — `upload_project_document`, `_validated_upload_payload` (FormData/UploadFile reference pattern)
- `backend_app/modules/inventory/routes.py` — `validate_magic_bytes`, `ALLOWED_EXTENSIONS`, `MIME_BY_EXTENSION`, `MAX_UPLOAD_BYTES`
- `backend_app/modules/storage_paths.py`, `backend_app/modules/supabase_storage.py` — storage location/upload abstractions
- `backend_app/db/models.py` — `Certification`, `Document`, `AuditEvent`, `ProjectStatusEnum` (incl. unused `CERTIFIED_AWAITING_TREASURY`), `Project`
- `backend_app/db/repositories.py` — `create_audit_event`
- `backend_app/modules/audit/routes.py` — parallel decision-endpoint pattern (`/audit/verify/{id}`) for comparison
- `backend_app/modules/blockchain/routes.py`, `backend_app/modules/treasury/routes.py` — confirms no mint/adapter call belongs in Phase 04
- `backend_app/api/router.py` — router registration convention (`/api/v1` prefix)
- `src/pages/Dashboard/CertifierReview.tsx`, `src/pages/Dashboard/AuditorReview.tsx` — current + reference UI patterns
- `src/pages/Dashboard/MrcaDetails.tsx` — current public dossier rendering (confirms notes leak)
- `src/services/api.ts`, `src/services/database.ts`, `src/services/projectDocuments.ts` — API client, dossier types, FormData upload reference
- `supabase/migrations/*.sql` (all 10 files) — schema history, confirms constraint origins, confirms no Alembic `versions/` usage
- `tests/conftest.py`, `tests/test_api_integration.py`, `tests/test_gui_flows.py`, `pyproject.toml`, `package.json` — test/validation tooling
- `.planning/codebase/CONVENTIONS.md` — pre-existing, highly specific certifier/tesouraria conventions (near-verbatim match to CONTEXT.md decisions, confirming this research)
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` (§4 Certificadora) — gap analysis consistent with findings above
- `.planning/STATE.md` — Supabase local Docker + `npx supabase db reset` migration mechanics

### Secondary / Tertiary
None used — this phase required no external library research; all findings are direct codebase facts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all versions read directly from `pyproject.toml`/`package.json`
- Architecture: HIGH — every pattern cited is an existing, working code path in this repo
- Pitfalls: HIGH — each pitfall is demonstrated by a specific file/line in the current codebase, not inferred

**Research date:** 2026-08-15
**Valid until:** No external expiry — this research is tied to the current state of the `sinarca` repo on branch `feat/fase-4-certification-workbench`; re-verify only if the certifier/projects modules change before planning executes.
