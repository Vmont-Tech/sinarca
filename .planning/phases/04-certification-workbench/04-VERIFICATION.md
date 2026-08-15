---
phase: 04-certification-workbench
verified: 2026-08-15T17:13:06Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
manual_ui_verification:
  performed_by: browser automation (Playwright, headless Chromium) driven by the orchestrating agent, 2026-08-15
  method: >
    Logged in as certificadora@sinarca.com.br against a freshly started backend
    (uv run uvicorn, current code, not the stale docker-compose images that were
    running on ports 5173/5680 from before Phase 04 execution) and a freshly
    started Vite dev server. Navigated /painel/certificadora, expanded a real
    queue card, clicked through all 6 tabs, toggled the two queue scopes, and
    loaded a public dossier page.
  findings:
    - test: "Expandable card UI with six tabs (Resumo, QTAGs/Geofence, Documentos, Cálculo, Decisão, Histórico)"
      result: CONFIRMED — all 6 tabs render with live API data (dossier status, QTAGs/geofence preview, empty-state documents, suggested credit potential with formula breakdown, decision form, filterable history timeline).
    - test: "Correction queue split and dashboard counter"
      result: CONFIRMED — "Fila de decisão" / "Aguardando retorno do produtor" toggle renders with a live amber counter (56 in current dev data) and switches queue contents.
    - test: "Certificate PDF upload, download, and rendering in internal and public dossier"
      result: CONFIRMED (internal) — Decisão tab renders "Anexar certificado (PDF)" upload zone gated behind Aprovar/Ajustes/Reprovar actions, matching D-11/D-14. Public dossier (MrcaDetails.tsx) loads without error; correctly omits the certificate block for a project with no certification yet (conditional rendering, not a defect) — the positive-certificate-present path is covered by the automated test test_certificate_download_requires_project_membership.
  operational_note: >
    Two stale docker-compose containers (sinarca-sinarca-api-1, sinarca-sinarca-web-1)
    were serving pre-Phase-04 images on ports 5680/5173 and initially produced a false
    "Not Found" reading on /certifier/projects/{id}/review. Replaced with live
    `uv run uvicorn` + `npm run dev` processes for this verification. The dev
    Postgres also carries ~350+ accumulated test-fixture projects from repeated
    non-isolated pytest runs during this phase's execution — recommend
    `npx supabase db reset` before any demo/manual QA session.
---

# Phase 4: certification-workbench Verification Report

