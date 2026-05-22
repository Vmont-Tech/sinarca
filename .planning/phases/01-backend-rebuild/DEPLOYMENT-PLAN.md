# Plano de Deploy: Frontend e Backend no mesmo gatilho

**Data:** 2026-05-22
**Plataforma:** Dokploy em VPS Linux
**Banco:** Supabase local/producao, fora dos containers de aplicacao

Este plano funciona para API Python ou Node. O runtime muda o `Dockerfile.api`, mas o desenho de deploy permanece igual.

## Decisao de deploy

Usar dois servicos Docker no mesmo repositorio e no mesmo gatilho da branch `main`:

- `sinarca-api`: API backend, health `GET /health`.
- `sinarca-web`: Vite build servido por Nginx/Caddy.

O gatilho pode ser configurado de duas formas:

1. **Compose Dokploy:** um `docker-compose.dokploy.yml` com dois services, ambos buildados do mesmo commit.
2. **Dois apps Dokploy:** dois apps separados apontando para o mesmo repo/branch `main`, cada um com seu Dockerfile e Auto Deploy ligado.

O compose reduz risco de frontend e backend rodarem SHAs diferentes.

## Estrutura alvo

```text
Dockerfile.api
Dockerfile.frontend
docker-compose.dokploy.yml
src/
supabase/
backend_app/    # se Python
server/         # se Node
```

## Dockerfile.api

Se Python:

- Base Python 3.12 ou 3.11 slim.
- Instalar dependencias por lockfile.
- Rodar `uvicorn backend_app.main:app --host 0.0.0.0 --port 5680`.
- Usuario nao-root quando possivel.
- Healthcheck `/health`.

Se Node:

- Base Node 24 LTS.
- Multi-stage com `npm ci`.
- Rodar app compilado.
- Usuario nao-root.
- Healthcheck `/health`.

## Dockerfile.frontend

- Build com Node LTS.
- Servir `dist/` com Nginx ou Caddy.
- SPA fallback para `index.html`.
- Configurar `VITE_API_URL` para o dominio da API ou rota interna definida.

## Variaveis de ambiente

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
- `VITE_SUPABASE_URL`, se frontend usar Supabase diretamente
- `VITE_SUPABASE_ANON_KEY`, se frontend usar Supabase diretamente

## Sequencia de deploy

1. Merge em `main`.
2. Dokploy recebe webhook/auto deploy.
3. Builda `api` e `web` do mesmo commit.
4. Executa migracoes Supabase antes de liberar API nova.
5. Sobe API e valida `/health`.
6. Sobe web e valida `/`.
7. Executa smoke externo:

```bash
curl -fsS https://api.<dominio>/health
curl -fsS https://app.<dominio>/
```

## Rollback

- Rollback de app: Dokploy volta para deploy anterior.
- Rollback de banco: migration compensatoria planejada.
- Operacoes financeiras/blockchain: idempotencia obrigatoria; nao depender de rollback de cadeia.
