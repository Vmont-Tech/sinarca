---
phase: 01-backend-rebuild
plan: 01-05
subsystem: blockchain-finance
tags: [stellar, soroban, etherfuse, polygon, treasury, fastapi, pytest]

# Dependency graph
requires:
  - phase: 01-backend-rebuild
    provides: Supabase Postgres schema, ledger, treasury, chain_events and operational API modules from 01-03/01-04
provides:
  - Stellar/Soroban adapter layer with sponsored reserves and fail-closed testnet/live config
  - Soroban lifecycle events for mint_locked, unlock, transfer and burn
  - ISinarcaLiquidity with Etherfuse sandbox/mock and Transfero future-port adapter
  - Treasury service and admin harvest route with 90/10 SocialImpactVault yield split
  - Polygon lock-and-mint adapter and protected external project route
  - Provider smoke evidence document with exact blockers for live testnet/sandbox execution
affects: [api-v1, blockchain-adapters, treasury, provider-smoke, phase-01-backend-rebuild]

# Tech tracking
tech-stack:
  added: [stellar-cli-26-local-smoke, rust-wasm32v1-none-target]
  patterns: [fail-closed provider adapters, provider smoke blocker documentation, off-chain ledger preserving auth]

key-files:
  created:
    - backend_app/adapters/__init__.py
    - backend_app/adapters/stellar.py
    - backend_app/adapters/liquidity.py
    - backend_app/adapters/etherfuse.py
    - backend_app/adapters/transfero.py
    - backend_app/adapters/polygon.py
    - backend_app/modules/blockchain/__init__.py
    - backend_app/modules/blockchain/routes.py
    - backend_app/modules/treasury/__init__.py
    - backend_app/modules/treasury/routes.py
    - backend_app/modules/treasury/service.py
    - tests/adapters/test_blockchain_financial_adapters.py
    - .planning/docs/providers/PHASE1-PROVIDER-SMOKE.md
  modified:
    - .gitignore
    - backend_app/api/router.py
    - soroban-contract/src/contract.rs

key-decisions:
  - "backend_app auth própria permaneceu canônica; as novas rotas protegidas usam require_role e não Supabase Auth."
  - "Stellar/Soroban, Etherfuse e Polygon em testnet/sandbox falham fechado sem segredos/configuração obrigatória."
  - "Mocks continuam apenas para testes unitários e não foram apresentados como provider smoke."
  - "Soroban SDK 26 aceitou build WASM com target wasm32v1-none; wasm32-unknown-unknown ficou incompatível com o Rust atual."

patterns-established:
  - "Adapters de provedores têm modo mock testável e modo externo que exige configuração explícita."
  - "Provider smoke registra comandos, outputs e bloqueios sem fabricar contract id, hash ou evidência live."
  - "Yield social é calculado em TreasuryService com 90% operacional e 10% SocialImpactVault."

requirements-completed: [DOC-PDF-3.3, DOC-PDF-3.5, DOC-PDF-3.7, DOCX-SPONSORED-RESERVES, DOCX-ETHERFUSE-TESOURO, DOCX-LIQUIDITY-ADAPTER, DOCX-YIELD-SOCIAL, DOCX-LOCK-AND-MINT]

# Metrics
duration: 11min
completed: 2026-05-22
---

# Phase 01 Plan 01-05: Blockchain, Liquidity and Treasury Adapters Summary

**Adapters Stellar/Soroban, Etherfuse/Tesouro, Transfero futuro, tesouraria 90/10 e Polygon lock-and-mint com testes locais e blockers reais de provider smoke.**

## Performance

- **Duration:** 11min
- **Started:** 2026-05-22T22:24:33Z
- **Completed:** 2026-05-22T22:35:29Z
- **Tasks:** 5
- **Files modified:** 17

## Accomplishments

- Criado adapter Stellar/Soroban com `BeginSponsoringFutureReserves`, payloads para `chain_events`, modo mock testável e falha fechada em `testnet/live` sem chaves/RPC.
- Atualizado contrato Soroban para emitir eventos rastreáveis em `mint_locked`, `unlock`, `transfer` e `burn`, preservando `TOKEN_LOCKED` e regras de burn/admin.
- Criada interface `ISinarcaLiquidity`, `EtherfuseAdapter` com instrumento `Tesouro Direto`, `TransferoAdapter` de portabilidade futura e serviço de tesouraria com yield 90/10 para `SocialImpactVault`.
- Criado adapter Polygon e rotas `/api/v1/stellar/status` e `/api/v1/blockchain/external-projects/lock-and-mint`, com persistência em `external_chain_projects` e idempotência por `source_tx_hash`.
- Criado smoke de provedores em `.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md` com build WASM real, CLI discovery e blockers exatos para deploy/invoke/status Soroban, Etherfuse e Polygon.

## Task Commits

1. **Task 1: Stellar/Soroban adapters** - `1820524` (feat)
2. **Task 2: Soroban lifecycle events** - `9608497` (feat)
3. **Task 3: Liquidity and treasury yield** - `3634ad2` (feat)
4. **Task 4: Polygon lock-and-mint routes** - `0996ffe` (feat)
5. **Task 5: Provider smoke evidence/blockers** - `ab47955` (docs)

## Files Created/Modified

