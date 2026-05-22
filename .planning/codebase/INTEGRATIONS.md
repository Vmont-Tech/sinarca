# Integrações Externas

**Data da análise:** 2026-05-22

## Frontend para backend

- **Cliente:** `src/services/api.ts`, usando `fetch` nativo.
- **Base URL:** `VITE_API_URL`, com padrão `/api/v1`.
- **Auth:** bearer token lido de `localStorage` (`sinarca_token`).
- **Proxy local:** `vite.config.ts` encaminha `/api` para `http://localhost:5680`.
- **Fachada de domínio:** `src/services/database.ts`.
- **Ponto frágil:** `src/pages/Dashboard/RetireCredits.tsx` bypassa o helper e chama `http://127.0.0.1:5680` diretamente.

## API FastAPI ativa

- **Entrada:** `backend/main.py`.
- **Prefixo:** `API_PREFIX = "/api/v1"`.
- **Health:** `GET /health`.
- **Auth:** token opaco em `ACTIVE_SESSIONS`, sem persistência.
- **Dados:** `backend/mock_data.py`.
- **SPA fallback:** `FRONTEND_DIST_DIR` permite servir `dist/` pela API.

## Supabase

- **Status atual:** não integrado ao runtime.
- **Ausências detectadas:** sem `@supabase/supabase-js`, sem cliente Supabase Python e sem referências de código a Supabase.
- **Uso alvo:** Postgres local/produção, RLS, service role somente no backend e opção de Supabase Auth/JWT.
- **Atenção:** o uso de Supabase deve ser implementado como integração nova, não como pressuposto existente.

## Banco de dados

- **PostgreSQL planejado:** `DATABASE_URL` existe em `backend/core/database.py`, `Dockerfile` e `docker-compose.yml`.
- **ORM legado:** SQLAlchemy em `backend/models/*`, não usado por `backend/main.py`.
- **Extensão:** `backend/core/database.py` tenta criar `vector`, mas o deploy atual não garante pgvector.
- **Ação alvo:** migrations versionadas, Supabase CLI local, Alembic e seed idempotente.

## Stellar e Soroban

- **Adapter atual:** `backend/services/stellar_service.py`.
- **Modo funcional:** mock/local quando `STELLAR_ENABLED=false`.
- **Configurações:** `STELLAR_NETWORK`, `STELLAR_HORIZON_URL`, chaves de issuer/distributor e `STELLAR_ASSET_CODE`.
- **Contrato Soroban:** `soroban-contract/src/contract.rs`, usando `soroban-sdk`.
- **Lacuna:** `backend/main.py` não chama o contrato Soroban real.
- **Ação alvo:** criar adapter com portas explícitas para mint, unlock, transfer, burn e status.

## Storage de documentos

- **Ativo:** upload em `backend/main.py` lê arquivo e retorna metadados; não há persistência real.
- **Legado:** `backend/services/s3_services.py` aponta para `boto3`, `cryptography` e um `settings` ausente.
- **Ação alvo:** storage externo com validação de extensão, magic bytes, hash, tamanho, owner e retenção.

## Serviços externos do frontend

- Google Fonts e Material Symbols são carregados por `index.html`.
- UI Avatars é usado por `src/layouts/DashboardLayout.tsx`.
- Logos externos aparecem em dados de referência do frontend.

## Observabilidade

- Não há Sentry, OpenTelemetry, Datadog ou logger estruturado configurado.
- A reconstrução deve adicionar logs estruturados, request id e trilha de auditoria persistente.

## Deploy e CI/CD

- **Dockerfile combinado:** constrói Vite, instala Python e roda FastAPI na porta 80.
- **Dockerfile.api:** roda `uvicorn backend.main:app` na porta 5680.
- **Dockerfile.frontend:** usa Vite dev server; precisa virar runtime estático de produção.
- **Compose:** `docker-compose.yml` está inválido para uso confiável.
- **Dokploy:** não há arquivo específico; o plano alvo é `docker-compose.dokploy.yml` ou dois apps no mesmo repo/branch `main`.
- **CI:** não há workflows detectados em `.github/workflows/`.

## Variáveis relevantes

Frontend:

- `VITE_API_URL`
- `VITE_SESSION_TTL_MS`
- `VITE_ALLOW_LOCAL_AUTH_FALLBACK`

Backend atual:

- `CORS_ORIGINS`
- `SESSION_TTL_HOURS`
- `ALLOW_DEMO_AUTH_FALLBACK`
- `MERCHANT_TRANSACTION_FEE_RATE`
- `ISSUER_FUND_YIELD_RATE`
- `MAX_UPLOAD_BYTES`
- `FRONTEND_DIST_DIR`

Backend alvo:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `STELLAR_*`
- `ETHERFUSE_*`
- `POLYGON_*`

## Webhooks e callbacks

Nenhum webhook inbound foi detectado. O caminho outbound real/parcial hoje é Stellar Horizon/Friendbot no adapter Python e S3 no helper legado.
