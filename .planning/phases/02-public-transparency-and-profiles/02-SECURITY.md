---
phase: "02"
slug: "public-transparency-and-profiles"
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-15
---

# Security Audit — Phase 02: Public Transparency and Profiles

Retroactive audit. Executed 2026-05-26. Verified 2026-08-15.
Threat register source: `<threat_model>` blocks in 02-01-PLAN.md through 02-05-PLAN.md (register_authored_at_plan_time: true).
SUMMARY.md files for 02-01 through 02-05 contain no `## Threat Flags` section — no unregistered attack surface reported by the executor.

## Method

Every threat below has disposition `mitigate`. Each was verified by locating the actual mitigating code (grep + direct file read), not by trusting plan intent, commit messages, or prior UAT curl output alone. Where the auditor's prior curl/rg evidence was supplied, it was spot-checked against source rather than accepted at face value, per task instructions.

## Threat Verification

### 02-01 — Fechar navegação pública, páginas legais e copy institucional

| ID | Category | Disposition | Status | Evidence |
|----|----------|-------------|--------|----------|
| 02-01-T1 | Broken clean URLs / `/public` regression | mitigate | CLOSED | `rg -Pn "/public(?!Contact|-dossier)" src` → only `src/App.tsx:58` (path normalization) and `:114` (`<Route path="/public/*" element={<LegacyPublicRedirect />} />`), the declared compat redirect. No other `/public` reference in `src/`. |
| 02-01-T2 | Fictitious/placeholder legal contacts | mitigate | CLOSED | `src/constants/publicContact.ts` defines `contato@`, `suporte@`, `dpo@`, `compliance@sinarca.com.br`. Confirmed actual usage (not just declaration) in `Terms.tsx:101`, `Privacy.tsx:83,97`, `LegalSupport.tsx:88`, `DataGovernance.tsx:88`, `components/legal/LegalPage.tsx:44,53`, `components/Footer.tsx:26,60`. No hardcoded fake city/foro string found (`rg "cidade\|foro de\|comarca" src/pages/Public` → no fabricated jurisdiction matches). |
| 02-01-T3 | Copy implying certification/audit/legal consulting SINARCA doesn't do | mitigate | CLOSED | `Terms.tsx:19` "Não certificamos, não produzimos e não auditamos créditos ambientais." `LegalSupport.tsx:17` "O SINARCA não atua como consultoria jurídica, mas como um facilitador tecnológico...". Positioning language present and consistent with Bible docs 10/11. |
| 02-01-T4 | Fixed public counters violating mock-runtime rule | mitigate | CLOSED | `src/LandingPage.tsx:102` `const [stats, setStats] = useState<LandingStats \| null>(null)`, populated in `useEffect` (line 106+) via real fetch, rendered with `'Carregando'` loading fallback (lines 201/208/215), not a fixed literal. |

### 02-02 — Contrato público de dossiê, transações e perfis

| ID | Category | Disposition | Status | Evidence |
|----|----------|-------------|--------|----------|
| 02-02-T1 | Sensitive personal data in public endpoints | mitigate | CLOSED | `backend_app/modules/projects/service.py:1551` defines `mask_document()`, applied at lines 828, 836 (`public_profile()`) and 1543 (catalog item). `public_profile()` return dict (lines 824-850) contains no `email`/`phone` fields at all — confirmed via `rg "\.email\|\.phone" backend_app/modules/projects/service.py` → no matches. Contract test `test_public_profiles_contract_includes_producers_and_minimized_document` (line 149-150) asserts `document.startswith("***")` and `"email" not in public_profile`. |
| 02-02-T2 | UI relying on fragile multi-call dossier assembly | mitigate | CLOSED | `GET /projects/{project_id}/public-dossier` (`routes.py:216`, `service.py:200` `get_public_dossier`). Contract test `test_public_dossier_contract_exposes_project_transparency_data` (line 104) asserts single response contains `tags`, `baseline`, `certifications`, `audits`, `documents`, `credits`, `transactions`, `chainEvents`. |
| 02-02-T3 | Transaction filters diverging between API and frontend | mitigate | CLOSED | `backend_app/modules/marketplace/routes.py:73-88` accepts `project_id`, `hash`, `type`, `buyer`, `status`, `limit` query params. Contract test `test_public_transactions_contract_supports_filters_and_detail` (line 126) exercises combined filters + detail-by-hash lookup. |
| 02-02-T4 | Insufficient seed forcing frontend hardcoded fallback | mitigate | CLOSED | `supabase/seed.sql` contains producer (`prod-001`), company (`comp-001`), auditors (`aud-001/002/005`), certifiers (`std-001/002/003`), and multiple projects with linked tags/baseline/audits/timeline (e.g. `PRC-2024-002`, `PRC-2026-010/011`). |

