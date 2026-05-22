# Deploy Dokploy - Phase 1

Este guia descreve o deploy repetível da Phase 1 do SINARCA no Dokploy. O runtime de produção é `backend_app.main:app`; o backend legado permanece apenas como referência histórica de contrato e não deve ser usado por Docker, compose, scripts ou staging.

## Pré-requisitos

- Branch `main` como fonte do deploy.
- Supabase project criado e acessível.
- `DATABASE_URL` do Postgres Supabase com driver `postgresql+asyncpg`.
- Secrets configurados no Dokploy a partir de `.env.example`.
- Chaves/URLs de provedores sandbox/testnet quando houver smoke real: Stellar/Soroban, Etherfuse e Polygon.

## Serviços

`docker-compose.dokploy.yml` builda dois serviços do mesmo commit:

- `sinarca-api`: `Dockerfile.api`, FastAPI, `GET /health`, porta interna `5680`.
- `sinarca-web`: `Dockerfile.frontend`, build Vite estático servido por Nginx, porta interna `80`.

Supabase é Postgres externo. O compose não sobe Postgres local.

## Variáveis de Ambiente

Configure no Dokploy:

- `APP_ENV=production`
- `PUBLIC_WEB_URL=https://app.example.com`
- `CORS_ORIGINS=https://app.example.com`
- `DATABASE_URL=postgresql+asyncpg://user:password@host:5432/postgres`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET_KEY`
- `STELLAR_NETWORK=testnet`
- `STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org`
- `STELLAR_ISSUER_PUBLIC_KEY`
- `STELLAR_ISSUER_SECRET_KEY`
- `STELLAR_DISTRIBUTOR_PUBLIC_KEY`
- `STELLAR_DISTRIBUTOR_SECRET_KEY`
- `ETHERFUSE_API_URL`
- `ETHERFUSE_API_KEY`
- `TRANSFERO_API_URL`
- `TRANSFERO_API_KEY`
- `POLYGON_RPC_URL`
- `POLYGON_VAULT_ADDRESS`
- `VITE_API_URL`

Use valores reais somente no painel de secrets do Dokploy/Supabase. O repositório mantém apenas placeholders fictícios.

## Ordem de Deploy

1. Aplicar migrations no Supabase real:

   ```bash
   supabase db push
   ```

2. Buildar e subir a API `sinarca-api`.
3. Validar health da API:

   ```bash
   curl -fsS https://api.example.com/health
   ```

4. Validar login com auth própria contra Postgres real:

   ```bash
   curl -fsS -X POST https://api.example.com/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     --data '{"email":"usuario@example.com","password":"senha"}'
   ```

5. Buildar e subir a web `sinarca-web`.
6. Validar carregamento da web:

   ```bash
   curl -fsS https://app.example.com/
   ```

7. Confirmar que o frontend usa `VITE_API_URL` staging e consome `backend_app` para health, login, marketplace, inventário e transações.
8. Registrar evidência em `PHASE1-STAGING-SMOKE.md`.

## Smoke Externo

Com URLs reais configuradas:

```bash
curl -fsS https://api.example.com/health
curl -fsS https://app.example.com/
curl -fsS -X POST https://api.example.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"usuario@example.com","password":"senha"}'
```

Sem `STAGING_API_URL`, URL web staging, `DATABASE_URL` real ou secrets remotos, registre o bloqueio exato em `PHASE1-STAGING-SMOKE.md`. Não use URL local como evidência de staging.

## Rollback

- Rollback de app: selecionar o deploy anterior no Dokploy.
- Rollback de banco: criar migration compensatória revisada.
- Eventos financeiros, ledger off-chain, Etherfuse/Tesouro, Soroban ou lock-and-mint Polygon não devem ser revertidos diretamente; qualquer correção precisa gerar evento compensatório auditável.

## Cutover

- O cutover da Phase 1 aponta produção/staging somente para `backend_app.main:app`.
- `sinarca-web` deve ser build estático Nginx, não Vite dev server.
- `sinarca-api` e `sinarca-web` devem sair do mesmo commit para evitar contrato divergente.