- `backend_app/adapters/stellar.py` - sponsored reserves and Soroban operation adapter payloads.
- `backend_app/adapters/liquidity.py` - `ISinarcaLiquidity` protocol.
- `backend_app/adapters/etherfuse.py` - Etherfuse mock/sandbox adapter with fail-closed config.
- `backend_app/adapters/transfero.py` - future Transfero port adapter, active only in mock.
- `backend_app/adapters/polygon.py` - Polygon lock validation and wrapped mint request adapter.
- `backend_app/modules/treasury/service.py` - collateral confirmation, mint orchestration and 90/10 yield distribution.
- `backend_app/modules/treasury/routes.py` - admin `POST /treasury/harvest`.
- `backend_app/modules/blockchain/routes.py` - Stellar status and protected lock-and-mint route.
- `backend_app/api/router.py` - mounts blockchain and treasury routers.
- `soroban-contract/src/contract.rs` - emits lifecycle events.
- `tests/adapters/test_blockchain_financial_adapters.py` - adapter, fail-closed and route-mount coverage.
- `.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md` - provider smoke commands and blockers.
- `.gitignore` - ignores generated `soroban-contract/target/` output after cargo verification.

## Decisions Made

- Kept `backend_app` auth as canonical; protected routes use `require_role("certifier", "admin")` or `require_role("admin")`.
- Did not migrate to Supabase Auth; Supabase remains only Postgres for this phase.
- Did not fabricate Soroban contract id, deploy hash, invoke hash, Etherfuse response or Polygon RPC response.
- Used `wasm32v1-none` for Soroban SDK 26 WASM build because `wasm32-unknown-unknown` is rejected by the SDK with the current Rust compiler.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ignored generated Soroban build output**
- **Found during:** Task 2 and provider smoke verification.
- **Issue:** `cargo test` and `cargo build` generated or modified many files under `soroban-contract/target/`, including tracked build artifacts.
- **Fix:** added `soroban-contract/target/` to `.gitignore` and restored generated tracked target changes before committing.
- **Files modified:** `.gitignore`.
- **Verification:** `git status --short` clean after restoring target output.
- **Committed in:** `9608497`.

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Prevented generated build artifacts from being committed; no runtime behavior changed.

## Issues Encountered

- Optional Rust unit test for locked transfer was not added because `soroban-sdk::testutils` is gated and enabling it would require changing `Cargo.toml`, which was outside the allowed write scope. The existing contract still compiles via `cargo test`.
- `cargo test` passes but warns that `env.events().publish` is deprecated in favor of `#[contractevent]`; the plan acceptance criteria explicitly required `events().publish`, so the direct API was kept.
- Soroban provider smoke is blocked by missing source account/signing identity and missing deployed contract id.
- Etherfuse and Polygon provider smoke are blocked by missing sandbox/API/RPC configuration.

## Verification

| Command | Result |
|---|---|
| `uv run --with pytest pytest -q tests/adapters/test_blockchain_financial_adapters.py` | PASS - 11 passed. |
| `cargo test --manifest-path soroban-contract/Cargo.toml` | PASS - 0 tests; 4 deprecation warnings for `events().publish`. |
| `rg -n "BeginSponsoringFutureReserves\|ISinarcaLiquidity\|SocialImpactVault\|lock-and-mint" backend_app soroban-contract/src/contract.rs` | PASS - all required strings found. |
| `rg -n "Soroban testnet\|Etherfuse\|Polygon\|bloqueio\|BLOCKED\|Blocker" .planning/docs/providers/PHASE1-PROVIDER-SMOKE.md` | PASS - provider smoke document contains attempts and blockers. |
| `DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres' uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_auth.py tests/db/test_schema_contract.py` | PASS - 9 passed. |

## Provider Smoke Results

- Soroban CLI: `stellar 26.0.0` is installed and testnet is listed.
- Soroban build: local WASM build passed with `wasm32v1-none`; interface inspection passed.
- Soroban deploy/invoke/status: blocked because no local source identity, signing key, source account, RPC override or contract id is configured.
- Etherfuse: blocked because `ETHERFUSE_API_URL` and `ETHERFUSE_API_KEY` are unset.
- Polygon: blocked because `POLYGON_RPC_URL` and `POLYGON_VAULT_ADDRESS` are unset.

## Known Stubs

| Stub | File | Reason |
|---|---|---|
| `TransferoAdapter` raises `NotImplementedError` outside mock | `backend_app/adapters/transfero.py` | Intentional per plan: Transfero is prepared as a future portability port, not a live provider in Phase 1. |

## Authentication Gates

None. Missing provider credentials/accounts were handled as documented external blockers per the plan instruction, not as successful smoke evidence.

## User Setup Required

- Configure a funded Stellar testnet identity/source account and signing method for `stellar contract deploy`.
- Provide `SOROBAN_RPC_URL` or equivalent Stellar testnet RPC config if the named `testnet` network is not sufficient.
- Deploy the contract, then record `SOROBAN_CONTRACT_ID`, deploy hash, invoke hash and status/read output.
- Provide `ETHERFUSE_API_URL` and `ETHERFUSE_API_KEY` for sandbox smoke.
- Provide `POLYGON_RPC_URL`, `POLYGON_VAULT_ADDRESS` and a real source lock transaction hash for Polygon testnet validation.

## Next Phase Readiness

Plan 01-06 can proceed with Docker/Dokploy wiring and cutover work, but Phase 1 still has external provider smoke blockers. Soroban testnet deploy/invoke/status remains mandatory before declaring the full phase live-complete.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/01-backend-rebuild/01-05-SUMMARY.md`.
- Provider smoke document exists at `.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md`.
- Key created adapter and route files exist on disk.
- Task commits found: `1820524`, `9608497`, `3634ad2`, `0996ffe`, `ab47955`.

---
*Phase: 01-backend-rebuild*
*Completed: 2026-05-22*
