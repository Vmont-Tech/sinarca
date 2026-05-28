# Stack Tecnológica

**Data da análise:** 2026-05-27

## Linguagens

- **TypeScript:** frontend React/Vite em `src/`.
- **Python 3.11:** backend FastAPI ativo em `backend_app/`, com manifesto em `pyproject.toml`.
- **Rust 2021:** contrato Soroban em `soroban-contract/`.
- **CSS/Tailwind:** estilos em `src/index.css`, `src/App.css` e `tailwind.config.js`.

## Runtimes e gerenciadores

- **Node.js:** usado pelo frontend, Vite, lint e Dockerfiles de build.
- **npm:** `package.json` e `package-lock.json`.
- **Python/uv:** `pyproject.toml`, `uv.lock`, `.python-version`, `Dockerfile` e `Dockerfile.api`.
- **Cargo:** `soroban-contract/Cargo.toml` e `soroban-contract/Cargo.lock`.
- **Docker:** `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend` e `.dockerignore`.

## Frameworks e bibliotecas principais

Frontend:

- React 19.2
- React DOM 19.2
- React Router DOM 7.11
- Vite 7.2
- TypeScript 5.9
- Tailwind CSS 3.4
- lucide-react
- Leaflet
- `@svg-maps/brazil`

Backend atual:

- FastAPI
- Pydantic v2
- pydantic-settings
- Uvicorn
- `python-multipart`
- `email-validator`
- SQLAlchemy async
- asyncpg
- Alembic
- PyJWT
- pwdlib/Argon2

Contrato:

- Soroban SDK 26

## Módulos operacionais atuais

Frontend:

- `src/App.tsx` registra rotas públicas e rotas protegidas sob `/painel/*`.
- `src/layouts/DashboardLayout.tsx` controla navegação por papel, incluindo produtor, certificadora, auditor, empresa e admin.
- `src/services/api.ts` é o cliente HTTP obrigatório para JSON, bearer token, `FormData` e mensagens de erro.
- `src/services/database.ts` é a fachada de dados para projetos, marketplace, dossiê público, monitoramento e catálogos.
- `src/services/projectDrafts.ts` cobre rascunhos de originação, upload de documentos e envio para projeto.
- `src/services/projectDocuments.ts` cobre upload de documentos de projeto já criado.
- `src/pages/Dashboard/AddProject.tsx` é o fluxo de originação com projeto, QTAGs/geofence, documentos e revisão.
- `src/pages/Dashboard/AuditorReview.tsx` é a referência de revisão detalhada em card expansível.
- `src/pages/Dashboard/CertifierReview.tsx` é a fila inicial da certificadora e ponto de evolução da Fase 4.
- `src/pages/Dashboard/MrcaDetails.tsx` consome o dossiê público do projeto.

Backend:

- `backend_app/api/router.py` monta os routers ativos sob `/api/v1`.
- `backend_app/modules/auth` cobre login, cadastro, sessão e perfil autenticado.
- `backend_app/modules/projects` cobre projetos, catálogos, dossiê público, rascunhos, documentos, baseline determinístico e QTAGs.
- `backend_app/modules/certifier` cobre a fila e decisão inicial da certificadora.
- `backend_app/modules/audit` cobre fila, laudo e decisão de auditoria.
- `backend_app/modules/marketplace` cobre compra e compensação.
- `backend_app/modules/inventory` cobre inventário e uploads validados.
- `backend_app/modules/monitoring` expõe baseline, QTAGs e eventos de monitoramento.
- `backend_app/modules/blockchain` registra lock-and-mint externo protegido.
- `backend_app/modules/treasury` cobre distribuição de yield e serviço futuro de confirmação de lastro/mint.
- `backend_app/modules/supabase_storage.py` grava/copia objetos no Supabase Storage quando configurado.

## Dependências citadas, mas não consolidadas

Arquivos legados ou integrações futuras podem citar pacotes que não estão garantidos pelo manifesto atual:

- `python-dotenv`
- `python-jose`
- `passlib`
- `brutils`
- `slowapi`
- `boto3`
- `cryptography`
- `stellar_sdk`
- `requests`

Esses pacotes não devem ser assumidos como base da reconstrução. A nova API deve declarar apenas o que realmente usa.

## Configuração atual

- `VITE_API_URL` controla a URL da API no frontend.
- `vite.config.ts` faz proxy de `/api` para `http://localhost:5680`.
- `APP_ENV`, `PORT`, `PUBLIC_WEB_URL`, `CORS_ORIGINS`, `DATABASE_URL`, `JWT_*` e tempos de token são centralizados em `backend_app/core/config.py`.
- `backend_app/main.py` monta a API ativa.
- `STELLAR_NETWORK`, `ETHERFUSE_API_URL` e `POLYGON_RPC_URL` configuram adapters externos.
- `SUPABASE_URL`, `SUPABASE_PUBLIC_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_JWT_SECRET` configuram Storage.
- Supabase é usado como Postgres via `DATABASE_URL` e como Storage por REST em uploads de documentos.
- Buckets e caminhos atuais: `projects`, `profiles`, `user-documents`, com URIs `supabase://...`.

## Scripts úteis

```bash
npm ci
npm run dev
npm run lint
npm run build
uvicorn backend_app.main:app --host 0.0.0.0 --port 5680
uv run pytest -q
docker build -f Dockerfile.api .
docker build -f Dockerfile.frontend .
```

## Requisitos de produção

- API Python/FastAPI em `backend_app/` como runtime único.
- Supabase Postgres local e produção com migrations.
- Supabase Storage configurado quando uploads reais forem obrigatórios; em produção, não usar chave placeholder.
- Frontend Vite servido como estático por Nginx/Caddy.
- `Dockerfile.api` e `Dockerfile.frontend` produtivos.
- Deploy Dokploy com API e web no mesmo gatilho de `main`.
- `.env.example` sem segredos.

## Observações para a Fase 4

- A stack já tem `python-multipart`, `FormData` no cliente e Storage para suportar upload real de certificado PDF.
- A fila da certificadora existe, mas ainda é mínima; a Fase 4 deve evoluir `CertifierReview.tsx` e `backend_app/modules/certifier/routes.py`.
- A execução de mint/provider não pertence à certificadora. A certificação deve criar autorização/status para tesouraria; adapters permanecem isolados em `backend_app/adapters/*` e serviços de tesouraria/blockchain.
