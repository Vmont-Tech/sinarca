---
phase: 01-backend-rebuild
plan: 01-03
subsystem: database
tags: [supabase, postgres, rls, seed, sqlalchemy, alembic, pytest]

# Dependency graph
requires:
  - phase: 01-backend-rebuild
    provides: backend_app FastAPI runtime and auth from 01-02
provides:
  - Supabase/Postgres operational schema with ledger, treasury, yield and external chain tables
  - RLS policy baseline that keeps Supabase as Postgres only and leaves role authorization in backend_app
  - Idempotent seed consolidated from backend mocks and frontend mock data
  - Async SQLAlchemy session, models and repository helpers
  - Local Supabase Docker stack seeded for development validation
affects: [supabase, backend_app-db, seed-data, api-v1, phase-01-backend-rebuild]

# Tech tracking
tech-stack:
  added: [supabase-cli-local, postgresql, sqlalchemy-asyncio, alembic]
  patterns: [idempotent seed, RLS public-read sensitive-write-lockdown, async repository helpers]

key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/202605220001_initial_schema.sql
    - supabase/migrations/202605220002_rls_policies.sql
    - supabase/seed.sql
    - alembic.ini
    - backend_app/db/__init__.py
    - backend_app/db/env.py
    - backend_app/db/models.py
    - backend_app/db/repositories.py
    - backend_app/db/script.py.mako
    - backend_app/db/session.py
    - tests/db/test_schema_contract.py
  modified:
    - backend_app/modules/profiles/repository.py
    - .gitignore

key-decisions:
  - "Supabase local foi iniciado via Docker com `npx supabase start`, usando DB local em `127.0.0.1:54322`."
  - "O seed inicial cobre os mocks do backend e do frontend para mapas, feed/detalhes, rankings, perfis, inventario, transacoes e filas de auditoria/certificacao."
  - "RLS nao usa Supabase Auth, `auth.uid()` ou claims como identidade canonica; writes sensiveis ficam para backend/service role."
  - "O repositório de perfis agora pode usar AsyncSession quando DATABASE_URL existir e mantém fallback em memória somente fora de produção."

patterns-established:
  - "Migrations SQL versionadas ficam em `supabase/migrations/` e seed idempotente em `supabase/seed.sql`."
  - "Modelos SQLAlchemy mínimos espelham o contrato operacional das migrations."
  - "Artefatos locais do Supabase CLI (`supabase/.temp/`, `supabase/.branches/`) ficam fora do Git."

requirements-completed: [DOC-PDF-3.1, DOC-PDF-3.3, DOCX-LEDGER-OFFCHAIN, DOCX-YIELD-SOCIAL, DOCX-LOCK-AND-MINT, CTX-D02]

# Metrics
duration: 24min
completed: 2026-05-22
---

# Phase 01 Plan 01-03: Supabase Schema, Seed and Data Layer Summary

**Supabase Postgres local foi iniciado em Docker, as migrations foram aplicadas e o seed inicial consolidado entrou no banco local.**

## Performance

- **Duration:** 24min
- **Completed:** 2026-05-22T22:00:08Z
- **Tasks:** 4
- **Files modified:** 14

## Accomplishments

- Criado schema operacional com tabelas para perfis, organizações, projetos, tags NFC, baseline, certificações, auditorias, créditos, contas ledger, lançamentos, compras, aposentadorias, tesouraria, yield, eventos de cadeia, lock-and-mint externo, documentos, auditoria e idempotência.
- Criada política RLS mínima com leitura pública apenas para dados visíveis e sem dependência de Supabase Auth.
- Criado seed idempotente com usuários demo, projetos de `backend/mock_data.py`, dados de `src/data/mrca_db.ts`, transações do frontend e filas iniciais de auditoria/certificação.
- Implementada camada SQLAlchemy async em `backend_app/db/` e atualização do repositório de perfis para usar `AsyncSession` quando disponível.
- Subido Supabase local oficial via Docker com `npx supabase start`; o comando aplicou migrations e seed.
- Executado `npx -y supabase db reset` local para provar reexecução do schema e seed do zero.

## Task Commits

