---
phase: 01-backend-rebuild
plan: 01-06
subsystem: infra
tags: [dokploy, docker, fastapi, nginx, supabase, staging]

requires:
  - phase: 01-backend-rebuild
    provides: backend_app, Supabase schema/API, blockchain provider blockers
provides:
  - Docker API image for backend_app.main:app
  - Static Nginx web image for Vite dist
  - Dokploy compose with api+web and external Supabase Postgres
  - Operational deployment docs and staging smoke blocker evidence
affects: [deploy, staging, backend_app, frontend, qa]

tech-stack:
  added: [nginx, docker-compose-dokploy, pytest-dev-deps]
  patterns: [two-service Dokploy compose, backend_app-only runtime, external Supabase Postgres, explicit external blocker docs]

key-files:
  created:
    - docker-compose.dokploy.yml
    - .planning/docs/deployment/DOKPLOY.md
    - .planning/docs/deployment/PHASE1-STAGING-SMOKE.md
    - tests/conftest.py
  modified:
    - Dockerfile.api
    - Dockerfile.frontend
    - .dockerignore
    - .env.example
    - README.md
    - .planning/docs/BACKEND_INTEGRATION_SPEC.md
    - pyproject.toml
    - uv.lock
    - tests/test_gui_flows.py

key-decisions:
  - "Phase 1 deploy usa somente backend_app.main:app como runtime backend."
  - "Supabase permanece Postgres externo no Dokploy; nenhum serviço Postgres local foi adicionado ao compose."
  - "Staging sem URLs/secrets remotos foi registrado como bloqueio externo, sem evidência fabricada."

patterns-established:
  - "Compose Dokploy builda sinarca-api e sinarca-web do mesmo commit."
  - "Dockerfile.frontend serve dist/ via Nginx com fallback SPA."
  - "Gates pytest usam Supabase local padrão apenas quando DATABASE_URL não está definido."

requirements-completed:
  - DOC-BACKEND-INTEGRATION
  - DOC-PDF-7
  - CTX-D10
  - CODEBASE-CONCERNS-DEPLOY

duration: 13min
completed: 2026-05-22
---

# Phase 01 Plan 06: Deploy Dokploy e Cutover Summary

**Cutover Dokploy com API `backend_app.main:app`, web Nginx estática, Supabase Postgres externo e staging bloqueado explicitamente por ausência de credenciais remotas.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-22T22:39:47Z
- **Completed:** 2026-05-22T22:52:24Z
- **Tasks:** 5
- **Files modified:** 14

## Accomplishments

- `Dockerfile.api` agora instala a API com `uv`, roda usuário não-root, expõe healthcheck e inicia `backend_app.main:app`.
- `Dockerfile.frontend` agora builda com Node 20 Alpine e serve `dist/` via Nginx com fallback SPA.
- `docker-compose.dokploy.yml` define `sinarca-api` e `sinarca-web`, sem serviço Postgres local e sem fallback para backend legado.
- `.env.example`, README, spec de integração e docs Dokploy refletem Supabase como Postgres externo, auth própria, ledger off-chain, Etherfuse/Tesouro, `TransferoAdapter` futuro e lock-and-mint.
- `PHASE1-STAGING-SMOKE.md` registra o bloqueio externo de staging com variáveis ausentes e comandos não executados.

## Task Commits

1. **T1: Atualizar Dockerfiles para API backend_app e web estático** - `f95f03f` (feat)
2. **T2: Criar compose Dokploy e contrato de ambiente** - `2aa6750` (feat)
3. **T3: Atualizar documentação operacional e integração backend** - `bc38b89` (docs)
4. **T4: Executar gates finais e registrar cutover** - `cbc4a2d` (fix)
5. **T5: Validar staging Dokploy e frontend consumindo backend_app** - `838c537` (docs)

## Files Created/Modified

- `Dockerfile.api` - Imagem Python/FastAPI para `backend_app.main:app`.
- `Dockerfile.frontend` - Build Vite multi-stage e runtime Nginx.
- `docker-compose.dokploy.yml` - Compose Dokploy com API+web e Supabase externo.
- `.dockerignore` - Exclui caches, `dist`, `.venv`, artefatos Soroban e `.env` real.
- `.env.example` - Contrato de ambiente com placeholders fictícios.
- `README.md` - Execução local, gates e deploy Dokploy.
- `.planning/docs/deployment/DOKPLOY.md` - Guia operacional de deploy, smoke e rollback.
- `.planning/docs/BACKEND_INTEGRATION_SPEC.md` - Spec atualizada para backend_app, auth própria, ledger e adapters.
- `pyproject.toml` / `uv.lock` - Dependências dev necessárias para `uv run pytest -q`.
- `tests/conftest.py` - Default de `DATABASE_URL` para Supabase local quando ausente.
- `tests/test_gui_flows.py` - Import lazy de Playwright para não bloquear coleta pytest.
- `.planning/docs/deployment/PHASE1-STAGING-SMOKE.md` - Evidência de bloqueio externo de staging.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS, exit 0. Mantém 1 warning preexistente em `src/pages/Dashboard/Feed.tsx` sobre dependência de `useEffect`. |
| `npm run build` | PASS, exit 0. Vite build concluído; aviso de chunk > 500 kB permanece. |
| `uv run pytest -q` | PASS, exit 0. `48 passed in 9.11s`. |
| `docker build -f Dockerfile.api .` | PASS, exit 0. Contexto final reduzido para ~247 kB. |
| `docker build -f Dockerfile.frontend .` | PASS, exit 0. Build Nginx/static concluído. |
| `docker compose -f docker-compose.dokploy.yml config` | PASS, exit 0. |
| `curl -fsS "$STAGING_API_URL/health"` | BLOCKED_EXTERNAL: `STAGING_API_URL=UNSET`. Ver `PHASE1-STAGING-SMOKE.md`. |

