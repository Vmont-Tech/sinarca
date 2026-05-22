---
phase: 01-backend-rebuild
plan: 01-02
subsystem: auth
tags: [fastapi, jwt, argon2, pydantic-settings, roles, pytest]

# Dependency graph
requires:
  - phase: 01-backend-rebuild
    provides: legacy API contract frozen by 01-01
provides:
  - backend_app FastAPI runtime with health endpoint and API router
  - production-aware Settings with CORS and secret validation
  - Argon2/JWT auth module with frontend-compatible auth responses
  - role guard dependency and in-memory profile repository for contract tests
affects: [backend_app, auth, api-v1, phase-01-backend-rebuild]

# Tech tracking
tech-stack:
  added: [pydantic-settings, sqlalchemy-asyncio, asyncpg, alembic, PyJWT, pwdlib-argon2]
  patterns: [create_app bootstrap, cached settings, ApiError handlers, JWT require_user, require_role guards]

key-files:
  created:
    - backend_app/__init__.py
    - backend_app/api/__init__.py
    - backend_app/api/health.py
    - backend_app/api/router.py
    - backend_app/core/__init__.py
    - backend_app/core/config.py
    - backend_app/core/errors.py
    - backend_app/core/logging.py
    - backend_app/core/roles.py
    - backend_app/core/security.py
    - backend_app/main.py
    - backend_app/modules/auth/__init__.py
    - backend_app/modules/auth/routes.py
    - backend_app/modules/auth/schemas.py
    - backend_app/modules/auth/service.py
    - backend_app/modules/profiles/__init__.py
    - backend_app/modules/profiles/repository.py
    - tests/contract/test_backend_app_auth.py
  modified:
    - pyproject.toml
    - uv.lock

key-decisions:
  - "Auth própria em backend_app usa Argon2 para senhas e JWT com sub, role, exp e type."
  - "Supabase permanece apenas como Postgres futuro; a identidade canônica desta entrega não usa Supabase Auth."
  - "O repositório de perfis em memória é intencional e temporário até a Plan 01-03 substituir por Postgres."

patterns-established:
  - "Configuração produtiva falha rápido quando JWT_SECRET_KEY, DATABASE_URL ou CORS_ORIGINS estão ausentes/inseguros."
  - "Respostas de login/register preservam token, access_token, refresh_token, expires_at, expires_in_seconds e user para o AuthContext."
  - "Guards de papel usam require_user e require_role sem depender de claims Supabase."

requirements-completed: [DOC-PDF-3.1, DOC-PDF-3.2, DOC-BIBLE-RF1, CTX-D01, CTX-D04, CTX-D08]

# Metrics
duration: 6min
completed: 2026-05-22
---

# Phase 01 Plan 01-02: Backend App Auth Summary

**FastAPI backend_app com Settings produtivo, health, auth própria Argon2/JWT e guards por papel compatíveis com o frontend.**

## Performance

- **Duration:** 6min
- **Started:** 2026-05-22T21:27:42Z
- **Completed:** 2026-05-22T21:33:47Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Criado `backend_app.main:app` com `create_app()`, CORS por settings, handlers de erro e `/health` fora de `/api/v1`.
- Adicionada configuração com `pydantic-settings` e validação de produção para `JWT_SECRET_KEY`, `DATABASE_URL` e `CORS_ORIGINS`.
- Implementada auth própria com Argon2, JWT access/refresh, `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/me` e `PATCH /api/v1/auth/me`.
- Adicionados `require_user` e `require_role`, bloqueio de cadastro público `admin` e testes de contrato para o novo módulo.

## Task Commits

1. **Task 1: Adicionar dependências e pacote `backend_app`** - `7dcac47` (chore)
2. **Task 2: Criar bootstrap FastAPI, Settings, CORS e erros** - `ca217b2` (feat)
3. **Task 3: Implementar auth JWT própria, roles e contrato compatível com frontend** - `fc9c103` (feat)

**Plan metadata:** recorded in the final docs commit for this plan.

## Files Created/Modified

