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
| `backend/main.py`, rotas inline em `/api/v1/*`,               |
| dados em memória e adapter Stellar em modo mock/parcial       |
+--------------------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| Camadas de apoio, legado e deploy                             |
| `backend/api/*` não montado, `backend/models/*` não usado,    |
| contrato Soroban em Rust e Dockerfiles de runtime             |
+-------------------------------------------------------------+
```

O sistema atual é um monorepo com frontend React/Vite, backend Python/FastAPI em modo MVP e contrato Soroban separado. A API em produção local é `backend/main.py`; os módulos SQLAlchemy em `backend/api/*`, `backend/core/*` e `backend/models/*` existem como esqueleto/legado e não devem ser tratados como runtime ativo.

## Responsabilidades principais

| Área | Responsabilidade | Arquivos |
|---|---|---|
| Bootstrap do frontend | Montar a SPA e aplicar tratamento de erro de renderização. | `index.html`, `src/main.tsx`, `src/ErrorBoundary.tsx` |
| Rotas | Registrar rotas públicas e protegidas. | `src/App.tsx` |
| Layout público | Cabeçalho, rodapé e shell das páginas públicas. | `src/layouts/PublicLayout.tsx` |
| Layout dashboard | Sidebar por papel, top bar e `<Outlet />` para `/painel/*`. | `src/layouts/DashboardLayout.tsx` |
| Autenticação no navegador | Estado de usuário, token, login, cadastro, perfil e fallback local. | `src/contexts/AuthContext.tsx` |
| Guarda de rota | Bloqueio de `/painel/*` quando o usuário não está autenticado. | `src/components/ProtectedRoute.tsx` |
| Cliente HTTP | Base URL, bearer token, JSON/FormData e conversão de erros. | `src/services/api.ts` |
| Fachada de dados | Mapeamento de projetos, certificadoras, auditores, empresas, inventário e mapas. | `src/services/database.ts` |
| Motor de impacto | Cálculo local SIE v1.1 no navegador. | `src/services/impact-engine/` |
| API ativa | Rotas `/health` e `/api/v1/*`, sessões e dados em memória. | `backend/main.py`, `backend/mock_data.py` |
| Adapter blockchain | Transferência/burn simulados e preparação para Stellar. | `backend/services/stellar_service.py` |
| Persistência planejada | Modelos, sessão e routers SQLAlchemy não montados. | `backend/core/`, `backend/api/`, `backend/models/` |
| Contrato on-chain | Locked mint, unlock, transfer, burn e views. | `soroban-contract/src/contract.rs` |
| Deploy | Imagem combinada e imagens separadas de API/frontend. | `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend` |

## Fluxos arquiteturais

### Requisição principal

1. O navegador carrega `index.html` e monta `src/main.tsx`.
2. `src/App.tsx` registra rotas dentro de `AuthProvider` e `BrowserRouter`.
3. Páginas públicas renderizam diretamente; rotas `/painel/*` passam por `ProtectedRoute`.
4. Páginas de dados chamam `database.*` ou `api*`.
5. `src/services/api.ts` adiciona token, serializa corpo e chama `${API_BASE_URL}${path}`.
6. `backend/main.py` responde a rota ativa e lê/muta `backend/mock_data.py`.
7. `src/services/database.ts` adapta a resposta para feed, mapa, detalhe e painéis.

### Autenticação

1. `AuthProvider` lê `sinarca_token`, `sinarca_user` e expiração do `localStorage`.
2. Login envia `{ email, dadoLogin, password, role? }` para `/api/v1/auth/login`.
3. `backend/main.py` valida usuário em memória e gera token opaco em `ACTIVE_SESSIONS`.
4. O frontend persiste token, usuário e `expires_at`.
5. A reconstrução deve mover essa lógica para Supabase Auth/JWT ou auth própria com senha hash, expiração no servidor e guards por papel.

### Marketplace e aposentadoria

1. `CreditMarketplace` lê `/marketplace`.
2. Compra usa `/marketplace/buy`, chama `StellarService.transfer_credit`, registra transação e reduz estoque em memória.
3. `RetireCredits` ainda chama `http://127.0.0.1:5680/...` diretamente; isso precisa ser substituído por `apiPost('/marketplace/compensate', ...)`.
4. A reconstrução deve trocar mutações em memória por transações no Supabase Postgres e ledger idempotente.

### Auditoria e certificação

1. `AuditorReview` consome `/audit/queue` e `/audit/verify/:projectId`.
2. `CertifierReview` consome `/certifier/queue` e `/certifier/projects/:projectId/decision`.
3. `backend/main.py` altera status e timeline em listas globais.
4. A API nova deve persistir laudos, evidências, decisões e eventos auditáveis.

### Deploy atual

O `Dockerfile` raiz constrói o frontend, instala a API Python e serve a SPA via fallback estático em FastAPI. `Dockerfile.api` expõe API Python na porta 5680. `Dockerfile.frontend` usa Vite dev server e não é um runtime estático de produção. `docker-compose.yml` existe, mas está inválido para uso confiável.

## Restrições e fontes canônicas

- Fonte canônica do contrato ativo: `backend/main.py`, `backend/mock_data.py`, `src/services/api.ts`, `src/services/database.ts` e `src/contexts/AuthContext.tsx`.
- Fonte canônica do frontend: `src/App.tsx`, `src/layouts/*`, `src/services/*` e páginas em `src/pages/`.
- `backend/api/*` e `backend/models/*` são referência/legado até serem explicitamente conectados.
- `soroban-contract/src/contract.rs` é a fonte candidata do contrato Soroban; `backend/main.py` não chama o contrato on-chain.
- A reconstrução aprovada segue Python/FastAPI, com Node.js/TypeScript mantido apenas como alternativa documentada.

## Anti-padrões a evitar

### Adicionar endpoint em router não montado

Adicionar rotas em `backend/api/*` não altera a API atual, porque `backend/main.py` não inclui esses routers. Enquanto a API antiga existir, mudanças de runtime precisam estar em `backend/main.py`; na reconstrução, devem entrar no novo pacote `backend_app/`.

### Bypassar `src/services/api.ts`

Chamadas diretas como a de `RetireCredits` ignoram `VITE_API_URL`, bearer token, proxy Vite e deploy em container. Novas chamadas devem usar `apiGet`, `apiPost` ou `apiPatch`.

### Assumir que PostgreSQL já é o storage ativo

O runtime atual usa listas/dicionários em memória. A migração para Supabase deve ser uma fase explícita com migrations, seed, RLS e testes.

### Planejar só pela documentação antiga

Há divergências históricas entre docs e código, como menções a bibliotecas que não estão no `package.json`. Para o próximo corte, a verdade operacional deve vir do código ativo e ser refletida de volta na documentação.

## Direção arquitetural para a reconstrução

- Criar `backend_app/` como nova API FastAPI isolada.
- Congelar contrato `/api/v1` antes de substituir `backend/main.py`.
- Usar Supabase Postgres como fonte de dados durável.
- Escolher explicitamente Supabase Auth/JWT ou auth própria com Argon2/JWT.
- Implementar guards por papel desde o primeiro corte.
- Isolar Stellar, Soroban, Etherfuse e Polygon atrás de adapters.
- Separar deploy em `sinarca-api` e `sinarca-web`, acionados pelo mesmo commit em `main`.
