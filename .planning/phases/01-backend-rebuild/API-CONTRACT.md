# Contrato inicial da API v1 para a reconstrução do backend

**Data:** 2026-05-22
**Fonte primária atual:** `backend/main.py`, `src/services/api.ts`, `src/services/database.ts`, `src/contexts/AuthContext.tsx`

Este contrato deve ser preservado no primeiro corte da reconstrução em Python/FastAPI. A alternativa Node.js/TypeScript só deve substituí-lo se houver uma nova decisão formal.

## Regras gerais

- Prefixo: `/api/v1`
- Health fora do prefixo: `GET /health`
- Envelope padrão: respostas de sucesso devem continuar aceitando `{ "success": true, ... }`.
- Autenticação: o frontend envia `Authorization: Bearer <token>` via `src/services/api.ts`.
- Erros: retornar `detail` ou `message`, pois `src/services/api.ts` extrai esses campos.
- CORS: permitir somente origens configuradas por ambiente em produção.

## Auth

| Método | Rota | Compatibilidade obrigatória |
|---|---|---|
| POST | `/api/v1/auth/login` | Aceitar `{ email, dadoLogin, password, role? }`; responder `token`, `access_token`, `refresh_token`, `expires_at`, `expires_in_seconds`, `user` |
| POST | `/api/v1/auth/register` | Aceitar `name`, `username`, `email`, `document`, `password`, `role`; bloquear cadastro público de admin |
| GET | `/api/v1/auth/me` | Retornar usuário sem senha quando o bearer for válido |
| PATCH | `/api/v1/auth/me` | Atualizar `name`, `email`, `document`, `organization`, `phone`, `avatar` |

## Catálogos e projetos

| Método | Rota | Resposta esperada pelo frontend |
|---|---|---|
| GET | `/api/v1/projects` | `{ success, total, projects: ProjectMRCA[] }` |
| GET | `/api/v1/projects/:id` | `{ success, project: ProjectMRCA }` |
| GET | `/api/v1/certifiers` | `{ success, certifiers: [...] }` |
| GET | `/api/v1/auditors` | `{ success, auditors: [...] }` |
| GET | `/api/v1/companies` | `{ success, companies: [...] }` |
| GET | `/api/v1/inventory` | `{ success, inventory: [...] }` |

Campos usados pelo frontend no `ProjectMRCA`:

- `id`
- `friendlyId`
- `name`
- `description`
- `status`
- `methodology`
- `location.city`
- `location.state`
- `location.stateId`
- `metrics.carbonStock`
- `metrics.vintage`
- `metrics.totalAreaHa`
- `entities.developer`
- `entities.certifier`
- `entities.auditor`
- `blockchain.timestamp`
- `blockchain.initialHash`
- `image`
- `timeline`

## Inventário e documentos

| Método | Rota | Observação |
|---|---|---|
| POST | `/api/v1/inventory/declare` | Aceitar `escopo_1`, `escopo_2`, `escopo_3`; persistir declaração por usuário/empresa |
| POST | `/api/v1/inventory/upload` | Receber multipart; validar magic bytes, tamanho, extensão, auth e armazenar metadados |

## Auditoria e certificação

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/api/v1/audit/queue` | Fila para auditor; exigir papel `auditor` ou `admin` |
| PATCH | `/api/v1/audit/verify/:projectId` | Aceitar `APPROVED`, `BLOCKED`, `RECALCULATED`; registrar laudo, evidências e evento |
| GET | `/api/v1/certifier/queue` | Fila para certificadora; exigir papel `certifier` ou `admin` |
| PATCH | `/api/v1/certifier/projects/:projectId/decision` | Aceitar `APPROVE`, `REJECT`, `REQUEST_CHANGES`; registrar certificado ou pendência |

## Marketplace, ledger e aposentadoria

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/api/v1/marketplace` | Listar projetos/créditos disponíveis |
| POST | `/api/v1/marketplace/buy` | Comprar crédito via ledger off-chain; não transferir token nativo ao comprador no MVP |
| POST | `/api/v1/marketplace/compensate` | Aposentar crédito; gerar certificado; registrar burn/adaptador |
| GET | `/api/v1/transactions` | Histórico do usuário, com filtros por papel |
| GET | `/api/v1/stellar/status` | Status do adapter blockchain |

## Correções de frontend acopladas

- `src/pages/Dashboard/RetireCredits.tsx` deve parar de chamar `http://127.0.0.1:5680` diretamente e usar `apiPost('/marketplace/compensate', ...)`.
- `src/services/database.ts` deve ganhar tipos DTO explícitos para reduzir regressão durante a troca do backend.
- `src/contexts/AuthContext.tsx` deve tratar a API reconstruída como fonte canônica e manter fallback local apenas em desenvolvimento.