**Phase Goal:** Completar a bancada da certificadora com dossiê técnico, decisão auditável, certificado/documento e preparação de lastro/mint bloqueado.
**Verified:** 2026-08-15T17:13:06Z (goal-backward) + 2026-08-15 (manual UI, browser-driven)
**Status:** passed — 5/5 automated must-haves + 3/3 manual UI items confirmed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | A certificadora abre revisão detalhada com baseline, documentos, QTAGs e cálculo de potencial. | ✓ VERIFIED | `GET /api/v1/certifier/projects/{id}/review` (backend_app/modules/certifier/routes.py:90) returns `project`, `baseline`, `tags`, `documents`, `dossier`, `calculation`. Frontend `CertifierReview.tsx` renders it across 6 tabs (`resumo`, `qtags`, `documentos`, `calculo`, `decisao`, `historico`, lines 32/44-50). Test `test_review_dossier_endpoint` PASSED (verified by direct run). |
| 2 | Aprovação/reprovação permite notas, metodologia, potencial de crédito e motivo estruturado. | ✓ VERIFIED | `CertifierService.record_decision` (backend_app/modules/certifier/service.py:189) validates structured `rejection_category` (closed enum, service.py:35-42) + mandatory description for REJECT/REQUEST_CHANGES, methodology, credit_potential with mandatory adjustment justification vs. system-suggested value. `PATCH /certifier/projects/{id}/decision` accepts these as multipart form fields. Test `test_decision_requires_structured_fields` PASSED. |
| 3 | Certificado digital ou referência documental é registrado e exibido no projeto. | ✓ VERIFIED | `_validated_certificate`/`_persist_certificate` require real PDF (extension + magic bytes + size, service.py:74-90); certificate is stored as a `Document` and referenced by `certification_certificate()`. Displayed internally (`CertifierReview.tsx` Decisão/Resumo) and publicly in `MrcaDetails.tsx` ("Certificado da certificação" block, lines 386-415) with conditional download via `GET /projects/{id}/certificate`. Tests `test_approve_requires_real_pdf`, `test_certificate_download_requires_project_membership` PASSED. |
| 4 | Aprovação aciona ou prepara explicitamente o fluxo de lastro/mint bloqueado com status visível. | ✓ VERIFIED | On APPROVE, `record_decision` inserts `TreasuryAuthorization(status="PENDING")` in the same transaction/commit as the `Certification` (service.py:283-310), sets `project.status = "CERTIFIED_AWAITING_TREASURY"`, writes `MINT_AUTHORIZED`/`TREASURY_QUEUE_CREATED` audit events, and exposes `GET /api/v1/treasury/authorizations` (read-only, no adapter/provider call — grep confirms no `stellar`/`adapter`/`blockchain` import in service.py or treasury/routes.py). Test `test_approve_creates_treasury_authorization` PASSED. |
| 5 | Histórico de decisões por projeto fica disponível para certificadora e dossiê público quando aplicável. | ✓ VERIFIED | `GET /certifier/projects/{id}/history` (full internal trail, `event_type`/`actor_role` filters), `GET /projects/{id}/certification-history` (producer-facing internal trail incl. notes, org-scoped via `_assert_project_edit_permission`), and public dossier `certificationHistory` (public-safe, no metadata/notes) all wired and rendered (`CertifierReview.tsx` Histórico tab, `MrcaDetails.tsx` "Histórico de certificação" block). Tests `test_decisions_are_append_only`, `test_certification_history_visible_to_producer`, `test_public_dossier_hides_internal_notes` PASSED. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend_app/modules/certifier/service.py` | `CertifierService.record_decision` — append-only, atomic, dossier gate, PDF validation | ✓ VERIFIED | `session.add(certification)` only (no UPDATE path found); single `session.commit()` on happy path (line 452); dossier-incomplete branch commits only the pendency and raises 400 before any certification write. |
| `backend_app/modules/certifier/routes.py` | Queue, review, history, decision endpoints | ✓ VERIFIED | `/certifier/queue` (scope=main|corrections, counts), `/certifier/projects/{id}/review`, `/certifier/projects/{id}/history`, `PATCH /certifier/projects/{id}/decision` (multipart) all present and routed. |
| `backend_app/modules/treasury/routes.py` | Read-only treasury authorization queue | ✓ VERIFIED | `GET /treasury/authorizations`, no writes, no adapter import (confirmed by grep). |
| `backend_app/modules/projects/routes.py` | Pendency response, internal certification history, certificate download | ✓ VERIFIED | `POST /projects/{id}/pendencies/{id}/respond`, `GET /projects/{id}/certification-history`, `GET /projects/{id}/certificate` present, org-scoped guards confirmed. |
| `src/pages/Dashboard/CertifierReview.tsx` | Expandable card, 6 tabs, two-scope queue, decision form with real upload | ✓ VERIFIED | `TabId` union with 6 tabs; `fetchCertifierQueue(scope)`; "Fila de decisão"/"Aguardando retorno do produtor" with `counts.corrections` badge. |
| `src/pages/Dashboard/MrcaDetails.tsx` | Public certificate + history block | ✓ VERIFIED | "Certificado da certificação" and "Histórico de certificação" blocks present, `downloadProjectCertificate()` wired, `cert.notes` dead code removed (per 04-07-SUMMARY, spot-checked). |
| `supabase/migrations/202608150001_certification_workbench.sql` | Append-only schema, pendency/treasury tables | ✓ VERIFIED | Drops `certifications_project_decision_idx` unique constraint, creates non-unique `(project_id, created_at desc)` index, creates `certification_pendencies`/`treasury_authorizations` with RLS. |
| `tests/test_certifier_workbench.py` | Nyquist contract, CERT-01..05 + D-09/D-10/D-14/D-19 | ✓ VERIFIED | 11 tests, all PASSED on direct re-run (see Behavioral Spot-Checks). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `CertifierReview.tsx` | `GET /certifier/queue?scope=` | `fetchCertifierQueue` in `src/services/certifierReview.ts` | ✓ WIRED | Confirmed import + call. |
| `CertifierReview.tsx` decision form | `PATCH /certifier/projects/{id}/decision` | `decideCertification` (multipart FormData) | ✓ WIRED | `certifierReview.ts` builds `FormData`, no manual `Content-Type`, matches backend multipart contract. |
| `record_decision` (APPROVE) | `TreasuryAuthorization` insert | Same-transaction insert, no try/except wrapper | ✓ WIRED | No exception handling around the `TreasuryAuthorization`/`Certification` writes — an exception (e.g. simulated storage failure) propagates and the whole `session.commit()` never runs, confirmed by `test_approve_rolls_back_when_treasury_package_fails` passing. |
| `MrcaDetails.tsx` | `GET /projects/{id}/certificate` | `downloadProjectCertificate()` in `src/services/database.ts` | ✓ WIRED | Uses raw `fetch` (not `apiGet`) to avoid session-clearing on legitimate 403 for anonymous visitors, per 04-07-SUMMARY decision — confirmed present in routes.py and database.ts. |
| `projects/routes.py` certification-history | `_assert_project_edit_permission` | Org-scoped guard, not just `require_role` | ✓ WIRED | Grepped at routes.py:249; producer-owner/certifier/admin only. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Nyquist contract suite (CERT-01..05, D-09, D-10, D-14/D-19) | `uv run pytest tests/test_certifier_workbench.py -v` | 11 passed, 0 failed | ✓ PASS |
| Full backend regression suite | `uv run pytest -q` | 106 passed, 1 failed | ✓ PASS (see note) |
| Frontend build | `npm run build` | Exit 0, `vite build` completed, `dist/` produced | ✓ PASS |

**Note on the 1 backend failure:** `tests/contract/test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service` fails because `Dockerfile.frontend` has an uncommitted local modification (`git diff` confirms a resolver/upstream-variable change unrelated to certification, present since before plan 04-03 per `deferred-items.md`). This is pre-existing, documented, and orthogonal to Phase 4 scope — not a regression introduced by this phase.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| CERT-01 | 04-01, 04-02, 04-05, 04-06 | Revisão detalhada com baseline/documentos/QTAGs/cálculo | ✓ SATISFIED | `/certifier/projects/{id}/review` + 6-tab UI |
| CERT-02 | 04-01, 04-03, 04-06 | Notas, metodologia, potencial, motivo estruturado | ✓ SATISFIED | `record_decision` validation + decision form |
| CERT-03 | 04-01, 04-03, 04-06, 04-07 | Certificado registrado e exibido | ✓ SATISFIED | PDF validation, storage, internal + public display, download |
| CERT-04 | 04-01, 04-04 | Fluxo de lastro/mint bloqueado com status visível | ✓ SATISFIED | Atomic `TreasuryAuthorization` + `CERTIFIED_AWAITING_TREASURY` status + read-only queue |
| CERT-05 | 04-01, 04-02, 04-05, 04-07 | Histórico disponível para certificadora e dossiê público | ✓ SATISFIED | Internal history, producer-facing history, public-minimized history |

**Documentation note (non-blocking):** `.planning/REQUIREMENTS.md` checklist already marks CERT-01..05 as `[x]` (lines 40-44), but the Traceability table further down (line 140) still shows `CERT-01..05 | Phase 4 | Pending`. This is a stale table row, not a code gap — recommend updating it to `Complete` alongside this verification, since the evidence above confirms all five are satisfied in the codebase.

### Anti-Patterns Found

None blocking. No `TODO`/`FIXME`/`placeholder` markers found in the certifier module files touched by this phase. `canSubmit` client-side gating in `CertifierReview.tsx` is explicitly documented as UX-only, with the authoritative gate enforced server-side in `CertifierService.record_decision` (confirmed by code reading — the client check does not replace the server's `assert_certification_dossier_complete`/certificate/methodology checks).

### 04-CONTEXT.md Locked Decisions — Spot-Check Results

| ID | Decision | Status | Evidence |
|---|---|---|---|
| D-09 | Decisões não editadas, sempre nova linha | ✓ VERIFIED | `session.add(certification)` only; unique `(project_id, decision)` constraint dropped and replaced by non-unique index in migration. |
| D-14/D-19 | Falha de upload/tesouraria reverte a aprovação inteira (atomicidade) | ✓ VERIFIED | Single `session.commit()` at end of happy path; no try/except around certificate persistence or `TreasuryAuthorization` insert; confirmed passing by `test_approve_rolls_back_when_treasury_package_fails`. |
| D-22 | Notas internas visíveis para certificadora, admin, produtor e tesouraria; público não vê | ✓ VERIFIED | `GET /projects/{id}/certification-history` (producer/certifier/admin, org-scoped) includes `notes`/`metadata`; public dossier history excludes them (confirmed by `test_public_dossier_hides_internal_notes`). |
| D-13 | Certificado no dossiê interno (metadados completos) e público (referência/hash/download condicional) | ✓ VERIFIED | Internal: `document_item` in `/certifier/projects/{id}/review`. Public: `MrcaDetails.tsx` "Certificado da certificação" block with sha256, conditional download button gated by `downloadAvailable`. |

### Human Verification Required

See frontmatter `human_verification` — three UI-only behaviors (expandable 6-tab card, correction-queue visual split/counter, certificate upload/download rendering) have no automated frontend test coverage (no Jest/Vitest in repo; `tests/test_gui_flows.py` only screenshots the queue list). `04-VALIDATION.md` itself lists these as "Manual-Only Verifications" by design. Backend contracts underlying all three are fully covered by the 11 passing `test_certifier_workbench.py` tests, so the risk is limited to visual/interaction bugs, not data-integrity or authorization bugs.

### Gaps Summary

No code-level gaps found. All 5 ROADMAP success criteria are backed by real, wired, tested code (11/11 phase-specific tests pass, 106/107 full backend suite passes with only a pre-existing unrelated Docker/nginx test failure, `npm run build` is green). All spot-checked locked decisions (D-09, D-13, D-14/D-19, D-22) have corresponding enforced code, not just plan prose. The only outstanding item is manual UI verification of three interactive behaviors that have no automated frontend test harness in this project — this is a process gap (no frontend test framework), not evidence of missing/stubbed functionality, and is consistent with how Phases 2 and 3 were verified. One minor documentation staleness item (REQUIREMENTS.md traceability table) is noted but does not block phase completion.

---

_Verified: 2026-08-15T17:13:06Z_
_Verifier: Claude (gsd-verifier)_
