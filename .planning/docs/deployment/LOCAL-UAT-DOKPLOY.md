# SINARCA: validação local, UAT e preparo Dokploy

**Data:** 2026-05-22
**Escopo:** comandos para validar o runtime canônico `backend_app` com Supabase/Postgres e publicar no Dokploy.

## 1. Pré-requisitos locais

- Node.js 20+.
- Python 3.11+.
- `uv` disponível no PATH.
- Supabase local ou Postgres acessível via `DATABASE_URL`.
- Portas livres: API `5680` e frontend Vite `5173`.

## 2. Instalação

```bash
npm ci
uv sync
```

## 3. Banco local

```bash
npx -y supabase status
npx -y supabase db reset
```

`DATABASE_URL` local padrão:

```bash
export DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres'
```

## 4. Subir localmente

Terminal 1, API:

```bash
DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres' \
  uv run uvicorn backend_app.main:app --host 0.0.0.0 --port 5680
```

Terminal 2, frontend:

```bash
VITE_API_URL=http://127.0.0.1:5680/api/v1 npm run dev -- --host 0.0.0.0 --port 5173
```

URLs:

- API health: `http://127.0.0.1:5680/health`
- API docs: `http://127.0.0.1:5680/docs`
- Frontend: `http://127.0.0.1:5173`

## 5. Gates automatizados locais

```bash
npm run lint
npm run build
uv run pytest -q
docker compose config
docker compose -f docker-compose.dokploy.yml config
```

Critério: nenhum gate pode depender de dados ou sessão em memória.

## 6. UAT manual local

Execute com API e frontend locais rodando.

| Área | Passos | Aceite |
|---|---|---|
| Health/API | Abrir `/health` e `/docs`. | `/health` retorna `status=ok` e `version=0.3.0-backend-app`; docs carregam. |
| Login empresa | Abrir `/login`, selecionar Empresa, entrar com `empresa@sinarca.com.br` / `empresa`. | Redireciona para `/painel`; token fica em `localStorage.sinarca_token`. |
| Logout | Abrir menu do usuário no topo ou Configurações e clicar em Sair. | Sessão é removida e volta para `/login`. |
| Cadastro | Criar nova conta pública. | Conta é criada em `profiles` no Postgres e login subsequente funciona. |
| Perfil | Editar nome, organização e telefone em `/painel/configuracoes`. | Dados persistem após refresh e aparecem em `GET /api/v1/auth/me`. |
| Projetos/mapas | Abrir mapa global e detalhe de `PRC-2024-002`. | Lista e detalhe carregam via API/Postgres. |
| Marketplace | Abrir `/painel/marketplace`. | Créditos disponíveis aparecem via API/Postgres. |
| Aposentadoria | Abrir `/painel/aposentar`, confirmar fluxo. | Frontend chama `/api/v1/marketplace/compensate`; certificado aparece ou erro é claro. |
| Transações | Abrir `/painel/transacoes`. | Histórico vem de ledger/transações no Postgres. |
| Auditoria | Abrir fila de auditoria e aprovar/bloquear um projeto. | Status muda no Postgres e fila atualiza após refresh. |
| Certificação | Abrir fila da certificadora e aprovar/rejeitar um projeto. | Status muda no Postgres e marketplace reflete novo ciclo. |
| Inventário | Abrir inventário e declarar escopos. | Total e recomendação de compensação são calculados e persistidos. |

## 7. Dokploy

### API

Usar `Dockerfile.api` ou `Dockerfile` raiz. Ambos executam `backend_app.main:app`.

Variáveis obrigatórias:

```bash
APP_ENV=production
JWT_SECRET_KEY=<secret-real>
DATABASE_URL=postgresql+asyncpg://...
CORS_ORIGINS=https://seu-frontend.example
```

### Frontend

`VITE_API_URL` precisa ser build arg no Dokploy, porque Vite injeta env no build.

```bash
VITE_API_URL=https://api.seu-dominio.com/api/v1
```

### Compose

Use `docker-compose.dokploy.yml`. O compose não sobe Postgres local; Supabase/Postgres é externo.

## 8. Checklist de produção

1. Aplicar migrations no Supabase real:

```bash
supabase db push
```

2. Confirmar seed/migração no banco correto.
3. Deploy da API com `DATABASE_URL` remoto.
4. Deploy do frontend com `VITE_API_URL` apontando para a API publicada.
5. Rodar smoke staging:

```bash
curl -fsS "$STAGING_API_URL/health"
curl -fsS "$STAGING_API_URL/api/v1/projects/PRC-2024-002"
```

## 9. Falhas que bloqueiam publicação

- Runtime apontar para outro pacote que não `backend_app`.
- API de produção depender de dados artificiais, lista global ou sessão em memória para dados críticos.
- `DATABASE_URL` ausente ou apontando para banco errado.
- `VITE_API_URL` ausente no build do frontend.
- Qualquer caminho local de autenticação, lista global ou sessão em memória reintroduzido no frontend/backend.
- `supabase db push` não executado contra o banco correto.
