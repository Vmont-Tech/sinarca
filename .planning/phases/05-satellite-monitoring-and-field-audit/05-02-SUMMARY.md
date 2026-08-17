---
phase: 05-satellite-monitoring-and-field-audit
plan: 02
subsystem: api
tags: [fastapi, sqlalchemy, audit, evidence, sha256, dossier]

# Dependency graph
requires:
  - phase: 04.2-integrity-layer-foundation
    provides: "Document/Evidence pipeline, IntegrityService.create_evidence_for_document, upload_project_document pattern, PUBLIC_DOCUMENT_TYPES minimization pattern"
  - phase: 04-certification-workbench
    provides: "certifier/service.py::_append_timeline fixed-public-description pattern, reused here to fix an unrelated pre-existing leak"
provides:
  - "POST /api/v1/audit/{project_id}/evidence — real multipart upload of field-audit evidence (PDF/PNG/JPEG/MP4, 50MiB limit), reusing the upload_project_document pipeline verbatim (hash, Storage, dedup, automatic Evidence)"
  - "PATCH /api/v1/audit/verify/{project_id} evolved — evidencias_url now validated as real AUDIT_EVIDENCE Document.id of the same project (400 otherwise); Audit.digital_signature always recomputed server-side (stub SHA-256, backend_app/modules/audit/signature.py, pure module)"
  - "public_audit_item() — minimized audit serializer for the public dossier (existence/status/conclusion/date/evidenceCount/signatureKind/signaturePreview only)"
  - "ProjectsService.get_project_for_auditor — new org-scoped guard for the auditor role (get_editable_project_model does not support it)"
affects: [08-frontend-satellite-and-audit-ui, 05.1-integrity-review-and-external-registries]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure signature module (backend_app/modules/audit/signature.py) mirroring integrity/risk_engine.py's no-DB discipline"
    - "Org-scoped guard method on ProjectsService for a role get_editable_project_model does not cover (get_project_for_auditor), rather than stretching an existing status-gated helper"
    - "Fixed public-safe timeline description per status, mirroring certifier/service.py::_append_timeline (Phase 4)"

key-files:
  created:
    - backend_app/modules/audit/signature.py
    - tests/test_audit_field_evidence.py
  modified:
    - backend_app/modules/audit/routes.py
    - backend_app/modules/projects/service.py
    - tests/test_api_integration.py
    - tests/contract/test_backend_app_api_v1.py

key-decisions:
  - "get_editable_project_model() cannot gate auditor access: its EDITABLE_PROJECT_STATUSES excludes AWAITING_AUDIT/BLOCKED_AUDIT_REQUIRED/CERTIFIED_AWAITING_TREASURY (the exact statuses GET /audit/queue targets), and _assert_project_edit_permission() has no branch for the auditor role. Added ProjectsService.get_project_for_auditor() instead: admin bypasses, auditor requires profile.organization_id == project.auditor_organization_id, everything else 403."
  - "compute_audit_signature's project_id component uses project.friendly_id, not str(project.id) as the plan's interface block showed verbatim. The internal UUID primary key is never exposed by any public route, so using it would make the signature literally unreproducible by the client — contradicting the plan's own must_haves.truths ('mesma entrada produz sempre a mesma assinatura, verificavel pelo cliente'). friendly_id is already the exact value returned as \"project_id\" in the same verify response."
  - "Fixed a pre-existing, previously-undetected leak while writing Task 3's sentinel-string test: PATCH /audit/verify echoed laudo_texto verbatim into project.timeline, which is serialized into the SAME public dossier response as the new public_audit_item block. Replaced with _audit_public_timeline_desc(status), a fixed description per status — exact same pattern already established in certifier/service.py::_append_timeline for certification decisions (Phase 4), including its explicit comment about project.timeline being public."

requirements-completed: [SATM-01, SATM-02, SATM-03]

duration: ~35min
completed: 2026-08-16
---

# Phase 05 Plan 02: Real Field-Audit Evidence, Server-Side Signature, Public Dossier Minimization Summary

