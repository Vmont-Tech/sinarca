# Plano de Implementacao: Reconstrucao da API em Python/FastAPI

**Objetivo:** reconstruir o backend em Python mantendo FastAPI, mas removendo a dependencia do MVP em memoria e da arquitetura SQLAlchemy parcialmente quebrada.

**Arquitetura:** nova API Python organizada por modulos, usando Supabase Postgres como fonte de dados, Alembic para migracoes, guards por papel e adapters isolados para Stellar/Etherfuse/Polygon.

## Fase 0: contrato e testes

**Arquivos:**

- Criar: `tests/contract/test_api_v1_contract.py`
- Criar: `tests/fixtures/sinarca_seed.json`
- Modificar: `pyproject.toml`
- Modificar: `src/pages/Dashboard/RetireCredits.tsx`

**Tarefas:**

- Congelar contrato atual de `backend/main.py`.
- Adicionar dependencias de teste: `pytest`, `httpx`, `pytest-asyncio`.
- Criar testes para auth, projects, audit, certifier, marketplace, compensate e transactions.
- Corrigir chamada hardcoded do frontend para usar `src/services/api.ts`.

**Saida esperada:** testes rodam contra a API Python atual e documentam o comportamento que a API nova precisa manter.

## Fase 1: novo esqueleto FastAPI

**Arquivos:**

- Criar: `backend_app/main.py`
- Criar: `backend_app/core/config.py`
- Criar: `backend_app/core/errors.py`
- Criar: `backend_app/core/security.py`
- Criar: `backend_app/core/logging.py`
- Criar: `backend_app/api/router.py`
- Criar: `backend_app/api/health.py`

**Tarefas:**

- Criar app FastAPI novo, sem importar `backend/main.py`.
- Configurar CORS por env.
- Criar tratamento padrao de erros com `detail`.
- Criar `GET /health`.
- Configurar logging estruturado.

**Saida esperada:** `uvicorn backend_app.main:app --port 5680` sobe API limpa com health.

## Fase 2: Supabase Postgres e migracoes

**Arquivos:**

- Criar: `supabase/config.toml`
- Criar: `supabase/migrations/202605220001_initial_schema.sql`
- Criar: `supabase/migrations/202605220002_rls_policies.sql`
- Criar: `supabase/seed.sql`
- Criar: `alembic.ini`
- Criar: `backend_app/db/session.py`
- Criar: `backend_app/db/models.py`

**Tarefas:**

- Usar Supabase local para desenvolvimento.
- Definir schema em SQL versionado e refletir modelos SQLAlchemy.
- Configurar Alembic para migracoes controladas.
- Criar seed local baseado em `backend/mock_data.py`.

**Saida esperada:** banco local recriado do zero com seed e API lendo projetos persistentes.

## Fase 3: auth e papeis

**Arquivos:**

- Criar: `backend_app/modules/auth/routes.py`
- Criar: `backend_app/modules/auth/service.py`
- Criar: `backend_app/modules/profiles/repository.py`
- Criar: `backend_app/core/roles.py`

**Tarefas:**

- Escolher uma das duas abordagens antes de implementar:
  - Supabase Auth como identidade canonica, API validando JWT.
  - Auth propria com Argon2/JWT, mantendo Supabase apenas como Postgres.
- Implementar `/api/v1/auth/login`, `/register`, `/me`, `PATCH /me`.
- Implementar `require_user` e `require_role`.

**Saida esperada:** frontend autentica e rotas sensiveis rejeitam anonimos.

## Fase 4: dominios operacionais

**Arquivos:**

- Criar: `backend_app/modules/projects/*`
- Criar: `backend_app/modules/certifier/*`
- Criar: `backend_app/modules/audit/*`
- Criar: `backend_app/modules/marketplace/*`
- Criar: `backend_app/modules/ledger/*`
- Criar: `backend_app/modules/retirements/*`

**Tarefas:**

- Portar endpoints preservando `/api/v1`.
- Persistir timeline, status e eventos.
- Implementar ledger unico/off-chain para compras.
- Implementar aposentadoria e certificado.
- Adicionar idempotencia em compra, aposentadoria e eventos blockchain.

**Saida esperada:** frontend usa a API nova sem depender de mock em memoria.

## Fase 5: adapters externos

**Arquivos:**

- Criar: `backend_app/adapters/stellar.py`
- Criar: `backend_app/adapters/liquidity.py`
- Criar: `backend_app/adapters/etherfuse.py`
- Criar: `backend_app/adapters/transfero.py`
- Criar: `backend_app/adapters/polygon.py`
- Criar: `backend_app/modules/treasury/service.py`

**Tarefas:**

- Definir portas para mint locked, sponsored reserve, unlock, burn, lock-and-mint e harvest.
- Implementar modo `mock` e `sandbox` antes de `live`.
- Registrar todos os efeitos externos em `chain_events` e `audit_events`.

**Saida esperada:** rotas nao importam SDKs externos diretamente.

## Fase 6: deploy Python no Dokploy

**Arquivos:**

- Criar/substituir: `Dockerfile.api`
- Criar/substituir: `Dockerfile.frontend`
- Criar: `docker-compose.dokploy.yml`
- Criar: `.planning/docs/deployment/DOKPLOY.md`
- Criar: `.env.example`

**Tarefas:**

- API image Python multi-stage com dependencias lockadas.
- Frontend image Vite + Nginx/Caddy.
- Compose Dokploy com `api` e `web`.
- Supabase fora do container em producao.
- Healthcheck da API em `/health`.

**Saida esperada:** commit na `main` aciona build/deploy dos dois servicos.

## Gates

```bash
npm ci
npm run lint
npm run build
uv run pytest -q
docker build -f Dockerfile.api .
docker build -f Dockerfile.frontend .
docker compose -f docker-compose.dokploy.yml config
```
