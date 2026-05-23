# Integrações Externas

**Data da análise:** 2026-05-22

## Frontend para backend

- **Cliente:** `src/services/api.ts`, usando `fetch` nativo.
- **Base URL:** `VITE_API_URL`, com padrão `/api/v1`.
- **Auth:** bearer token lido de `localStorage` (`sinarca_token`).
- **Proxy local:** `vite.config.ts` encaminha `/api` para `http://localhost:5680`.
- **Fachada de domínio:** `src/services/database.ts`.
- **Contrato:** chamadas de negócio passam por `apiGet`, `apiPost` ou `apiPatch`.

## API FastAPI ativa

- **Entrada:** `backend_app/main.py`.
- **Prefixo:** `/api/v1`.
- **Health:** `GET /health`.
- **Auth:** JWT com senha Argon2 e perfis persistidos.
- **Dados:** Postgres via SQLAlchemy async.

## Supabase

- **Status atual:** usado como Postgres local/produção via `DATABASE_URL`.
- **Decisão atual:** sem cliente Supabase no frontend e sem dependência de Supabase Auth nesta fase.
- **Uso alvo:** Postgres durável com migrations e seed idempotente.

## Banco de dados

- **PostgreSQL ativo:** `DATABASE_URL` é obrigatório para `backend_app`.
- **ORM ativo:** SQLAlchemy async em `backend_app/db/models.py`.
- **Seed:** `supabase/seed.sql` consolida dados de exemplo persistidos.
- **Ação alvo:** manter migrations versionadas e seed idempotente.

## Stellar e Soroban

- **Adapters atuais:** `backend_app/adapters/stellar.py`, `backend_app/adapters/polygon.py`, `backend_app/adapters/etherfuse.py`, `backend_app/adapters/transfero.py`.
- **Modo funcional:** local/sandbox quando credenciais externas não estão configuradas.
- **Configurações:** `STELLAR_NETWORK`, `STELLAR_HORIZON_URL`, chaves de issuer/distributor e `STELLAR_ASSET_CODE`.
- **Contrato Soroban:** `soroban-contract/src/contract.rs`, usando `soroban-sdk`.
- **Lacuna:** integração live ainda depende de chaves/RPCs reais.
- **Ação alvo:** criar adapter com portas explícitas para mint, unlock, transfer, burn e status.

## Storage de documentos

- **Ativo:** documentos de referência são persistidos em metadata/URI no banco.
- **Lacuna:** storage externo real ainda precisa política de bucket, hash, owner e retenção.
- **Ação alvo:** storage externo com validação de extensão, magic bytes, hash, tamanho, owner e retenção.

## Serviços externos do frontend

- Google Fonts e Material Symbols são carregados por `index.html`.
- UI Avatars é usado por `src/layouts/DashboardLayout.tsx`.
- Logos externos aparecem em dados de referência do frontend.

## Observabilidade

- Não há Sentry, OpenTelemetry, Datadog ou logger estruturado configurado.
- A reconstrução deve adicionar logs estruturados, request id e trilha de auditoria persistente.

## Deploy e CI/CD

- **Dockerfile raiz:** roda `backend_app.main:app` na porta 5680.
- **Dockerfile.api:** roda `backend_app.main:app` na porta 5680.
- **Dockerfile.frontend:** entrega o build Vite estático.
- **Compose local:** `docker-compose.yml` usa `backend_app` e espera Supabase/Postgres externo.
- **Dokploy:** `docker-compose.dokploy.yml` usa `backend_app` e deve receber `DATABASE_URL`, `JWT_SECRET_KEY` e `CORS_ORIGINS` reais.
- **CI:** não há workflows detectados em `.github/workflows/`.

## Variáveis relevantes

Frontend:

- `VITE_API_URL`
- `VITE_SESSION_TTL_MS`

Backend:

- `CORS_ORIGINS`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `APP_ENV`
- `STELLAR_*`
- `ETHERFUSE_*`
- `POLYGON_*`

## Webhooks e callbacks

Nenhum webhook inbound foi detectado. O caminho outbound real/parcial hoje é Stellar Horizon/Friendbot no adapter Python e S3 no helper legado.