**Field-audit evidence is now a real Document+Evidence with server-computed SHA-256 (zero `local://`), `Audit.digital_signature` is a deterministic stub-SHA-256 always recomputed server-side and reproducible by the client, and the public dossier exposes only audit existence/date/conclusion — never the internal report, auditor coordinates, storage hash/path, or the full signature.**

## Performance

- **Duration:** ~35 min (task commits span 22:30–22:45 local time; includes upfront codebase/DB investigation before the first commit)
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `POST /api/v1/audit/{project_id}/evidence`: real multipart upload reusing `upload_project_document`'s exact pipeline (validation, SHA-256, Supabase Storage, hash-based dedup, automatic `Evidence` via `IntegrityService.create_evidence_for_document`), with its own allowlist (PDF/PNG/JPEG/MP4, `.mp4` added only here — global `ALLOWED_EXTENSIONS` untouched) and 50MiB limit.
- `PATCH /api/v1/audit/verify/{project_id}` evolved: `evidencias_url` now resolves and validates real `Document.id`s (AUDIT_EVIDENCE type, same project) via `_resolve_audit_evidence_documents` — rejects non-UUID strings, unknown ids, and ids from another project, all with 400. `Audit.digital_signature` is always recomputed server-side via `compute_audit_signature` (new pure module `backend_app/modules/audit/signature.py`); the client-supplied `assinatura_digital` is discarded.
- Public dossier minimization: `public_audit_item()` replaces `audit_item()` in `get_public_dossier`, exposing only `id/status/conclusion/auditedAt/createdAt/evidenceCount/signatureKind/signaturePreview` (max 13 chars) — never `reportText`, coordinates, `evidenceUrls`, or the full signature hash.
- Discovered and fixed an unrelated pre-existing leak in the same surface: `project.timeline` (serialized in the same public dossier response) was echoing `laudo_texto` verbatim; now uses a fixed public description per status, mirroring the Phase 4 `certifier/service.py::_append_timeline` pattern.

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /audit/{project_id}/evidence — real field-audit evidence upload (D-01)** - `e74231d` (feat)
2. **Task 2: verify with validated Document.id and server-recomputed stub SHA-256 signature (D-02/D-03)** - `05691df` (feat)
3. **Task 3: Minimize audit report/evidence in the public dossier (D-05/SATM-03)** - `91622d3` (feat)

**Plan metadata:** (this commit, immediately following)

## Files Created/Modified