## Decisions Made

- Mantido `backend_app.main:app` como único runtime de API para Phase 1.
- Mantido Supabase como Postgres externo; compose Dokploy não sobe Postgres local.
- Mantida auth própria Argon2/JWT como canônica; docs não migram para Supabase Auth.
- Staging não recebeu sucesso simulado; bloqueio externo foi documentado com variáveis e comandos.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Declaradas dependências de teste ausentes**
- **Found during:** Task 4 (gates finais)
- **Issue:** `uv run pytest -q` falhava com `Failed to spawn: pytest`.
- **Fix:** Adicionado grupo dev com `pytest` e `httpx` em `pyproject.toml` e `uv.lock`.
- **Files modified:** `pyproject.toml`, `uv.lock`
- **Verification:** `uv run pytest -q` passou com 48 testes.
- **Committed in:** `cbc4a2d`

**2. [Rule 3 - Blocking] Evitado import global de Playwright durante coleta pytest**
- **Found during:** Task 4 (gates finais)
- **Issue:** `tests/test_gui_flows.py` importava Playwright globalmente e quebrava a coleta, embora seja script manual sem testes pytest.
- **Fix:** Import movido para dentro de `run_gui_tests()`.
- **Files modified:** `tests/test_gui_flows.py`
- **Verification:** `uv run pytest -q` passou com 48 testes.
- **Committed in:** `cbc4a2d`

**3. [Rule 3 - Blocking] Configurado DATABASE_URL padrão para testes locais**
- **Found during:** Task 4 (gates finais)
- **Issue:** Testes persistentes do `backend_app` falhavam sem `DATABASE_URL`.
- **Fix:** Criado `tests/conftest.py` para usar Supabase local padrão quando `DATABASE_URL` não estiver definido.
- **Files modified:** `tests/conftest.py`
- **Verification:** `uv run pytest -q` passou com 48 testes.
- **Committed in:** `cbc4a2d`

---

**Total deviations:** 3 auto-fixed (3 blocking).  
**Impact on plan:** Correções limitadas à reprodutibilidade dos gates finais; não alteram runtime de produção nem o contrato Dokploy.

## Issues Encountered

- O primeiro `docker build -f Dockerfile.api .` falhou por helper Docker ausente: `docker-credential-desktop` não estava no PATH. Reexecutado com `DOCKER_CONFIG` temporário e depois com `.dockerignore` corrigido; builds finais passaram com exit 0.
- O primeiro build frontend transferiu ~3.9 GB de contexto antes da atualização de `.dockerignore`; o contexto final caiu para MB/KB nos builds finais.
- Staging real segue bloqueado por ausência de `STAGING_API_URL`, `STAGING_WEB_URL`, credenciais Dokploy e credenciais Supabase remotas.

## Authentication Gates

None. Não houve CLI autenticável acionada; staging foi classificado como bloqueio externo por ausência de URLs/secrets no ambiente.

## Known Stubs

- `.env.example` contém valores fictícios e placeholders de secrets por exigência do plano. Não são dados runtime reais.
- README e DOKPLOY.md mencionam placeholders fictícios apenas como orientação de configuração.

## Next Phase Readiness

Localmente, Phase 1 tem build, testes, Dockerfiles e compose Dokploy validados. A prontidão de staging permanece bloqueada até o usuário/provedor fornecer:

- `STAGING_API_URL`
- `STAGING_WEB_URL`
- `DOKPLOY_API_URL`
- `DOKPLOY_API_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` ou `SUPABASE_DB_URL`
- Credenciais de login staging para auth própria

## Self-Check: PASSED

- Arquivos principais criados/modificados existem no disco.
- Commits `f95f03f`, `2aa6750`, `bc38b89`, `cbc4a2d` e `838c537` existem no histórico.
- SUMMARY contém verificação, bloqueio externo de staging e decisões de cutover.

---
*Phase: 01-backend-rebuild*
*Completed: 2026-05-22*
