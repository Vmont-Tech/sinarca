---
phase: "01"
slug: "backend-rebuild"
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-22
---

# Phase 01 — Validation Strategy

> Contrato de validação por amostragem para a execução da reconstrução/refatoração do backend SINARCA.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + FastAPI TestClient; npm/Vite; Supabase CLI real; Cargo/Soroban ou Stellar CLI; Docker/Dokploy staging |
| **Config file** | `pyproject.toml`, `package.json`, `soroban-contract/Cargo.toml`, `docker-compose.dokploy.yml` |
| **Quick run command** | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` |
| **Full suite command** | `npm run lint && npm run build && uv run pytest -q` |
| **Estimated runtime** | ~180 segundos sem Docker/Cargo; maior quando builds Docker, Supabase real, Soroban testnet e staging forem incluídos |

## Sampling Rate

- **After every task commit:** Run `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` until `backend_app` contract tests exist; then run the narrow plan-specific pytest command.
- **After every plan wave:** Run `npm run lint && npm run build && uv run pytest -q`.
- **Before `$gsd-verify-work`:** Full suite, Docker/Compose checks, `supabase db push` real, Soroban testnet deploy/invoke/status e staging Dokploy devem estar verdes; Etherfuse/Polygon podem estar bloqueados apenas por falta de acesso documentada.
- **Max feedback latency:** 300 segundos for non-Docker checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | CTX-D03 | API contract drift | Legacy API shape frozen before rebuild | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` | no | pending |
| 01-01-T2 | 01-01 | 1 | CTX-D03 | stale test false positive | Removed expectations for nonexistent `financials` and `/monetization` | integration | `uv run --with pytest --with httpx pytest -q tests/test_api_integration.py` | yes | pending |
| 01-01-T3 | 01-01 | 1 | CTX-D09 | frontend API bypass | `RetireCredits` uses `apiPost` and bearer/base URL | frontend | `npm run lint && npm run build` | yes | pending |
| 01-02-T1 | 01-02 | 2 | CTX-D01 | missing package/deps | `backend_app` package installed explicitly | import | `uv pip install --dry-run .` | no | covered |
| 01-02-T2 | 01-02 | 2 | CTX-D10 | unsafe config | production settings require secrets | import | `uv run python -c "from backend_app.main import app; print(app.title)"` | no | pending |
| 01-02-T3 | 01-02 | 2 | CTX-D04 | weak auth | Argon2 + JWT + admin registration block | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_auth.py` | no | pending |
| 01-03-T1 | 01-03 | 3 | DOCX-LEDGER-OFFCHAIN | missing persistence | SQL schema includes ledger, treasury, cross-chain | static/sql | `rg -n "create table ledger_entries|create table treasury_positions|create table external_chain_projects" supabase/migrations/202605220001_initial_schema.sql` | no | pending |
| 01-03-T2 | 01-03 | 3 | CTX-D08 | RLS bypass / mock drift | RLS enabled without Supabase Auth dependency; full frontend seed imported | static/sql | `rg -n "enable row level security|service role|auth própria|on conflict|PRC-2024-002|mrca_db|tx-001" supabase/migrations/202605220002_rls_policies.sql supabase/seed.sql` | no | pending |
| 01-03-T3 | 01-03 | 3 | CTX-D02 | DB layer import failure | SQLAlchemy models import cleanly | import | `uv run python -c "from backend_app.db.models import Project, LedgerEntry, TreasuryPosition"` | no | pending |
| 01-03-T4 | 01-03 | 3 | CTX-D02 | schema drift | Supabase schema push real before verification | integration | `supabase db push` | no | pending |
| 01-04-T1 | 01-04 | 4 | DOC-PDF-3.1 | project/catalog API mismatch | Project DTO and catalog endpoints preserve frontend shape | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "projects or certifiers or auditors or companies"` | no | pending |
| 01-04-T2 | 01-04 | 4 | DOC-PDF-3.4 | role bypass | Certifier/auditor routes enforce roles and status transitions | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "certifier or audit or anomaly"` | no | pending |
| 01-04-T3 | 01-04 | 4 | DOCX-LEDGER-OFFCHAIN | credit ownership bypass / transaction mocks | Purchases/retirements use ledger entries and transactions page uses API data | contract/frontend | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "marketplace or ledger or compensate or transactions" && ! rg -n "MOCK_TRANSACTIONS" src/pages/Dashboard/Transactions.tsx` | no | pending |
| 01-04-T4 | 01-04 | 4 | CTX-D08 | unsafe upload | Upload validates auth, size, extension, magic bytes and hash | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "inventory or upload"` | no | pending |
| 01-05-T1 | 01-05 | 5 | DOCX-SPONSORED-RESERVES | XLM reserve waste | Sponsored reserves modeled explicitly | unit | `uv run --with pytest pytest -q tests/adapters/test_blockchain_financial_adapters.py -k "stellar or soroban"` | no | pending |
| 01-05-T2 | 01-05 | 5 | DOC-PDF-7 | missing on-chain events | Soroban emits lifecycle events and preserves locks | rust | `cargo test --manifest-path soroban-contract/Cargo.toml` | yes | covered |
| 01-05-T3 | 01-05 | 5 | DOCX-YIELD-SOCIAL | yield split wrong | Yield split is exactly 90/10 | unit | `uv run --with pytest pytest -q tests/adapters/test_blockchain_financial_adapters.py -k "etherfuse or transfero or yield"` | no | pending |
| 01-05-T4 | 01-05 | 5 | DOCX-LOCK-AND-MINT | fake external asset | Polygon lock event validates vault/token/tx hash | unit | `uv run --with pytest pytest -q tests/adapters/test_blockchain_financial_adapters.py -k "polygon or lock_and_mint or stellar_status"` | no | pending |
| 01-05-T5 | 01-05 | 5 | PHASE-LIVE-PROVIDERS | provider mocks accepted as live | Soroban testnet deploy/invoke/status required; Etherfuse/Polygon real attempt or blocker | external | `[BLOCKING] stellar/soroban CLI deploy+invoke+status em testnet` | no | pending |
| 01-06-T1 | 01-06 | 6 | CTX-D10 | wrong runtime image | API Docker runs `backend_app.main:app`; web serves static build | docker | `docker build -f Dockerfile.api . && docker build -f Dockerfile.frontend .` | yes | pending |
| 01-06-T2 | 01-06 | 6 | CTX-D10 | invalid deploy config | Compose Dokploy validates and excludes Postgres | docker | `docker compose -f docker-compose.dokploy.yml config` | no | pending |
| 01-06-T3 | 01-06 | 6 | DOC-BACKEND-INTEGRATION | stale docs | Docs mention backend_app, ledger off-chain, Etherfuse, Transfero, lock-and-mint | static | `rg -n "backend_app|ledger off-chain|Etherfuse|TransferoAdapter|lock-and-mint|Dokploy" README.md .planning/docs/BACKEND_INTEGRATION_SPEC.md .planning/docs/deployment/DOKPLOY.md` | partial | pending |
| 01-06-T4 | 01-06 | 6 | PHASE-GATE | incomplete cutover | Full npm, pytest, Docker/Compose gates run or blockers documented | full | `npm run lint && npm run build && uv run pytest -q && docker compose -f docker-compose.dokploy.yml config` | partial | pending |
| 01-06-T5 | 01-06 | 6 | PHASE-STAGING | staging not actually live | Dokploy API `/health`, auth against Postgres real, frontend using backend_app | external | `[BLOCKING] curl -fsS "$STAGING_API_URL/health"` | no | pending |

## Wave 0 Requirements

- [ ] `tests/contract/test_api_v1_contract.py` — contract stubs for the active legacy API.
- [ ] `tests/contract/test_backend_app_auth.py` — contract stubs for new auth.
- [ ] `tests/contract/test_backend_app_api_v1.py` — contract stubs for new API v1.
- [ ] `tests/adapters/test_blockchain_financial_adapters.py` — adapter stubs for Stellar/Etherfuse/Transfero/Polygon/yield.
- [ ] `tests/db/test_schema_contract.py` — SQL static contract stubs.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase `db push` against real project | CTX-D02 | Requires local Supabase/Docker/auth or remote credentials | Run `supabase db push`; if blocked, record exact CLI error. Static SQL validation is diagnostic only and does not close the phase. |
| Docker image builds | CTX-D10 | Requires Docker daemon available | Run `docker build -f Dockerfile.api .` and `docker build -f Dockerfile.frontend .`; record daemon/tooling blockers. |
| Soroban toolchain | DOC-PDF-7 | Requires Rust/Soroban target availability | Run `cargo test --manifest-path soroban-contract/Cargo.toml`; then execute deploy/invoke/status on testnet. Missing testnet tooling/credentials blocks phase completion. |
| Stellar/Soroban testnet smoke | DOC-PDF-3.3 / PHASE-LIVE-PROVIDERS | Requires testnet account and CLI | Record deploy, invoke and status evidence in `.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md`; this is mandatory. |
| Etherfuse/Polygon sandbox/testnet | DOCX-ETHERFUSE-TESOURO / DOCX-LOCK-AND-MINT | Requires real keys, sandbox account or RPC/vault | Attempt real sandbox/testnet call when credentials exist. If unavailable, record exact blocker; this can be accepted only as external blocker, not mocked success. |
| Dokploy staging smoke | CTX-D10 / PHASE-STAGING | Requires deployed staging URLs and secrets | Record API `/health`, auth própria login against Postgres real and frontend staging consuming `backend_app` in `.planning/docs/deployment/PHASE1-STAGING-SMOKE.md`. |

## Validation Sign-Off

- [x] All tasks have automated verify or explicit external-blocker path.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers missing test references.
- [x] No watch-mode flags.
- [x] Feedback latency target documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending execution

## Validation Audit 2026-08-14

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

### Gap 1 — 01-02-T1 (CTX-D01, missing package/deps)

`uv pip install --system . --dry-run` fails in this environment with a PEP 668
"externally managed environment" error from Homebrew's system Python — an
environment/tooling artifact, not a code defect. Replaced the Automated
Command with `uv pip install --dry-run .` (no `--system`), which resolves
`backend_app`'s packaging config and reports it would install `sinarcaapi`
cleanly. Verified deterministic (exit 0) across repeated runs.

### Gap 2 — 01-05-T2 (DOC-PDF-7, missing on-chain events)

`cargo test --manifest-path soroban-contract/Cargo.toml` previously reported
"running 0 tests" — a genuine coverage gap. Added
`soroban-contract/tests/lifecycle_events.rs` (Cargo integration test
convention) with 4 tests using `soroban_sdk::testutils::Events` to assert
`mint_locked`, `unlock`, `transfer` and `burn` each publish the expected
event, and to assert locked/available balances are preserved exactly across
calls (including a rejected transfer while `BLOQUEADO`). Tests call the
contract through `Env::invoke_contract` (not the generated
`SinarcaTokenClient`, which `lib.rs` does not re-export, and `lib.rs`/
`contract.rs` were out of scope to edit).

To enable this, `soroban-contract/Cargo.toml` was modified (not on the
restricted implementation-file list) to add `crate-type = ["cdylib", "rlib"]`
(rlib needed so `tests/` can link the crate) and a `[dev-dependencies]` entry
enabling the `soroban-sdk` `testutils` feature. Verified the wasm release
build (`cargo build --release --target wasm32v1-none`) still succeeds with
this crate-type change, so the on-chain artifact is unaffected.

Discovered during debugging: `env.events().all()` only holds events from the
single most recent top-level `invoke_contract` call — any further contract
call (including read-only views) clears the prior event log. Assertions were
restructured to check events immediately after the mutating call they verify.
Confirmed each test can genuinely fail (temporarily corrupted an expected
value and observed the assertion fail, then reverted).

`cargo test --manifest-path soroban-contract/Cargo.toml` now runs 4 tests,
all passing (was 0 tests before).