1. **Task 1: Criar migrations Supabase com entidades operacionais completas** - `a5172dd` (feat)
2. **Task 2: Criar RLS mínima e seed idempotente** - `54675cb` (feat)
3. **Task 3: Implementar sessão SQLAlchemy async e repositories base** - `b41d331` (feat)
4. **Task 4: Cobertura de contrato do schema** - `9c02239` (test)

**Plan metadata and local Supabase gate:** recorded in the final docs commit for this plan.

## Local Supabase State

- Studio: `http://127.0.0.1:54323`
- API: `http://127.0.0.1:54321`
- Database URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Async app URL: `postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres`

Seed validation after reset:

| Table | Count |
|---|---:|
| organizations | 12 |
| profiles | 5 |
| projects | 7 |
| environmental_credits | 5 |
| ledger_entries | 5 |
| purchases | 1 |
| retirements | 2 |

## Commands Run

| Command | Result |
|---|---|
| `npx -y supabase start` | PASS - local Docker stack started and applied migrations/seed. |
| `npx -y supabase db reset` | PASS - recreated local DB, applied both migrations and seeded `supabase/seed.sql`. |
| `docker exec supabase_db_sinarca-local psql -U postgres -d postgres -c "...counts..."` | PASS - seed counts confirmed. |
| `DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres' uv run python -c "from backend_app.db.models import Project, LedgerEntry, TreasuryPosition; print(...)"` | PASS - printed `projects ledger_entries treasury_positions`. |
| `DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres' uv run python ... select count(*) from projects` | PASS - returned `7`. |
| `uv run --with pytest --with httpx pytest -q tests/db/test_schema_contract.py tests/contract/test_backend_app_auth.py tests/contract/test_api_v1_contract.py` | PASS - 24 passed. |
| `rg -n "create table ledger_entries\|create table treasury_positions\|create table external_chain_projects\|enable row level security\|service role\|on conflict" ...` | PASS - required schema, RLS and seed patterns found. |

## Deviations from Plan

### User-directed Local Gate

- **Original plan gate:** `supabase db push` real.
- **User direction during execution:** subir um Supabase local em Docker e fazer o seed inicial aqui.
- **Execution:** used `npx supabase start` and `npx supabase db reset` against the local Docker stack. This satisfies local development validation and seed bootstrap, but remote/project-linked `supabase db push` remains a production/staging gate for later deployment.

### Existing Local Port Conflict

- `54321`/`54322` were occupied by an older SINARCA local stack: `sinarca-supabase-api`, `sinarca-supabase-rest`, `sinarca-supabase-db`.
- Those three SINARCA containers were stopped to free the configured Supabase CLI ports.
- Other local containers, including `quantumcert-postgres`, were not touched.

## Known Stubs

| Stub | File | Reason |
|---|---|---|
| Some operational modules still need API services | `backend_app/modules/**` | Planned for 01-04; 01-03 only creates data layer and seed. |
| Remote Supabase push | external Supabase project | Deferred because user requested local Docker seed now; remote push belongs to production/staging deployment gate. |

## Issues Encountered

- Initial `supabase start` failed because port `54322` was already allocated by the old SINARCA Docker stack.
- Docker printed `docker-credential-desktop` credential helper warnings, but image pulls and container startup completed successfully.

## User Setup Required

- Keep Docker Desktop running.
- Use `npx -y supabase status` to inspect local endpoints.
- Use `npx -y supabase stop` when the local stack is no longer needed.

## Next Phase Readiness

Plan 01-04 can now implement persistent API modules against `backend_app/db` and the seeded local Supabase Postgres. Frontend data-dependent flows have seed coverage available for maps, feed/details, rankings, profiles, inventory, transactions, auditor queue and certifier queue.

## Authentication Gates

None. Supabase Auth remains non-canonical for this phase.

## Threat Flags

Remote Supabase push is still a deployment/staging gate. Local schema/seed is validated, but production parity requires linked Supabase credentials and environment-specific verification.

## Self-Check: PASSED

- Local Supabase Docker stack is running.
- Migrations and seed replay cleanly via `npx -y supabase db reset`.
- SQLAlchemy can connect to local DB with asyncpg.
- Regression tests for schema, backend_app auth and legacy API contract passed.

---
*Phase: 01-backend-rebuild*
*Completed: 2026-05-22*
