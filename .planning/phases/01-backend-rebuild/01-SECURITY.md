---
phase: "01"
slug: "backend-rebuild"
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-15
---

# SECURITY.md — Phase 01: Backend Rebuild (Retroactive Audit)

**Audit date:** 2026-08-15 (retroactive; phase executed 2026-05-22)
**ASVS Level:** L1
**block_on:** high
**Threats verified:** 25/25 (24 CLOSED, 1 DEFERRED-ACCEPTED, 0 OPEN)

This audit verifies threat mitigations declared in the `<threat_model>` blocks of
`01-01-PLAN.md` through `01-06-PLAN.md` against the code currently on
`feat/fase-4-certification-workbench`. Evidence is direct code inspection and/or
test execution — no mitigation was accepted on documentation/intent alone.

## Threat Verification

| ID | Category | Disposition | Status | Evidence |
|----|----------|--------------|--------|----------|
| 01-01-T1 | Contract regression | mitigate | CLOSED | `tests/contract/test_api_v1_contract.py` exists; `pytest -q` → 7 passed |
| 01-01-T2 | Auth/URL bypass | mitigate | CLOSED | `src/pages/Dashboard/RetireCredits.tsx:14,170` imports and calls `apiPost('/marketplace/compensate', ...)`; no `127.0.0.1:5680` literal present |
| 01-01-T3 | Legacy test masking | mitigate | CLOSED | `grep -n "financials\|/api/v1/monetization" tests/test_api_integration.py` → no matches |
| 01-02-T1 | Public admin registration | mitigate | CLOSED | `backend_app/core/roles.py:9,13-20` `PUBLIC_AUTH_ROLES` excludes `admin`; `normalize_public_role` raises HTTP 400. `auth/service.py:57` register() calls it. Admin creation only via `POST /auth/admin/provision`, guarded by `require_role("admin")` (`auth/routes.py:34-40`) |
| 01-02-T2 | Plaintext password | mitigate | CLOSED | `backend_app/core/security.py:10,15,24-29` uses `pwdlib.PasswordHash.recommended()` (Argon2) for hash/verify; `auth/service.py:52,68,89` call `hash_password`/`verify_password`, never compare plaintext |
| 01-02-T3 | Token w/o expiry/central validation | mitigate | CLOSED | `security.py:32-58` `create_access_token`/`decode_token` embed `sub`/`role`/`exp`/`type`; `require_user` rejects missing `sub`/`role` or wrong `type` |
| 01-02-T4 | Accidental Supabase Auth coupling | mitigate | CLOSED | `grep -rn "auth.uid()\|claims" backend_app/modules/auth/ backend_app/core/security.py` → no matches; identity is backend-issued JWT over Postgres `profiles` |
| 01-02-T5 | Missing prod secrets → insecure fallback | mitigate | CLOSED | `backend_app/core/config.py:52-70` `validate_production_secrets` re-verified intact post-merge: raises `ValueError` in `app_env=="production"` when `jwt_secret_key`/`database_url` start with `"dev-"` or `cors_origins` empty/placeholder |
| 01-03-T1 | Financial/token data mutated outside business rules | mitigate | CLOSED | `supabase/migrations/202605220002_rls_policies.sql:30-34` revokes insert/update/delete on `ledger_entries, purchases, retirements, treasury_positions, yield_distributions, chain_events` (+others) from `anon, authenticated`; no compensating insert/update policies exist for those tables |
| 01-03-T2 | Cross-org read/direct mutation via Supabase client | mitigate | CLOSED | Same migration: only static `select` policies scoped to public/visible statuses; no policy references `auth.uid()`; no anon/authenticated write policies on `profiles`, `ledger_accounts`, etc. |
| 01-03-T3 | Schema drift local vs. production | accept (deferred) | DEFERRED-ACCEPTED | `01-03-SUMMARY.md:124-126,162`: remote `supabase db push` was never executed against a linked project; only `supabase start`/`db reset` ran locally. No production Supabase project exists yet, so this cannot be closed by code inspection. Logged here as an accepted risk pending actual deployment — **must be re-verified before any production Supabase project is linked/pushed.** |
| 01-04-T1 | Credit granted w/o persisted ledger balance | mitigate | CLOSED | `backend_app/modules/marketplace/service.py:48-123` `buy()` creates `Purchase` + `ChainEvent` + `LedgerEntry` and decrements `credit.quantity_available` in one `AsyncSession`, single `await self.session.commit()` at end — atomic |
| 01-04-T2 | Auditor/certifier role bypass | mitigate | CLOSED | `certifier/routes.py:33,50` `require_role("certifier","admin")`; `audit/routes.py:35,48` `require_role("auditor","admin")` on queue + decision endpoints |
| 01-04-T3 | Malicious/oversized upload | mitigate | CLOSED | `inventory/routes.py:120-126` extension allowlist (415), size cap 10MB (413), `validate_magic_bytes` for pdf/png/jpeg (400); sha256 computed (`:129`); route guarded by `require_user` (`:114`) |
| 01-04-T4 | Environmental anomaly not blocking sale | mitigate | CLOSED | `monitoring/service.py:92-130` `evaluate_anomaly` sets `project.status="BLOCKED_AUDIT_REQUIRED"`, suspends all credits (`status="SUSPENDED"`, `quantity_available=0`), writes `create_audit_event(action="MONITORING_ANOMALY_BLOCK", ...)` |
| 01-05-T1 | Mint without confirmed collateral | mitigate | CLOSED | `treasury/service.py:34-36` `confirm_collateral_and_mint` raises `RuntimeError` unless `collateral["status"]=="CONFIRMED"` before calling `soroban_adapter.mint_locked` |
| 01-05-T2 | Unnecessary XLM reserve spend | mitigate | CLOSED | `adapters/stellar.py:56-77` `StellarReserveSponsor.sponsor_account_and_trustline` models `BeginSponsoringFutureReserves` payload, matching declared scope ("modela", not live-executes) |
| 01-05-T3 | Social yield not distributed / wrong % | mitigate | CLOSED | `treasury/service.py:17-18,58-60` `OPERATIONAL_YIELD_SHARE=0.90`/`SOCIAL_VAULT_YIELD_SHARE=0.10`; exact test `tests/adapters/test_blockchain_financial_adapters.py:91 test_yield_distribution_splits_90_10_to_social_impact_vault` |
| 01-05-T4 | Fake external token via lock-and-mint | mitigate | CLOSED | `adapters/polygon.py:39-47,113-126` `validate_lock_event`/`_validate_lock_inputs` require `chain=="polygon"`, non-empty `vault_address`/`source_token_address`/`source_tx_hash`, `amount>0` |
| 01-05-T5 | Mocked blockchain accepted as live-provider proof | mitigate | CLOSED | `.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md` documents real attempted commands and explicit BLOCKED status for Soroban/Etherfuse/Polygon; explicitly states "Mock-mode adapter tests are not provider smoke and are not counted as live evidence" — no fabricated success |
| 01-06-T1 | API/web deploy from different commits | mitigate | CLOSED | `docker-compose.dokploy.yml:2-5,36-39` both `sinarca-api` and `sinarca-web` build with `context: .` from the same checkout |
| 01-06-T2 | Secrets leaked in repo | mitigate | CLOSED | `.env.example` contains only placeholder values (`replace-with-...`, `change-me`, example URLs) — no real credentials |
| 01-06-T3 | Frontend calling local API in production | mitigate | CLOSED | `Dockerfile.frontend` declares `ARG VITE_API_URL=/api/v1` / `ENV VITE_API_URL=$VITE_API_URL`; `docker-compose.dokploy.yml:40-41` passes `VITE_API_URL` build arg |
| 01-06-T4 | Deploy passes without real healthcheck | mitigate | CLOSED | `Dockerfile.api:20-21` `HEALTHCHECK` hits `http://127.0.0.1:5680/health`; compose `sinarca-api.healthcheck` block + `sinarca-web` `depends_on: condition: service_healthy` |
| 01-06-T5 | Hidden fallback to legacy `backend/main.py` | mitigate | CLOSED | `grep -rn "backend\.main\|backend/main\.py" Dockerfile.api docker-compose.dokploy.yml README.md` → no matches; `Dockerfile.api:23` CMD runs `backend_app.main:app` |