- `backend_app/modules/audit/signature.py` — new pure module: `compute_audit_signature`/`audit_signature_payload`/`AUDIT_SIGNATURE_KIND = "STUB_SHA256"`. No DB/ORM imports (verified: `grep -c 'sqlalchemy\|AsyncSession\|backend_app.db'` → 0).
- `backend_app/modules/audit/routes.py` — new `POST /audit/{project_id}/evidence`; `_validated_audit_evidence_payload`/`_validate_mp4_magic_bytes`; evolved `PATCH /audit/verify/{project_id}` with `_resolve_audit_evidence_documents`; new `_audit_public_timeline_desc`.
- `backend_app/modules/projects/service.py` — new `ProjectsService.get_project_for_auditor` guard; new `AUDIT_PUBLIC_CONCLUSION_LABELS`; new `public_audit_item`; `get_public_dossier` now calls `public_audit_item` instead of `audit_item`; `audit_item` kept and documented as internal-only.
- `tests/test_audit_field_evidence.py` — new file, 17 tests covering Task 1 (upload validation/dedup/roles/org-scope/no-local-scheme) and Task 2 (signature determinism, evidence-id validation, reproducibility).
- `tests/test_api_integration.py` — 2 new tests for Task 3 (`test_public_dossier_audit_block_is_minimized`, `test_public_dossier_audit_signature_is_never_complete`), including a sentinel-string leak check across the *entire* dossier JSON (not just the `audits` block).
- `tests/contract/test_backend_app_api_v1.py` — fixed pre-existing `test_audit_queue_verify_and_monitoring_anomaly_block_project` (not in this plan's declared `files_modified`, but directly exercises the endpoint this plan changed): it sent `evidencias_url: ["https://example.test/evidencia.jpg"]`, a free URL string now correctly rejected (400) by D-02's new validation. Changed to `[]` (empty list, explicitly valid) since the test's actual purpose is the queue→verify→anomaly→auto-hold pipeline, not evidence-attachment coverage (that's `tests/test_audit_field_evidence.py`'s job).

## Response Shapes (for Plan 08 / frontend consumption)

**`POST /audit/{project_id}/evidence` → 201:**
```json
{
  "success": true, "id": "<uuid>", "project_id": "<friendlyId>",
  "document_type": "AUDIT_EVIDENCE", "filename": "...", "sha256": "<64hex>",
  "mime_type": "application/pdf|image/png|image/jpeg|video/mp4",
  "size_bytes": 123, "storage_bucket": "projects",
  "storage_object_path": "projects/.../documents/audit_evidence/<sha256>.<ext>",
  "storage_path": "supabase://projects/...", "status": "UPLOADED"
}
```

**`PATCH /audit/verify/{project_id}` → 200 (new fields added, old ones preserved):**
```json
{
  "success": true, "project_id": "<friendlyId>", "new_status": "ACTIVE|BLOCKED_AUDIT_REQUIRED|RECALCULATION_REQUIRED",
  "audit_date": "<ISO8601>",
  "assinatura_digital": "<64hex, server-computed>",
  "assinatura_tipo": "STUB_SHA256",
  "assinatura_verificavel_em": "<ISO8601, same value used in the hash>",
  "evidencias_url": ["<Document.id uuid>", "..."]
}
```

**Canonical signed string (D-03):** `f"{auditor_id}|{project.friendly_id}|{laudo_texto}|{signed_at.isoformat()}|{','.join(sorted(evidence_ids))}"`, SHA-256 hex digest. `auditor_id` = `payload.auditor_id or current_user.id`. `evidence_ids` sorted before joining — order never affects the hash.

**`public_audit_item` (public dossier `audits[]`):**
```json
{
  "id": "<uuid>", "status": "APPROVED|BLOCKED|RECALCULATED",
  "conclusion": "Auditoria de campo aprovada|Projeto bloqueado por auditoria de campo|Recálculo solicitado pela auditoria de campo",
  "auditedAt": "<ISO8601|null>", "createdAt": "<ISO8601>",
  "evidenceCount": 1, "signatureKind": "STUB_SHA256|null",
  "signaturePreview": "<first 12 hex chars>…|null"
}
```

**Field-audit evidence limits (final):** allowlist `.pdf/.png/.jpg/.jpeg/.mp4`, `MAX_AUDIT_EVIDENCE_BYTES = 50 * 1024 * 1024` (50 MiB) — separate from the global document allowlist (10MiB, no `.mp4`), which was left untouched.

## Decisions Made

See `key-decisions` in frontmatter. Summary:
1. New `ProjectsService.get_project_for_auditor` guard (auditor org-scope), because `get_editable_project_model` cannot support the auditor role at all (status gate + missing permission branch) — verified against the live seeded DB, not just by reading code.
2. Signature's `project_id` component is `friendly_id`, not the internal UUID, so the client can actually reproduce the hash from the response alone.
3. Fixed `project.timeline`'s pre-existing verbatim-laudo leak using the exact Phase 4 `_append_timeline` fixed-description pattern, discovered while implementing Task 3's own literal test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `get_editable_project_model` cannot gate the auditor role**
- **Found during:** Task 1, before writing any code — verified live against the seeded local DB.
- **Issue:** The plan's `<interfaces>`/`<action>` prescribed reusing `ProjectsService.get_editable_project_model` as the org-scoped guard for the new upload endpoint. Two independent facts make this impossible: (a) `EDITABLE_PROJECT_STATUSES = ("DRAFT","CREATED","REGISTERED","BASELINE_PENDING","AWAITING_CERTIFICATION")` excludes `AWAITING_AUDIT`/`BLOCKED_AUDIT_REQUIRED`/`CERTIFIED_AWAITING_TREASURY` — the exact statuses `GET /audit/queue` targets, so it 400s on any project actually under audit; (b) `_assert_project_edit_permission` only has branches for `admin`/`producer`/`certifier` — an `auditor` actor always falls through to the `403` at the end, on any project.
- **Fix:** Added `ProjectsService.get_project_for_auditor(project_id, *, actor_id, actor_role)`: admin bypasses; auditor requires `profile.organization_id == project.auditor_organization_id`; everything else → 403. No status gate (matches existing `verify_project`'s `_get_project_model` behavior, which also has no status gate).
- **Files modified:** `backend_app/modules/projects/service.py`, `backend_app/modules/audit/routes.py`.
- **Verification:** Confirmed via direct DB query that freshly-created test projects auto-assign `auditor_organization_id` to the alphabetically-first auditor org (`EcoVerify Global`, no login profile), while the seeded `PRC-2026-011` (`AWAITING_AUDIT`) matches `auditor@sinarca.com.br`'s org exactly — used both facts to write `test_upload_evidence_org_scoped_auditor_can_upload_to_assigned_project`-equivalent (happy path against `PRC-2026-011`) and `test_upload_rejects_auditor_from_different_organization` (403 against a fresh project). All pass.
- **Committed in:** `e74231d`.
- **Note on the plan's literal acceptance-criteria grep:** `grep -c 'get_editable_project_model' backend_app/modules/audit/routes.py` returns 1 — but that occurrence is a comment referencing this very deviation, not an actual call. The functionally-equivalent grep (`get_project_for_auditor`, count 2: import/definition reference + call) is the real signal.

**2. [Rule 3 - Blocking] Pre-existing contract test broke on the new evidencias_url validation (D-02)**
- **Found during:** Task 2, full-suite regression run.
- **Issue:** `tests/contract/test_backend_app_api_v1.py::test_audit_queue_verify_and_monitoring_anomaly_block_project` (not declared in this plan's `files_modified`, but exercises `PATCH /audit/verify` directly) sent `"evidencias_url": ["https://example.test/evidencia.jpg"]` — a free URL string, valid under the old contract, now correctly rejected with 400 by `_resolve_audit_evidence_documents` (D-02's whole point).
- **Fix:** Changed to `"evidencias_url": []` (an empty list stays explicitly valid — "auditoria sem anexo continua valida"). The test's actual purpose (queue → verify → status transition → satellite-anomaly auto-hold pipeline) is untouched by this change; no assertion in that test inspects `evidencias_url`/evidence content.
- **Files modified:** `tests/contract/test_backend_app_api_v1.py`.
- **Verification:** `uv run pytest -q tests/contract/test_backend_app_api_v1.py` → 40 passed (was 39 passed / 1 failed before the fix).
- **Committed in:** `05691df`.

**3. [Rule 2 - Missing Critical] `project.timeline` leaked `laudo_texto` verbatim into the public dossier**
- **Found during:** Task 3, while writing the sentinel-string test the plan itself specifies (`"NOTA-INTERNA-CONFIDENCIAL-XYZ" not in json.dumps(dossier)` — checking the *whole* dossier, not just `audits`).
- **Issue:** `verify_project`'s `project.timeline` append (preserved verbatim per Task 2's explicit "não alterar" instruction, since it predates this plan) put `payload.laudo_texto` directly into `desc`. `project.timeline` is part of `ProjectMRCA`, embedded in the same public dossier response as the new `public_audit_item` block — so minimizing only `audits[]` was not sufficient to satisfy the plan's own `must_haves.truths` ("nunca reportText interno... no dossiê").
- **Fix:** Added `_audit_public_timeline_desc(status)` returning a fixed public string per status (`"Auditoria de campo aprovada."` / `"Projeto bloqueado por auditoria de campo."` / `"Recálculo solicitado pela auditoria de campo."`), replacing `payload.laudo_texto` in the timeline entry. This exactly mirrors an existing, already-established pattern: `certifier/service.py::_append_timeline` already does this for certification decisions (Phase 4), with an explicit comment stating `project.timeline` is public and must never echo internal notes.
- **Files modified:** `backend_app/modules/audit/routes.py`.
- **Verification:** `test_public_dossier_audit_block_is_minimized` (new) passes; full suite re-run shows no regression in existing timeline-consuming tests.
- **Committed in:** `91622d3`.

**4. [Rule 1 - Bug] Signature's `project_id` component used the internal UUID, contradicting the plan's own reproducibility requirement**
- **Found during:** Task 2, while writing `test_verify_signature_is_reproducible_from_response`.
- **Issue:** The plan's `<action>` text literally specified `project_id=str(project.id)` (the internal DB primary key). No public route exposes this UUID — `ProjectMRCA.id` returns `project.source_hash` (always non-empty once a project has gone through `create_project`), and the verify response's own `"project_id"` field is `project.friendly_id`. A client could never reconstruct the internal UUID to reproduce the hash, directly contradicting the plan's own `must_haves.truths` ("mesma entrada produz sempre a mesma assinatura, verificavel pelo cliente") and its own Task 2 behavior bullet about reproducibility.
- **Fix:** Used `project.friendly_id` instead — already the exact value the verify response returns as `"project_id"`, so the client can recompute the hash purely from that one response.
- **Files modified:** `backend_app/modules/audit/routes.py`.
- **Verification:** `test_verify_signature_is_reproducible_from_response` passes (recomputes the hash client-side using only public-response data and asserts equality).
- **Committed in:** `05691df`.

### Documented but not fixed (plan-authoring inaccuracies, not code issues)

- Task 1's acceptance criterion `grep -c 'ALLOWED_EXTENSIONS' backend_app/modules/inventory/routes.py` expects `1`; the file was never touched by this plan and already had 2 occurrences (definition + usage) before this plan started. The underlying invariant it's checking for ("global allowlist untouched") holds — `git diff` confirms zero changes to `inventory/routes.py`.
- Task 2's acceptance criterion `grep -c 'storage_object_path' backend_app/modules/audit/routes.py` expects `1`; the actual count is 3 (dedup-branch response, `Document(...)` constructor kwarg, new-document response) — all three are inside `upload_audit_evidence` (Task 1's endpoint), none inside `verify_project`, which is the qualitative invariant the criterion is actually protecting.

