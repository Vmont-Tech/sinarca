---
phase: 01-backend-rebuild
plan: 01-04
subsystem: api
tags: [fastapi, sqlalchemy, postgres, marketplace, ledger, inventory, frontend-contract]

# Dependency graph
requires:
  - phase: 01-backend-rebuild
    provides: backend_app runtime, auth própria, Supabase Postgres schema and seed from 01-02/01-03
provides:
  - Persistent API v1 routes for projects, catalogs, certifier queue, audit queue, marketplace, transactions and inventory
  - ProjectMRCA DTO mapping from Supabase Postgres preserving frontend shapes
  - Certifier and auditor workflows with role guards, persisted decisions, audit events and credit lock/unlock
  - Monitoring anomaly service that blocks projects and suspends credits
  - Off-chain ledger purchase and retirement flow with persisted purchases, ledger entries, retirements and chain events
  - Secure inventory upload with auth, extension, size, magic-byte and SHA-256 validation
  - Frontend transactions and MRCA details consuming backend_app through src/services/database.ts
affects: [api-v1, backend_app-modules, frontend-data-facade, phase-01-backend-rebuild]

# Tech tracking
tech-stack:
  added: []
  patterns: [async SQLAlchemy service modules, typed frontend DTO facade, offchain ledger idempotency, secure upload validation]

key-files:
  created:
    - backend_app/modules/projects/routes.py
    - backend_app/modules/projects/service.py
    - backend_app/modules/projects/schemas.py
    - backend_app/modules/certifier/routes.py
    - backend_app/modules/audit/routes.py
    - backend_app/modules/monitoring/service.py
    - backend_app/modules/ledger/service.py
    - backend_app/modules/marketplace/routes.py
    - backend_app/modules/marketplace/service.py
    - backend_app/modules/retirements/service.py
    - backend_app/modules/inventory/routes.py
    - tests/contract/test_backend_app_api_v1.py
  modified:
    - backend_app/api/router.py
    - backend_app/db/models.py
    - backend_app/db/session.py
    - src/services/database.ts
    - src/pages/Dashboard/Transactions.tsx
    - src/pages/Dashboard/MrcaDetails.tsx

key-decisions:
  - "backend_app auth própria permaneceu canônica; Supabase foi usado apenas como Postgres local via DATABASE_URL."
  - "Compras de marketplace usam ledger off-chain e registram o modo OFFCHAIN_LEDGER_PURCHASE em chain_events.payload, sem exigir wallet externa do comprador."
  - "Declarações de inventário foram persistidas como documentos lógicos em documents, com audit_event, porque o schema 01-03 não criou tabela dedicada de declarações."
  - "Rotas mutáveis de certificadora, auditoria, compra, compensação e upload exigem bearer JWT e guards por papel."

patterns-established:
  - "Módulos backend_app expõem routers finos e concentram regras persistentes em services com AsyncSession."
  - "src/services/database.ts declara DTOs de resposta explícitos para preservar o contrato de frontend durante o cutover."
  - "Fluxos financeiros críticos recebem idempotency_key e escrevem ledger_entries antes de responder ao frontend."

requirements-completed: [DOC-PDF-3.1, DOC-PDF-3.2, DOC-PDF-3.4, DOC-PDF-3.5, DOC-PDF-3.6, DOC-PDF-3.7, CTX-D05, CTX-D07]

# Metrics
duration: 12min
completed: 2026-05-22
---

# Phase 01 Plan 01-04: Operational API v1 Modules Summary

**API v1 persistente para projetos, certificação, auditoria, marketplace, ledger off-chain, aposentadoria, inventário e transações com fachada frontend tipada.**

## Performance

- **Duration:** 12min
- **Started:** 2026-05-22T22:08:30Z
- **Completed:** 2026-05-22T22:20:46Z
- **Tasks:** 4
- **Files modified:** 26

## Accomplishments

- Criadas rotas persistentes `/api/v1/projects`, `/certifiers`, `/auditors`, `/companies`, `/certifier/queue`, `/audit/queue`, `/marketplace`, `/marketplace/buy`, `/marketplace/compensate`, `/transactions` e `/inventory`.
- Implementado mapeamento `ProjectMRCA` a partir do Postgres, com criação de projeto, quatro tags NFC opcionais validadas, baseline determinístico e catálogos persistidos.
- Implementados fluxos de certificadora e auditor com guards por papel, registros em `certifications`, `audits`, `audit_events` e mudanças de status canônicas.
- Implementado `MonitoringService.evaluate_anomaly` bloqueando projetos e suspendendo créditos quando cobertura vegetal ou NDVI caem além dos limites.
- Implementadas compra e compensação via ledger off-chain, persistindo `purchases`, `ledger_entries`, `retirements` e `chain_events`.
- Implementado inventário e upload seguro com limite, extensão, magic bytes, SHA-256, documento persistido e autenticação.
- Atualizado `src/services/database.ts` com DTOs explícitos e `Transactions.tsx`/`MrcaDetails.tsx` para consumir API, sem mocks como fonte de runtime dos fluxos atualizados.

## Task Commits

1. **Task 1: Projetos, tags, baseline e DTOs públicos** - `0ecddfa` (feat)
2. **Task 2: Certificação, auditoria, desbloqueio e anomalia** - `e7f7f00` (feat)
3. **Task 3: Marketplace, ledger off-chain, compra e aposentadoria** - `da038de` (feat)
4. **Task 4: Inventário e upload seguro de documentos** - `62c854e` (feat)

## Files Created/Modified