### 02-03 — Dossiê público completo e explorer de transações

| ID | Category | Disposition | Status | Evidence |
|----|----------|-------------|--------|----------|
| 02-03-T1 | Dossiê with fictitious fixed documents/laudos | mitigate | CLOSED | `rg -n "PDD\|Relatório de Validação\|Certidão de Posse\|15 Out 2024\|Algorand\|Gateway de Pagamento Blockchain" src/pages/Dashboard/MrcaDetails.tsx` → 0 matches (re-verified directly, not just cited from prior audit). |
| 02-03-T2 | Explorer links to generic pages without context | mitigate | CLOSED | `src/pages/Dashboard/PublicExplorer.tsx:281` `navigate(evt.projectId ? \`/projeto/${evt.projectId}\` : '/consulta')`; `:318` `navigate(\`/tx/${evt.hash}\`)`. |
| 02-03-T3 | UI confusing off-chain ledger with real on-chain success / legacy network labels | mitigate | CLOSED | `rg -n "Algorand" src -i` → 0 matches anywhere in `src/`. |
| 02-03-T4 | Local filters diverging from API filters | mitigate | CLOSED | `PublicExplorer.tsx:69-76` calls `database.getTransactions({ type, hash, projectId, buyer, status, limit })` inside `useEffect`; `src/services/database.ts:328-338` builds a real `URLSearchParams` (`project_id`, `hash`, `type`, `buyer`, `status`, `limit`) and calls `apiGet('/transactions?...')` — not a client-side-only filter over a pre-fetched list. |

### 02-04 — Perfis públicos, catálogos e rankings por papel

| ID | Category | Disposition | Status | Evidence |
|----|----------|-------------|--------|----------|
| 02-04-T1 | Public profile exposing full CPF/CNPJ, email, or phone | mitigate | CLOSED | Same evidence as 02-02-T1 — `mask_document()` applied, no email/phone fields in `public_profile()` payload. |
| 02-04-T2 | Fabricated reputation/impact metrics in UI | mitigate | CLOSED (fixed 2026-08-15) | `src/pages/Dashboard/UserProfile.tsx` self-view branch confirmed intact (calls `database.getPublicProfile(user.id)` before any zeroed fallback). `AuditorProfile.tsx:67`'s hardcoded `100%` was a genuine gap found by this audit — fixed: now computes `approvalRateLabel` from `projects.filter(p => p.type !== 'bloqueado').length / projects.length`, showing `—` when there are no projects. Regression test: `tests/contract/test_frontend_auth_contract.py::test_auditor_profile_computes_real_approval_rate_instead_of_hardcoded_100`. |
| 02-04-T3 | Producers left out of public ecosystem | mitigate | CLOSED | `GET /api/v1/producers` returns seeded producers (curl-verified, 102 records). `src/services/database.ts:248` `getProducers()` hits real endpoint; `Companies.tsx:13` and `ImpactLeaders.tsx:54` consume it; `/perfil/:id` route (`App.tsx:73,141`) serves producer profiles via `UserProfile.tsx`. |
| 02-04-T4 | Profile pages duplicating divergent logic | mitigate | DEFERRED-ACCEPTED | Confirmed: `CompanyProfile.tsx`, `AuditorProfile.tsx`, `CertifierProfile.tsx` each independently fetch catalog + market projects and join by name-string matching, instead of reusing `getPublicProfile()`. This is a maintainability/code-quality gap, not a data-exposure or broken-behavior vulnerability — each page still renders correct data for its own role today (verified no incorrect cross-role leakage). Consolidating three live, working pages into one shared fetch path is a refactor with real regression risk if rushed; deferring to a dedicated cleanup pass rather than doing it under a security-audit fix cycle. See Accepted Risks Log. |

### 02-05 — Cadastro por perfil, edição de perfil e erros amigáveis

