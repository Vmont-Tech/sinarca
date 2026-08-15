---
phase: "03"
slug: "project-origination-and-documents"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-26
---

# Phase 03 — Validation Strategy

> Contrato de validação por amostragem para execução da originação de projetos.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + FastAPI TestClient; npm/Vite/ESLint |
| **Config file** | `pyproject.toml`, `package.json` |
| **Quick run command** | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project or upload"` |
| **Full suite command** | `npm run lint && npm run build && uv run pytest -q` |
| **Estimated runtime** | ~180 segundos |

## Sampling Rate

- **After every task commit:** Run the narrow command listed in each plan task.
- **After every plan wave:** Run `npm run lint && npm run build && uv run pytest -q`.
- **Before `$gsd-verify-work`:** Full suite must be green and UAT manual for `/painel/adicionar-projeto` must be recorded.
- **Max feedback latency:** 300 segundos for non-Docker checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | 03-01 | 1 | CHECKLIST-3-documents | T-03-DOC-01 | Upload requires auth, allowed extension, magic bytes and hash | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document"` | yes | covered |
| 03-01-T2 | 03-01 | 1 | CHECKLIST-3-tags | T-03-TAG-01 | Project creation with four tags persists tags and baseline | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project"` | yes | covered |
| 03-01-T3 | 03-01 | 1 | CHECKLIST-3-timeline | T-03-AUDIT-01 | Sensitive project/document changes write audit events | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document or project"` | yes | covered |
| 03-02-T1 | 03-02 | 2 | CHECKLIST-3-form | T-03-UI-01 | AddProject captures required technical fields | frontend | `npm run lint && npm run build` | yes | covered |
| 03-02-T2 | 03-02 | 2 | CHECKLIST-3-tags | T-03-TAG-02 | UI sends `tags` to `apiPost('/projects', ...)` | static/frontend | `rg -n "tags:|apiPost<any>\\('/projects'" src/pages/Dashboard/AddProject.tsx` | yes | covered |
| 03-03-T1 | 03-03 | 2 | CHECKLIST-3-geofence | T-03-GEO-01 | Geofence preview derives from A/B/C/D coordinates | frontend/static | `rg -n "buildGeofence|vertex_label|polygon|points" src` | yes | covered |
| 03-03-T2 | 03-03 | 2 | CHECKLIST-3-nfc | T-03-NFC-01 | NFC unsupported/fallback states fail closed | frontend/static | `rg -n "NDEFReader|unsupported|manual|CMAC|SUN" src` | yes | covered |
| 03-04-T1 | 03-04 | 3 | CHECKLIST-3-documents | T-03-DOC-02 | UI uploads project docs with FormData and lists persisted docs | frontend/backend | `npm run lint && npm run build && uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document"` | yes | covered |
| 03-05-T1 | 03-05 | 3 | CHECKLIST-3-public-dossier | T-03-DATA-01 | Project dossier shows API-backed tags, baseline, docs and timeline | frontend | `npm run lint && npm run build` | yes | covered |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — os itens abaixo já existiam quando esta auditoria rodou em 2026-08-14, então nenhuma stub nova foi necessária.

- [x] `tests/contract/test_backend_app_api_v1.py` cobre upload/list de documentos do projeto.
- [x] Checks estáticos/frontend via `rg` cobrem tags, geofence e NFC.
- [x] `python-multipart` permanece declarado em `pyproject.toml`.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser NFC capability | CHECKLIST-3-tags | Depends on mobile hardware/browser and Web NFC support | Use supported Android/Chrome device if available; otherwise record UI state `hardware indisponível` and manual fallback evidence. |
| Geolocation permission | CHECKLIST-3-geofence | Browser permission prompt cannot be fully asserted by current test stack | Deny and allow permission in browser; confirm manual lat/lng fallback and high-accuracy capture state. |
| Project creation UAT | CHECKLIST-3-form | End-to-end UI has no automated browser runner in npm scripts | Fill `/painel/adicionar-projeto`, create project, open detail/dossier and verify QTAGs, docs, baseline and timeline. |
| Sentinel/SUN live blocker | CHECKLIST-3-sentinel | Requires provider credentials and tag master keys | Record explicit blocker or successful provider evidence; mocked success is not accepted. |

## Validation Sign-Off

- [x] All tasks have automated verify or explicit manual/external-blocker path.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers missing test references.
- [x] No watch-mode flags.
- [x] Feedback latency target documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** validated 2026-08-14

## Validation Audit 2026-08-14

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Todas as 9 tasks re-executadas e confirmadas verdes: `pytest -k "project_document"` (4 passed), `pytest -k "project"` (15 passed), `pytest -k "project_document or project"` (15 passed), `npm run lint` (limpo), `npm run build` (sucesso), e os 3 checks estáticos (`tags:`/`apiPost`, geofence com 90 ocorrências, NFC com 26 ocorrências incluindo `CMAC`/`SUN`). Nenhum comando obsoleto e nenhum bug de implementação encontrado — diferente das Fases 01 e 02, esta fase não precisou de correções.
