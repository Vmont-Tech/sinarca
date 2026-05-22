# SINARCA: validação local, UAT e preparo Dokploy

**Data:** 2026-05-22
**Escopo:** comandos para validar o estado local atual e checklist de mudanças para publicar no Dokploy.

## 1. Pré-requisitos locais

- Node.js 20+.
- Python 3.11+.
- `uv` disponível no PATH.
- Portas livres:
  - API: `5680`
  - Frontend Vite: `5173`

## 2. Instalação

```bash
npm ci
uv sync
```

Se `uv sync` não instalar ferramentas de teste, use os comandos com `uv run --with ...` descritos abaixo.

## 3. Subir localmente

Terminal 1, API atual:

```bash
uv run uvicorn backend.main:app --host 0.0.0.0 --port 5680
```

Terminal 2, frontend:

```bash
VITE_API_URL=http://127.0.0.1:5680/api/v1 npm run dev -- --host 0.0.0.0 --port 5173
```

URLs:

- API health: `http://127.0.0.1:5680/health`
- API docs: `http://127.0.0.1:5680/docs`
- Frontend: `http://127.0.0.1:5173`

## 4. Gates automatizados locais

Gates que passam no estado atual:

```bash
npm run lint
npm run build
uv run python -c "from backend.main import app; print(app.title)"
```

Resultado observado em 2026-05-22:

- `npm run lint`: passa com 1 warning em `src/pages/Dashboard/Feed.tsx`.
- `npm run build`: passa; Vite alerta bundle JS maior que 500 kB.
- import da API: passa e imprime `Sinarca API`.

Smoke local da API:

```bash
bash scripts/uat/local-api-smoke.sh
```

Smoke mutável, incluindo compra e aposentadoria em memória:

```bash
RUN_MUTATING_UAT=true bash scripts/uat/local-api-smoke.sh
```

Testes Python atuais:

```bash
uv run --with pytest --with httpx pytest -q tests/test_api_integration.py
```

Status observado: falha hoje porque os testes esperam comportamento antigo:

- `test_workflow_decision_flow` espera certificação mover direto para `AVAILABLE`, mas a API atual move para `AUDITED`.
- `test_monetization_endpoints` espera `/api/v1/monetization`, removido do backend atual.
- `test_stellar_service_missing_keys_raises` espera erro que o serviço atual não levanta nesse caminho.

Antes de usar pytest como gate obrigatório, alinhar `tests/test_api_integration.py` ao contrato atual ou ao contrato final da Phase 1.

## 5. UAT manual local

Execute com API e frontend locais rodando.

| Área | Passos | Aceite |
|---|---|---|
| Health/API | Abrir `/health` e `/docs`. | `/health` retorna `status=ok`; docs carregam. |
| Login empresa | Abrir `/login`, selecionar Empresa, entrar com `empresa@sinarca.com.br` / `empresa`. | Redireciona para `/painel`; token fica em `localStorage.sinarca_token`. |
| Login auditor | Entrar com `auditor@sinarca.com.br` / `auditor`. | Painel abre sem erro de sessão. |
| Login certificadora | Entrar com `certificadora@sinarca.com.br` / `certificadora`. | Painel abre sem erro de sessão. |
| Projetos/mapas | Abrir explorador público, mapa global e detalhe de `PRC-2024-002`. | Lista e detalhe carregam via API; não há tela vazia por mock ausente. |
| Marketplace | Abrir `/painel/marketplace`. | Créditos disponíveis aparecem; compra chama `/api/v1/marketplace/buy`. |
| Aposentadoria | Abrir `/painel/aposentar`, confirmar fluxo. | Frontend chama `/api/v1/marketplace/compensate`; certificado aparece ou erro é claro. |
| Transações | Abrir `/painel/transacoes`. | Histórico mostra compras/aposentadorias depois do smoke mutável. |
| Auditoria | Abrir fila de auditoria e aprovar/bloquear um projeto. | Status muda e fila atualiza após refresh. |
| Certificação | Abrir fila da certificadora e aprovar/rejeitar um projeto. | Status muda e marketplace reflete novo ciclo. |
| Inventário | Abrir inventário e declarar escopos. | Total e recomendação de compensação são calculados. |

## 6. Checklist local da Phase 1 final

Quando `backend_app` estiver implementado, os comandos locais devem mudar para:

```bash
supabase db push
uv run uvicorn backend_app.main:app --host 0.0.0.0 --port 5680
VITE_API_URL=http://127.0.0.1:5680/api/v1 npm run dev -- --host 0.0.0.0 --port 5173
npm run lint
npm run build
uv run pytest -q
```

Critérios obrigatórios da Phase 1:

- `supabase db push` real aplicado no projeto Supabase.
- Auth própria Argon2/JWT contra Postgres real.
- Seed cobre mocks do backend e do frontend, incluindo `src/data/mrca_db.ts`.
- Frontend consome `backend_app`; sem fallback runtime para `backend/main.py`.
- Stellar/Soroban testnet tem deploy/invoke/status documentado.
- Etherfuse/Polygon têm tentativa real sandbox/testnet ou bloqueio externo documentado.

## 7. Alterações necessárias para Dokploy

### 7.1 API

O `Dockerfile.api` atual ainda roda:

```text
uvicorn backend.main:app
```

Para a Phase 1 final, alterar para:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
COPY uv.lock* ./
COPY . .

RUN uv pip install --system .

EXPOSE 5680
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5680/health', timeout=5)"
CMD ["uvicorn", "backend_app.main:app", "--host", "0.0.0.0", "--port", "5680"]
```

Enquanto `backend_app` não existir, manter `backend.main:app` apenas para validação do MVP atual.

### 7.2 Frontend

O `Dockerfile.frontend` atual roda Vite dev server. Para Dokploy, trocar para build estático:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`VITE_API_URL` precisa ser build arg no Dokploy, porque Vite injeta env no build, não em runtime do Nginx.

### 7.3 Compose alvo

Criar `docker-compose.dokploy.yml` quando `backend_app` estiver pronto:

```yaml
services:
  sinarca-api:
    build:
      context: .
      dockerfile: Dockerfile.api
    env_file:
      - .env
    ports:
      - "${API_PORT:-5680}:5680"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5680/health', timeout=5)"]
      interval: 30s
      timeout: 10s
      retries: 5

  sinarca-web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
    ports:
      - "${WEB_PORT:-80}:80"
    depends_on:
      sinarca-api:
        condition: service_healthy
```

Não subir Postgres dentro do compose do app. Supabase/Postgres fica externo.

### 7.4 Variáveis no Dokploy

Configurar no app API:

```bash
APP_ENV=production
PUBLIC_WEB_URL=https://app.seu-dominio.com
CORS_ORIGINS=https://app.seu-dominio.com
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET_KEY=...
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_ISSUER_PUBLIC_KEY=...
STELLAR_ISSUER_SECRET_KEY=...
STELLAR_DISTRIBUTOR_PUBLIC_KEY=...
STELLAR_DISTRIBUTOR_SECRET_KEY=...
ETHERFUSE_API_URL=...
ETHERFUSE_API_KEY=...
POLYGON_RPC_URL=...
POLYGON_VAULT_ADDRESS=...
```

Configurar no build do frontend:

```bash
VITE_API_URL=https://api.seu-dominio.com/api/v1
VITE_ALLOW_LOCAL_AUTH_FALLBACK=false
```

## 8. Ordem de publicação no Dokploy

1. Fazer push da branch validada.
2. Aplicar migrations no Supabase:

```bash
supabase db push
```

3. Deploy da API.
4. Validar `/health` da API.
5. Fazer login via API publicada.
6. Deploy do frontend com `VITE_API_URL` apontando para a API publicada.
7. Rodar smoke publicado:

```bash
API_URL=https://api.seu-dominio.com WEB_URL=https://app.seu-dominio.com bash scripts/uat/dokploy-smoke.sh
```

8. Executar UAT manual em produção/staging com os mesmos fluxos da seção 5.

## 9. Critério de pronto para produção

Não considerar pronto para produção se qualquer item abaixo estiver pendente:

- `docker-compose.yml` atual inválido ainda for o arquivo usado no Dokploy.
- `Dockerfile.frontend` ainda rodar `npm run dev`.
- API de produção ainda depender de mock/memória para dados críticos.
- `VITE_API_URL` não estiver definido no build do frontend.
- `CORS_ORIGINS` permitir localhost em produção.
- `ALLOW_DEMO_AUTH_FALLBACK` ou `VITE_ALLOW_LOCAL_AUTH_FALLBACK` estiverem `true`.
- `JWT_SECRET_KEY` estiver com valor padrão.
- `supabase db push` não tiver sido executado contra o banco correto.
- Smoke `scripts/uat/dokploy-smoke.sh` não passar contra a URL publicada.