- `backend_app/modules/projects/*` - DTOs, queries, criação de projeto, baseline e catálogos.
- `backend_app/modules/certifier/routes.py` - fila e decisão de certificadora.
- `backend_app/modules/audit/routes.py` - fila e verificação de auditor.
- `backend_app/modules/monitoring/service.py` - bloqueio por anomalia ambiental.
- `backend_app/modules/ledger/service.py` - operações idempotentes de crédito, débito, reserva, liberação e aposentadoria.
- `backend_app/modules/marketplace/*` - marketplace, compra, compensação e transações.
- `backend_app/modules/retirements/service.py` - certificado lógico de aposentadoria.
- `backend_app/modules/inventory/routes.py` - inventário, declaração e upload seguro.
- `src/services/database.ts` - tipos `ProjectsResponse`, `ProjectResponse`, `MarketplaceResponse`, `QueueResponse`, `CatalogResponse`, `TransactionsResponse`.
- `src/pages/Dashboard/Transactions.tsx` - histórico via `/api/v1/transactions`.
- `src/pages/Dashboard/MrcaDetails.tsx` - detalhe via API persistente, sem fallback mock.
- `tests/contract/test_backend_app_api_v1.py` - contrato integrado da nova API.

## Decisions Made

- Mantida auth própria do `backend_app` como fonte canônica; os novos routers usam `require_user`/`require_role` e não Supabase Auth.
- Persistência de declaração de inventário usa `documents` como registro lógico auditável para evitar nova migration fora do plano.
- O evento de compra registra `OFFCHAIN_LEDGER_PURCHASE` em `chain_events.payload.mode`; o enum existente de `chain_events.event_type` permanece compatível com a migration 01-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrigida abertura de sessão SQLAlchemy async**
- **Found during:** Task 1
- **Issue:** `get_session()` usava `async_sessionmaker` como context manager direto e quebrava qualquer rota persistente.
- **Fix:** alterado para instanciar a sessão com `get_sessionmaker()()`.
- **Files modified:** `backend_app/db/session.py`
- **Verification:** `tests/contract/test_backend_app_api_v1.py -k "projects"` passou.
- **Committed in:** `0ecddfa`

**2. [Rule 3 - Blocking] Evitado compartilhamento de conexão asyncpg entre loops de TestClient**
- **Found during:** Task 1
- **Issue:** pool async reaproveitava conexão entre loops e gerava `Future attached to a different loop`.
- **Fix:** `create_async_engine` passou a usar `NullPool`.
- **Files modified:** `backend_app/db/session.py`
- **Verification:** suíte `test_backend_app_api_v1.py` passou com múltiplas requisições.
- **Committed in:** `0ecddfa`

**3. [Rule 3 - Blocking] Alinhados enums SQLAlchemy aos enums Postgres**
- **Found during:** Task 1
- **Issue:** inserts em colunas enum (`project_status`, `credit_status`, etc.) falhavam como `DatatypeMismatchError`.
- **Fix:** `backend_app/db/models.py` agora declara os enums nativos existentes sem recriar tipos.
- **Files modified:** `backend_app/db/models.py`
- **Verification:** criação de projeto, certificação, auditoria, ledger e chain events passaram nos testes.
- **Committed in:** `0ecddfa`

**4. [Rule 1 - Bug] Corrigida geração de friendly_id com colisão contra seed**
- **Found during:** Task 2
- **Issue:** contagem simples podia gerar `PRC-2026-010`, já existente no seed.
- **Fix:** geração agora incrementa até encontrar `friendly_id` livre.
- **Files modified:** `backend_app/modules/projects/service.py`
- **Verification:** testes de certificadora/auditoria criam múltiplos projetos sem colisão.
- **Committed in:** `e7f7f00`

**Total deviations:** 4 auto-fixed (3 blocking, 1 bug).
**Impact on plan:** Todos os ajustes foram necessários para operar contra Postgres real/local; não houve mudança de arquitetura canônica nem migração para Supabase Auth.

## Issues Encountered

- `npm run lint` passou com código 0, mas manteve warning preexistente em `src/pages/Dashboard/Feed.tsx` sobre dependência de hook. Fora do escopo da plan 01-04.
- `npm run build` passou com aviso de chunk maior que 500 kB. Fora do escopo da plan 01-04.

## Verification

| Command | Result |
|---|---|
| `DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres' uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py` | PASS - 5 passed. |
| `npm run lint` | PASS - exit 0; 1 existing warning in `Feed.tsx`. |
| `npm run build` | PASS - Vite build completed; chunk-size warning only. |
| `! rg -n "MOCK_TRANSACTIONS" src/pages/Dashboard/Transactions.tsx && rg -n "ProjectsResponse\|CatalogResponse\|TransactionsResponse" src/services/database.ts` | PASS - no runtime transaction mock; DTOs present. |
| `DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres' uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_auth.py tests/db/test_schema_contract.py tests/contract/test_api_v1_contract.py` | PASS - 24 passed. |

## Known Stubs

None. Stub scan found only UI placeholder text in a search input and optional empty defaults in request models; neither is a runtime data source stub.

## Authentication Gates

None.

## User Setup Required

None for this plan. Local verification used the already-running Supabase Postgres at `127.0.0.1:54322`.

## Next Phase Readiness

Plan 01-05 can implement adapters blockchain/financeiros on top of persisted marketplace, ledger, chain event and retirement records. The API now has the operational module surface expected by the frontend contract.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/01-backend-rebuild/01-04-SUMMARY.md`.
- Key created module files exist on disk.
- Task commits found: `0ecddfa`, `e7f7f00`, `da038de`, `62c854e`.

---
*Phase: 01-backend-rebuild*
*Completed: 2026-05-22*