| ID | Category | Disposition | Status | Evidence |
|----|----------|-------------|--------|----------|
| 02-05-T1 | Public registration allowing `admin` | mitigate | CLOSED | UI: `src/pages/Login.tsx:20,117` types role as `Exclude<UserRole, 'admin'>` — admin structurally unselectable. Backend: `backend_app/core/roles.py:13-20` `normalize_public_role()` raises HTTP 400 "Admin deve ser provisionado fora do cadastro público" for any role outside `PUBLIC_AUTH_ROLES`; invoked at `backend_app/modules/auth/service.py:57`. Contract test asserts 400 for `role: "admin"`. Curl-verified (400). |
| 02-05-T2 | Technical errors leaking internal details | mitigate | CLOSED (best-effort — no visual confirmation) | `src/services/api.ts:16-23` `friendlyError()` maps 401→"Credenciais inválidas ou sessão expirada...", 403, 409→"Este e-mail já está cadastrado.", 422, 5xx→"API indisponível...". Network failures caught separately (line 46-47) with a human message. Mapping logic is present and correctly scoped to the statuses the plan calls out (401/409). Rendered-UI visual check ("does it actually look friendly on screen") not possible this session — no browser automation tool available; classified CLOSED on code-inspection grounds per task instructions, with this caveat noted rather than silently skipped. |
| 02-05-T3 | Expired session leaving user in broken state | mitigate | CLOSED (fixed 2026-08-15) | Gap confirmed by this audit: `clearAuthSession()` cleared `localStorage` on 401 but never told `AuthContext`'s React state, so `ProtectedRoute` kept rendering the stale authenticated view mid-session. Fixed: `api.ts` now dispatches `window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))` inside `clearAuthSession()`; `AuthContext.tsx` registers a `window.addEventListener(SESSION_EXPIRED_EVENT, () => setUser(null))` in its mount effect. `setUser(null)` flips `isAuthenticated` to false, and `ProtectedRoute.tsx`'s existing `<Navigate to="/login" replace />` branch fires immediately — no change needed there. Regression test: `tests/contract/test_frontend_auth_contract.py::test_session_expiry_clears_auth_context_user`. |
| 02-05-T4 | Avatar/document appearing persisted but staying local | mitigate | CLOSED | `Settings.tsx` uses `updateProfile` (→ `PATCH /auth/me`, `AuthContext.tsx:132-139`), `uploadAvatar` (→ `POST /auth/me/avatar`, backend `auth/service.py:116` `upload_avatar()`), `uploadUserDocument` (→ `POST /auth/me/documents`) — all real network calls, no local-only simulation. Curl-verified earlier: PATCH persisted to Postgres, confirmed via subsequent GET. |
| 02-05-T5 | Terms/privacy opening `alert()` instead of real pages | mitigate | CLOSED | `rg "alert(" src/pages/Login.tsx` → 0 matches. `Login.tsx:470` uses `onClick={goToPublicPage('/termos')}` / `('/privacidade')`; footer links (`:487,489`) use `navigate('/termos')` / `navigate('/privacidade')`. |

## Unregistered Flags

None. All five `02-0N-SUMMARY.md` files were checked for a `## Threat Flags` section; none exists in any of them (headings present are only `## Entregas`, `## Verificação`, `## Decisões e Desvios`, `## Auto-checagem`). No new attack surface was self-reported by the executor beyond the planned threat register.

## Accepted Risks Log

| ID | Risk | Reasoning | Re-verification trigger |
|----|------|-----------|--------------------------|
| 02-04-T4 | `CompanyProfile.tsx`/`AuditorProfile.tsx`/`CertifierProfile.tsx` each independently join catalog + market-project data by name-string matching instead of reusing `getPublicProfile()` | Code-quality/maintainability issue, not a data-exposure or correctness bug — each page renders correct, role-scoped data today. Consolidating three live pages carries real regression risk if done hastily under a security-audit fix cycle. | Before any of the three pages is next modified for feature work, or if a bug report surfaces incorrect project attribution on one of them. |

## Security Audit 2026-08-15

| Metric | Count |
|--------|-------|
| Threats found | 21 |
| Closed (already mitigated) | 18 |
| Fixed this audit | 2 (02-04-T2, 02-05-T3) |
| Deferred-accepted | 1 (02-04-T4) |
| Open | 0 |

Fixes verified: `uv run pytest -q` → 96 passed (was 94). `npm run lint && npm run build` → exit 0. Both fixes committed with regression tests in `tests/contract/test_frontend_auth_contract.py`.
