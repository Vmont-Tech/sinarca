# SINARCA

Plataforma de créditos ambientais com frontend React/Vite e backend FastAPI canônico em `backend_app`. A Phase 1 usa Supabase somente como Postgres externo, auth própria com Argon2/JWT, ledger off-chain para compras e adapters para Stellar/Soroban, Etherfuse/Tesouro, TransferoAdapter futuro e lock-and-mint Polygon.

## Arquitetura

- **Web:** React, TypeScript, Vite e React Router.
- **API:** FastAPI em `backend_app.main:app`, exposta em `GET /health` e rotas `/api/v1`.
- **Banco:** Supabase Postgres externo via `DATABASE_URL`.
- **Auth:** credenciais próprias do backend com Argon2, JWT e refresh token.
- **Deploy:** Dokploy com `sinarca-api` e `sinarca-web` no mesmo commit, sem Postgres local no compose.

## Execução local

Instale as dependências do frontend:

```bash
npm ci
```

Execute o frontend:

```bash
npm run dev
```

Execute a API canônica:

```bash
uv run uvicorn backend_app.main:app --host 0.0.0.0 --port 5680
```

Rode os testes e validações principais:

```bash
npm run lint
npm run build
uv run pytest -q
docker compose -f docker-compose.dokploy.yml config
```

## Deploy Dokploy

O deploy operacional está documentado em [`.planning/docs/deployment/DOKPLOY.md`](./.planning/docs/deployment/DOKPLOY.md). O compose de Dokploy builda:

- `sinarca-api`: imagem Python/FastAPI com `backend_app.main:app`.
- `sinarca-web`: build estático Vite servido por Nginx.

Configure os secrets reais no Dokploy/Supabase a partir de `.env.example`. O arquivo contém apenas placeholders fictícios.

## Documentação técnica

- [Especificação de Integração Backend](./.planning/docs/BACKEND_INTEGRATION_SPEC.md)
- [Plano de Deploy da Phase 1](./.planning/phases/01-backend-rebuild/DEPLOYMENT-GUIDE.md)
- [Evidência de provedores Phase 1](./.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md)
