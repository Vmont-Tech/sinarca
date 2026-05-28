# Arquitetura do Codebase

**Data da análise:** 2026-05-27

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
| `src/services/projectDrafts.ts`, documentos e auth            |
| `src/services/impact-engine/`                                 |
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

O sistema é um monorepo com frontend React/Vite, API Python/FastAPI em `backend_app/`, Postgres/Supabase como fonte durável, Supabase Storage para arquivos e contrato Soroban separado. O backend legado foi aposentado nos artefatos de runtime/deploy.

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
| Originação de projetos | Rascunhos, QTAGs/geofence, documentos, edição e envio para certificação. | `src/pages/Dashboard/AddProject.tsx`, `src/services/projectDrafts.ts`, `src/services/projectDocuments.ts` |
| Revisões operacionais | Cards de fila, dossiê técnico e decisão por papel. | `src/pages/Dashboard/AuditorReview.tsx`, `src/pages/Dashboard/CertifierReview.tsx` |
| Dossiê público | Exposição pública limitada de projeto, baseline, documentos, certificações, auditorias, créditos e eventos. | `src/pages/Dashboard/MrcaDetails.tsx`, `src/services/database.ts` |
| Motor de impacto | Cálculo local SIE v1.1 no navegador. | `src/services/impact-engine/` |
| API ativa | Rotas `/health` e `/api/v1/*`, guards, serviços de domínio e persistência. | `backend_app/main.py`, `backend_app/api/router.py`, `backend_app/modules/*` |
| Persistência | Modelos SQLAlchemy async, sessões e seed Postgres. | `backend_app/db/*`, `supabase/seed.sql` |
| Arquivos | Validação, hash, Storage e registro documental. | `backend_app/modules/projects/routes.py`, `backend_app/modules/supabase_storage.py`, `backend_app/modules/storage_paths.py` |
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

### Originação de projeto

1. `AddProject` organiza o cadastro em etapas de projeto, QTAGs/geofence, documentos e revisão.
2. Rascunhos usam `/project-drafts`, `/project-drafts/{id}`, `/project-drafts/{id}/documents` e `/project-drafts/{id}/submit`.
3. Uploads usam `FormData`, validação de extensão/tamanho/magic bytes, hash SHA-256 e caminhos em `backend_app/modules/storage_paths.py`.
4. Ao submeter um rascunho de criação, o backend valida documentos mínimos, QTAGs/geofence, cria baseline determinístico e grava o projeto como `AWAITING_CERTIFICATION`.
5. O serviço copia documentos do rascunho para o projeto, registra `audit_events` e atualiza a timeline.

### Auditoria e certificação

1. `AuditorReview` consome `/audit/queue` e `/audit/verify/:projectId`.
2. A revisão de auditoria é feita em card expansível, com evidências de baseline, QTAGs, checklist, anexos locais e prévia de laudo.
3. `CertifierReview` consome `/certifier/queue` e `/certifier/projects/:projectId/decision`; hoje a tela é uma fila mínima com ações diretas.
4. A Fase 4 deve evoluir a certificadora para card expansível com abas de resumo, QTAGs/geofence, documentos, cálculo, decisão e histórico.
5. Decisões, laudos, evidências, créditos, certificados, pendências e trilha de auditoria devem ser persistidos.

### Certificação e tesouraria

1. A certificadora revisa dossiê mínimo: baseline, quatro QTAGs/geofence e documentos obrigatórios.
2. Quando o dossiê estiver incompleto, a certificadora cria pendência estruturada para o produtor/origem; o projeto sai da fila principal e entra na fila separada de aguardando retorno.
3. Aprovação exige metodologia, potencial de crédito, notas, justificativa quando houver ajuste e certificado PDF real.
4. A aprovação cria status visíveis `Certificação aprovada`, `Mint autorizado` e `Aguardando tesouraria`.
5. A certificação autoriza a tesouraria, mas não chama provider externo nem adapter de mint nesta fase.
6. A tesouraria/blockchain permanece responsável por execução operacional de mint bloqueado em fluxo próprio.

### Dossiê público e interno

1. `/projects/{project_id}/public-dossier` agrega projeto, tags, baseline, certificações, auditorias, documentos, créditos, transações e eventos de cadeia.
2. A interface pública deve expor apenas decisões finais, certificado/referência e dados permitidos.
3. Dados internos, notas sensíveis, histórico completo e metadados completos ficam restritos a papéis autorizados.

### Deploy atual

O `Dockerfile` raiz e `Dockerfile.api` executam `backend_app.main:app` na porta 5680. `Dockerfile.frontend` entrega o build Vite estático. `docker-compose.yml` cobre o fluxo local e `docker-compose.dokploy.yml` define o contrato de produção com API, web e Postgres/Supabase externo.

## Restrições e fontes canônicas

- Fonte canônica da API: `backend_app/main.py`, `backend_app/api/router.py`, `backend_app/modules/*`, `backend_app/db/*`.
- Fonte canônica dos dados iniciais: `supabase/seed.sql`.
- Fonte canônica do frontend: `src/App.tsx`, `src/layouts/*`, `src/services/*` e páginas em `src/pages/`.
- `soroban-contract/src/contract.rs` é a fonte do contrato Soroban.
- Supabase é usado como Postgres via `DATABASE_URL` e como Storage via endpoints REST quando configurado.
- `.planning/phases/04-certification-workbench/04-CONTEXT.md` é a fonte canônica das decisões funcionais da Fase 4.

## Anti-padrões a evitar

### Bypassar `src/services/api.ts`

Chamadas diretas ignoram `VITE_API_URL`, bearer token, proxy Vite e deploy em container. Novas chamadas devem usar `apiGet`, `apiPost` ou `apiPatch`.

### Reintroduzir estado de domínio fora do banco

Projetos, perfis, transações, laudos, créditos, certificados e exemplos navegáveis devem vir do Postgres ou do seed inicial.

### Simular sucesso de provedores externos

Integrações sem credenciais devem falhar fechado ou gerar status operacional pendente. A certificadora não deve executar mint/provider direto na Fase 4.

### Misturar dossiê público e interno

Notas internas, histórico sensível e metadados completos não devem ser expostos no dossiê público. A resposta pública precisa ser minimizada por desenho.

### Aprovar certificação sem dossiê mínimo

A aprovação da certificadora deve bloquear ausência de baseline, quatro QTAGs/geofence, documentos obrigatórios e certificado PDF.

### Planejar só pela documentação antiga

Há divergências históricas entre docs e código. Para novos cortes, a verdade operacional deve vir do código ativo e ser refletida de volta na documentação.

## Direção arquitetural

- Manter `backend_app/` como runtime único.
- Manter contrato `/api/v1` coberto por testes.
- Usar Supabase Postgres como fonte durável.
- Usar Supabase Storage para arquivos reais, mantendo hash e caminho persistidos no banco.
- Evoluir auth própria ou Supabase Auth apenas com decisão explícita.
- Manter guards por papel desde o primeiro corte.
- Isolar Stellar, Soroban, Etherfuse e Polygon atrás de adapters.
- Modelar decisões imutáveis como novos eventos/linhas, não como edição destrutiva.
- Separar autorização de certificação da execução operacional da tesouraria.
- Separar deploy em `sinarca-api` e `sinarca-web`, acionados pelo mesmo commit em `main`.