## Deferred / Accepted Risks Log

| ID | Risk | Reasoning | Re-verification trigger |
|----|------|-----------|--------------------------|
| 01-03-T3 | Local Supabase schema may drift from production schema | No production Supabase project is linked yet (confirmed in `01-03-SUMMARY.md`); a real `supabase db push` cannot be verified by code inspection because there is no remote target. Not a code-level vulnerability today. | Before first `supabase db push` against a linked/production project, or before Phase 01 is considered production-deployed. |

## Unregistered Flags (informational, not blocking)

- `01-01-SUMMARY.md`, `01-04-SUMMARY.md`, `01-05-SUMMARY.md`, `01-06-SUMMARY.md` do not contain a `## Threat Flags` section at all (only `01-02-SUMMARY.md` and `01-03-SUMMARY.md` do). This is a process/documentation gap in those four plans' executor summaries, not a discovered vulnerability — no new attack surface was found during this audit that lacks a threat mapping. Recommend future phases always emit the section explicitly (even `None`) for auditability.

## Notes on Verification Method

- Every `mitigate` threat was checked against the actual file/line cited, not the plan's description of intent.
- `01-02-T5` (production secrets validator) was specifically re-checked given the noted merge-conflict resolution during today's PR5 — `validate_production_secrets` in `backend_app/core/config.py` is intact and functionally correct.
- Contract test suite (`tests/contract/test_api_v1_contract.py`) and legacy suite (`tests/test_api_integration.py` grep) were executed/inspected directly, not assumed from SUMMARY claims, per the caution about prior Nyquist-audit gaps (Soroban contract w/ zero coverage, UserProfile.tsx silent hardcoded-zero route) found earlier the same day.
- Implementation files were read-only throughout; no code was modified as part of this audit.
