---
phase: 04
slug: certification-workbench
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-15
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest ≥9.0.3 (backend, async via `tests/conftest.py` fixtures) |
| **Config file** | `pyproject.toml` |
| **Quick run command** | `uv run pytest tests/test_api_integration.py -x` (requires local Supabase Postgres at `127.0.0.1:54322`) |
| **Full suite command** | `uv run pytest -q` |
| **Estimated runtime** | ~30-90s (local Postgres-backed integration suite) |

No frontend test framework exists (no Jest/Vitest). Frontend validation relies on `npm run build` (tsc via Vite) plus the existing manual Playwright script (`tests/test_gui_flows.py`), consistent with how Phase 02/03 validated frontend work.

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest tests/test_certifier_workbench.py -x` (new file) plus `uv run pytest tests/test_api_integration.py -x` (regression on existing certifier/decision contract)
- **After every plan wave:** Run `uv run pytest -q` (full backend suite) + `npm run build` (frontend type-check/build)
- **Before `/gsd-verify-work`:** Full suite must be green; manual smoke via `tests/test_gui_flows.py` extension optional (no frontend test framework)
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | CERT-01 | V4 | Certifier-only dossiê endpoint | integration | `uv run pytest tests/test_certifier_workbench.py::test_review_dossier_endpoint -x` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CERT-02 | V5 | Decision rejects missing required fields | integration | `uv run pytest tests/test_certifier_workbench.py::test_decision_requires_structured_fields -x` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CERT-03 | V5 | Approve rejects fake/non-PDF certificate | integration | `uv run pytest tests/test_certifier_workbench.py::test_approve_requires_real_pdf -x` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | CERT-04 | V8/Tampering | Approve creates atomic treasury authorization | integration | `uv run pytest tests/test_certifier_workbench.py::test_approve_creates_treasury_authorization -x` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | CERT-05 | V8 | Public dossier hides internal notes/non-public docs | integration | `uv run pytest tests/test_certifier_workbench.py::test_public_dossier_hides_internal_notes -x` | ❌ W0 | ⬜ pending |

*Exact plan/task IDs finalized by the planner; this map is the requirement→test contract, not the literal task numbering.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_certifier_workbench.py` — new file covering CERT-01..05: dossiê-mínimo gate (rejects APPROVE without baseline/tags/docs), append-only decision history (two `REQUEST_CHANGES` in a row produce two rows, not an overwrite), atomic certificate+treasury-package creation (simulated storage failure rolls back the whole decision), public-dossier note/document redaction.
- [ ] No new fixtures needed beyond `tests/conftest.py` (`isolate_optional_storage_env` already isolates Supabase Storage env vars).
- [ ] Framework install: none — pytest already installed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Expandable card UI with tabs (resumo, QTAGs/geofence, documentos, cálculo, decisão, histórico) renders and behaves correctly | CERT-01/D-02 | No frontend test framework in repo | Run `npm run dev`, log in as certificadora, open `/painel/certificadora`, expand a queue card, click through all 6 tabs |
| "Aguardando retorno do produtor" queue and dashboard counter update on pedido de ajustes | D-10 | No frontend test framework | Request adjustments on a project, verify it leaves main queue and appears in the secondary queue with counter incremented |
| Certificate PDF renders/downloads correctly in internal and public dossier | D-13 | No frontend test framework | Approve with certificate upload, verify PDF reference visible in `CertifierReview.tsx` and `MrcaDetails.tsx` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