---

**Total deviations:** 4 auto-fixed (2 Rule 1 bugs, 1 Rule 2 missing-critical, 1 Rule 3 blocking-regression), 2 documented plan-authoring inaccuracies (no code impact).
**Impact on plan:** All four fixes were necessary for the feature to actually work/be secure as the plan's own truths and tests demand — none introduced scope creep beyond the plan's `must_haves.truths`. No frontend, satellite, or migration files were touched (out of scope, as declared in the plan's `<objective>`).

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required. All work is backend-only, uses the existing local Supabase/Postgres and Storage already configured for this repo.

## Next Phase Readiness

- SATM-01/SATM-02/SATM-03 closed. The last operational `local://` path in the system is gone: `grep -c 'local://' backend_app/modules/audit/routes.py` → 0.
- Plan 08 (frontend) can now build against real response shapes documented above: `POST /audit/{project_id}/evidence`, the evolved `PATCH /audit/verify/{project_id}`, and `public_audit_item`'s exact field set for the dossier.
- `ProjectsService.get_project_for_auditor` is a new reusable org-scoped guard pattern for the auditor role — future auditor-facing endpoints (e.g. anything Plan 08 or 05.1 adds for field audit) should reuse it rather than re-deriving permission logic.
- No blockers for the sibling plan (05-01, satellite monitoring): zero file overlap confirmed — this plan touched only `backend_app/modules/audit/*`, `backend_app/modules/projects/service.py`, and test files; it never touched `backend_app/modules/satellite/`, migrations, or `main.py`.

---
*Phase: 05-satellite-monitoring-and-field-audit*
*Completed: 2026-08-16*