- `pyproject.toml` - adiciona dependências do backend_app e inclui `backend_app*` no pacote.
- `uv.lock` - lockfile atualizado pelo `uv run` após mudança de dependências.
- `backend_app/main.py` - bootstrap FastAPI canônico da reconstrução.
- `backend_app/core/config.py` - settings, defaults de desenvolvimento e validação de produção.
- `backend_app/core/errors.py` - `ApiError`, handlers HTTP e handler genérico.
- `backend_app/core/logging.py` - configuração básica de logging.
- `backend_app/core/security.py` - hash Argon2, JWT access/refresh, decode e `require_user`.
- `backend_app/core/roles.py` - papéis, bloqueio de roles públicas inválidas e `require_role`.
- `backend_app/api/health.py` - rota `/health` com versão `0.3.0-backend-app`.
- `backend_app/api/router.py` - router `/api/v1` com módulo de auth montado.
- `backend_app/modules/auth/*` - schemas, serviço e rotas de autenticação.
- `backend_app/modules/profiles/repository.py` - repositório em memória com usuários demo para testes.
- `tests/contract/test_backend_app_auth.py` - contrato do novo auth, senha hash, JWT e role guard.

## Decisions Made

- Mantida auth própria no `backend_app`; nenhuma integração com Supabase Auth foi adicionada.
- Mantido repositório em memória apenas como ponte de testes desta plan, com substituição prevista pela Plan 01-03.
- Atualizado `uv.lock` junto da mudança de dependências para manter execução reprodutível.

## Verification Commands

| Command | Result |
|---|---|
| `uv pip install --system . --dry-run` | Blocked by environment: Homebrew Python is externally managed under PEP 668, even for dry-run with `--system`. |
| `uv run python -c "from backend_app.main import app; print(app.title)"` | PASS - printed `Sinarca API`. |
| `APP_ENV=production uv run python -c "from backend_app.core.config import Settings; Settings()"` | PASS - failed closed with missing `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`. |
| `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_auth.py` | PASS - 5 passed. |
| `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` | PASS - 15 passed. |
| `npm run lint` | PASS - 0 errors, 1 existing warning in `src/pages/Dashboard/Feed.tsx` about `loadMRCAs` dependency. |
| `npm run build` | PASS - Vite build succeeded with existing chunk-size warning. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Required explicit CORS configuration in production**
- **Found during:** Task 2 (Criar bootstrap FastAPI, Settings, CORS e erros)
- **Issue:** A primeira versão de `Settings` usava origens locais como default também em produção, o que permitia `APP_ENV=production` sem `CORS_ORIGINS`.
- **Fix:** `cors_origins` agora inicia vazio, recebe defaults locais só fora de produção e falha em produção sem `CORS_ORIGINS`.
- **Files modified:** `backend_app/core/config.py`
- **Verification:** `APP_ENV=production uv run python -c "from backend_app.core.config import Settings; Settings()"` falha com `CORS_ORIGINS` listado.
- **Committed in:** `ca217b2`

**2. [Rule 2 - Security Hardening] Increased development JWT key length**
- **Found during:** Task 3 (Implementar auth JWT própria, roles e contrato compatível com frontend)
- **Issue:** PyJWT avisou que o segredo default de desenvolvimento era menor que o recomendado para HS256.
- **Fix:** O default de desenvolvimento foi ampliado e preserva prefixo `dev-`, mantendo a validação de produção bloqueante.
- **Files modified:** `backend_app/core/config.py`
- **Verification:** `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_auth.py` passou sem warnings de chave curta.
- **Committed in:** `fc9c103`

---

**Total deviations:** 2 auto-fixed (2 missing-critical/security hardening).
**Impact on plan:** Ambos os ajustes reforçam requisitos de segurança do próprio plano, sem ampliar escopo funcional.

## Known Stubs

| Stub | File | Reason |
|---|---|---|
| In-memory profile repository | `backend_app/modules/profiles/repository.py` | Stub intencional do plano 01-02 para testes; Plan 01-03 substituirá por Supabase Postgres. |

## Issues Encountered

- `uv pip install --system . --dry-run` não executou por política PEP 668 do Python Homebrew externamente gerenciado. O comando exato retornou: `The interpreter ... is externally managed`; sem credenciais ou dependências faltantes envolvidas.
- `npm run lint` passou com warning preexistente em `src/pages/Dashboard/Feed.tsx:36` (`react-hooks/exhaustive-deps`).
- `npm run build` passou com warning preexistente de chunk maior que 500 kB.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Plan 01-03 pode substituir o repositório em memória por Supabase Postgres sem alterar o contrato de auth público. O runtime canônico `backend_app.main:app` já importa, expõe `/health` e monta `/api/v1/auth/*`.

## Authentication Gates

None.

## Threat Flags

None - auth, JWT, role guards and production settings were covered by the plan threat model.

## Self-Check: PASSED

- Key created files exist on disk.
- Task commits found in git history: `7dcac47`, `ca217b2`, `fc9c103`.
- No accidental tracked file deletions detected in task commits.

---
*Phase: 01-backend-rebuild*
*Completed: 2026-05-22*
