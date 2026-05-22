# Plano de deploy: frontend e backend no mesmo gatilho

**Data:** 2026-05-22
**Plataforma:** Dokploy em VPS Linux
**Banco:** Supabase Postgres real/staging/produção, fora dos containers de aplicação

Este plano considera Python/FastAPI em `backend_app` como rota operacional atual. O backend legado `backend/main.py` não é fallback de deploy.

## Decisão de deploy

Usar dois serviços Docker no mesmo repositório e no mesmo gatilho da branch `main`:

- `sinarca-api`: API `backend_app`, health `GET /health`.
- `sinarca-web`: build Vite servido por Nginx ou Caddy.

O gatilho pode ser configurado de duas formas:

1. **Compose Dokploy:** `docker-compose.dokploy.yml` com dois services, ambos buildados do mesmo commit.
2. **Dois apps Dokploy:** dois apps separados apontando para o mesmo repo/branch `main`, cada um com seu Dockerfile e Auto Deploy ligado.

O compose reduz o risco de frontend e backend rodarem SHAs diferentes.

## Estrutura alvo

```text
Dockerfile.api
Dockerfile.frontend
docker-compose.dokploy.yml
src/
supabase/
backend_app/    # rota Python/FastAPI
server/         # somente se a alternativa Node for retomada
```

## Dockerfile.api

Se Python:

- Base Python 3.12 ou 3.11 slim.
- Instalar dependências por lockfile.
- Rodar `uvicorn backend_app.main:app --host 0.0.0.0 --port 5680`.
- Usar usuário não-root quando possível.
- Expor healthcheck `/health`.

Se Node:

- Base Node.js LTS.
- Multi-stage com `npm ci`.
- Rodar app compilado.
- Usar usuário não-root.
- Expor healthcheck `/health`.

## Dockerfile.frontend

- Build com Node.js LTS.
- Servir `dist/` com Nginx ou Caddy.
- SPA fallback para `index.html`.
- Configurar `VITE_API_URL` para o domínio da API ou rota interna definida.

## Variáveis de ambiente

API:

- `APP_ENV=production`
- `PORT`
- `PUBLIC_WEB_URL`
- `CORS_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `STELLAR_NETWORK`
- `STELLAR_HORIZON_URL`
- `STELLAR_ISSUER_PUBLIC_KEY`
- `STELLAR_ISSUER_SECRET_KEY`
- `STELLAR_DISTRIBUTOR_PUBLIC_KEY`
- `STELLAR_DISTRIBUTOR_SECRET_KEY`
- `ETHERFUSE_API_URL`
- `ETHERFUSE_API_KEY`
- `POLYGON_RPC_URL`
- `POLYGON_VAULT_ADDRESS`

Web:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`, se o frontend usar Supabase diretamente
- `VITE_SUPABASE_ANON_KEY`, se o frontend usar Supabase diretamente

## Sequência de deploy

1. Merge em `main`.
2. Dokploy recebe webhook/auto deploy.
3. Builda `api` e `web` do mesmo commit.
4. Executa `supabase db push` real antes de liberar API nova.
5. Sobe API e valida `/health`.
6. Valida login auth própria contra Postgres real.
7. Sobe web e valida `/`, confirmando consumo de `backend_app`.
8. Executa smoke externo:

```bash
curl -fsS https://api.example.com/health
curl -fsS https://app.example.com/
```

Sem API staging saudável em `/health` e frontend staging consumindo `backend_app`, a Phase 1 permanece bloqueada.

## Rollback

- Rollback de app: Dokploy volta para deploy anterior.
- Rollback de banco: migration compensatória planejada.
- Operações financeiras/blockchain: idempotência obrigatória; não depender de rollback de cadeia.
