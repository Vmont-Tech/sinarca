# Arquitetura do Codebase

**Data da análise:** 2026-05-22

## Visão geral

```text
+-------------------------------------------------------------+
| SPA React/Vite na raiz do repositório                        |
| `index.html` -> `src/main.tsx` -> `src/App.tsx`              |
| Rotas públicas, rotas protegidas, layouts, páginas e UI      |
+--------------------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| Fronteiras de serviço do frontend                            |
| `src/services/api.ts`, `src/services/database.ts`,            |
| `src/contexts/AuthContext.tsx`, `src/services/impact-engine/` |
+--------------------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| API FastAPI ativa                                             |
| `backend_app/main.py`, routers `/api/v1/*`,                   |
| SQLAlchemy async, JWT/Argon2 e Postgres                       |
+--------------------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| Camadas de apoio e integrações                                |
| `backend_app/db/*`, `backend_app/modules/*`,                  |
| adapters Stellar/Soroban/Etherfuse/Polygon e contrato Rust    |
+-------------------------------------------------------------+
```

O sistema é um monorepo com frontend React/Vite, API Python/FastAPI em `backend_app/`, Postgres/Supabase como fonte durável e contrato Soroban separado. O backend legado foi aposentado nos artefatos de runtime/deploy.

## Responsabilidades principais

| Área | Responsabilidade | Arquivos |
|---|---|---|
| Bootstrap do frontend | Montar a SPA e aplicar tratamento de erro de renderização. | `index.html`, `src/main.tsx`, `src/ErrorBoundary.tsx` |
| Rotas | Registrar rotas públicas e protegidas. | `src/App.tsx` |
| Layout público | Cabeçalho, rodapé e shell das páginas públicas. | `src/layouts/PublicLayout.tsx` |
| Layout dashboard | Sidebar por papel, top bar e `<Outlet />` para `/painel/*`. | `src/layouts/DashboardLayout.tsx` |
| Autenticação no navegador | Estado de usuário, token, login, cadastro, perfil e expiração. | `src/contexts/AuthContext.tsx` |
| Guarda de rota | Bloqueio de `/painel/*` quando o usuário não está autenticado. | `src/components/ProtectedRoute.tsx` |
| Cliente HTTP | Base URL, bearer token, JSON/FormData e conversão de erros. | `src/services/api.ts` |
| Fachada de dados | Mapeamento de projetos, certificadoras, auditores, empresas, inventário e transações. | `src/services/database.ts` |
| Motor de impacto | Cálculo local SIE v1.1 no navegador. | `src/services/impact-engine/` |
| API ativa | Rotas `/health` e `/api/v1/*`, guards, serviços de domínio e persistência. | `backend_app/main.py`, `backend_app/api/router.py`, `backend_app/modules/*` |
| Persistência | Modelos SQLAlchemy async, sessões e seed Postgres. | `backend_app/db/*`, `supabase/seed.sql` |
| Adapters externos | Portas para Stellar/Soroban, Etherfuse, Polygon e Transfero. | `backend_app/adapters/*` |
| Contrato on-chain | Locked mint, unlock, transfer, burn e views. | `soroban-contract/src/contract.rs` |
| Deploy | Imagens separadas de API/frontend e compose Dokploy. | `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`, `docker-compose*.yml` |

## Fluxos arquiteturais

### Requisição principal

1. O navegador carrega `index.html` e monta `src/main.tsx`.
2. `src/App.tsx` registra rotas dentro de `AuthProvider` e `BrowserRouter`.
3. Páginas públicas renderizam diretamente; rotas `/painel/*` passam por `ProtectedRoute`.
4. Páginas de dados chamam `database.*` ou `api*`.
5. `src/services/api.ts` adiciona token, serializa corpo e chama `${API_BASE_URL}${path}`.
6. `backend_app` executa validação, autorização e serviços de domínio.
7. Dados críticos são lidos e gravados em Postgres.

### Autenticação

1. `AuthProvider` lê `sinarca_token` e expiração do `localStorage`.
2. Login envia `{ email, dadoLogin, password, role? }` para `/api/v1/auth/login`.
3. `backend_app` valida Argon2 no perfil persistido e emite JWT/refresh token.
4. O frontend persiste token, usuário e `expires_at`.
5. `/api/v1/auth/me` é a fonte de verdade para restaurar sessão.

### Marketplace e aposentadoria

1. `CreditMarketplace` lê `/marketplace`.
2. Compra usa `/marketplace/buy`, grava compra, evento de cadeia e lançamento no ledger.
3. Aposentadoria usa `/marketplace/compensate`, grava certificado, burn/evento e baixa de saldo.
4. `/transactions` lê lançamentos persistidos no ledger.

### Auditoria e certificação

1. `AuditorReview` consome `/audit/queue` e `/audit/verify/:projectId`.
2. `CertifierReview` consome `/certifier/queue` e `/certifier/projects/:projectId/decision`.
3. Decisões, laudos, evidências, créditos e trilha de auditoria são persistidos.

### Deploy atual

O `Dockerfile` raiz e `Dockerfile.api` executam `backend_app.main:app` na porta 5680. `Dockerfile.frontend` entrega o build Vite estático. `docker-compose.yml` cobre o fluxo local e `docker-compose.dokploy.yml` define o contrato de produção com API, web e Postgres/Supabase externo.

## Restrições e fontes canônicas

- Fonte canônica da API: `backend_app/main.py`, `backend_app/api/router.py`, `backend_app/modules/*`, `backend_app/db/*`.
- Fonte canônica dos dados iniciais: `supabase/seed.sql`.
- Fonte canônica do frontend: `src/App.tsx`, `src/layouts/*`, `src/services/*` e páginas em `src/pages/`.
- `soroban-contract/src/contract.rs` é a fonte do contrato Soroban.
- Supabase é usado nesta fase apenas como Postgres via `DATABASE_URL`.

## Anti-padrões a evitar

### Bypassar `src/services/api.ts`

Chamadas diretas ignoram `VITE_API_URL`, bearer token, proxy Vite e deploy em container. Novas chamadas devem usar `apiGet`, `apiPost` ou `apiPatch`.

### Reintroduzir estado de domínio fora do banco

Projetos, perfis, transações, laudos, créditos, certificados e exemplos navegáveis devem vir do Postgres ou do seed inicial.

### Planejar só pela documentação antiga

Há divergências históricas entre docs e código. Para novos cortes, a verdade operacional deve vir do código ativo e ser refletida de volta na documentação.

## Direção arquitetural

- Manter `backend_app/` como runtime único.
- Manter contrato `/api/v1` coberto por testes.
- Usar Supabase Postgres como fonte durável.
- Evoluir auth própria ou Supabase Auth apenas com decisão explícita.
- Manter guards por papel desde o primeiro corte.
- Isolar Stellar, Soroban, Etherfuse e Polygon atrás de adapters.
- Separar deploy em `sinarca-api` e `sinarca-web`, acionados pelo mesmo commit em `main`.
