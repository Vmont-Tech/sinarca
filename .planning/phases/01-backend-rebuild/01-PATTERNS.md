# Phase 01: mapa de padrões

**Data:** 2026-05-22
**Escopo:** arquivos análogos e padrões locais que os executores devem respeitar ao implementar a reconstrução do backend.

## Padrões de contrato HTTP

| Papel | Arquivo análogo | Padrão a preservar |
|---|---|---|
| API legada | `backend/main.py` | Prefixo `/api/v1`, `GET /health` fora do prefixo, respostas com `success`, erros via `detail`, CORS por ambiente. Usar como referência de contrato, não como fallback runtime. |
| Cliente HTTP frontend | `src/services/api.ts` | `API_BASE_URL` remove barra final, bearer vem de `localStorage.sinarca_token`, JSON usa `Content-Type`, `FormData` não força header. |
| Fachada de dados | `src/services/database.ts` | Adaptar shape da API para `ProjectMRCA`, feed, mapas e busca. Lançar erro quando `projects` não for array. |
| Auth frontend | `src/contexts/AuthContext.tsx` | Login espera `token` ou `access_token`, `expires_at`, `user`; role pública nunca deve normalizar para `admin`. |
| Transações frontend | `src/pages/Dashboard/Transactions.tsx` | Dados hoje mockados devem vir de `/api/v1/transactions`; filtros podem seguir locais sobre retorno da API. |

## Padrões backend atuais a congelar antes do rebuild

- `backend/main.py` usa `LoginRequest`, `RegisterRequest`, `BuyRequest`, `CompensateRequest` como contrato mínimo de payload.
- `ACTIVE_SESSIONS` é process-local e deve ser substituído, mas o shape de resposta de auth precisa permanecer.
- `marketplace/buy` hoje reduz `project["metrics"]["carbonStock"]`; a API nova deve trocar isso por transação de banco e ledger.
- `marketplace/compensate` hoje não valida saldo real do comprador; a API nova deve validar `ledger_entries`.
- `inventory/upload` já tem limite de tamanho e content types; a API nova deve adicionar magic bytes, hash e storage.

## Padrões de frontend acoplado

### `RetireCredits.tsx`

Arquivo a modificar no Plan 01-01:

- Import deve seguir o padrão relativo do diretório Dashboard: `import { apiPost } from '../../services/api';`
- A chamada deve usar `apiPost('/marketplace/compensate', payload)`.
- Não usar URL absoluta, `fetch` direto ou hardcode de porta.
- Textos de rede devem dizer `Stellar`, não `Algorand`.

## Padrões de dados e schema

| Domínio | Fonte local | Direção |
|---|---|---|
| Entidades alvo | `.planning/phases/01-backend-rebuild/DATA-MODEL.md` | Usar tabela por responsabilidade: `projects`, `project_tags`, `project_baselines`, `certifications`, `audits`, `ledger_entries`, `retirements`, `treasury_positions`, `chain_events`. |
| Status de projeto | `DATA-MODEL.md` | Preferir status canônicos `REGISTERED`, `AWAITING_CERTIFICATION`, `TOKENIZED_LOCKED`, `AWAITING_AUDIT`, `ACTIVE`, `BLOCKED_AUDIT_REQUIRED`, `RECALCULATION_REQUIRED`, `RETIRED`. |
| Seed demo | `backend/mock_data.py`, `src/data/mrca_db.ts`, mocks de telas | Migrar para `supabase/seed.sql`; não importar mock em runtime produtivo. |
| RLS | `DATA-MODEL.md` e `01-RESEARCH.md` | Supabase é Postgres, não Auth. Leitura pública só para visões públicas; escrita financeira apenas por backend/service role; autorização de papel fica no `backend_app`. |

## Padrões de auth e segurança

- `PUBLIC_AUTH_ROLES` em `backend/main.py` é o padrão de compatibilidade: `producer`, `auditor`, `company`, `certifier`.
- Cadastro público de `admin` deve continuar bloqueado.
- Erros de auth devem usar HTTP 401/403 com `detail` em português.
- Segredos ficam em settings/env; nunca em `.env.example` com valor real.
- Em produção, fallback local/demo deve falhar fechado.
- Supabase Auth, `auth.uid()` e claims Supabase não são contrato canônico da fase.

## Padrões blockchain/financeiros

| Requisito | Arquivo análogo | Padrão |
|---|---|---|
| Soroban lifecycle | `soroban-contract/src/contract.rs` | Preservar `mint_locked`, `unlock`, `transfer`, `burn`, `TOKEN_LOCKED`, auth por `Address::require_auth()`. |
| Changelog técnico | `.planning/docs/reference/CHANGELOG_BLOCKCHAIN.md` | Registrar mudanças de contrato/adapters com justificativa ligada a Mint -> Unlock -> Transfer -> Burn. |
| Stellar adapter atual | `backend/services/stellar_service.py` | Modo mock deve retornar `success`, `mode`, `hash`, `network`; modo testnet/live falha sem chaves. Soroban testnet real é critério obrigatório de fase. |
| DOCX financeiro | `.planning/docs/reference/O que precisamos ajustar nesse documento para refl....docx` | Sponsored reserves, Etherfuse/Tesouro, ledger off-chain, yield 90/10 e lock-and-mint são requisitos obrigatórios da fase. |

## Padrões de deploy

- `Dockerfile.api` atual usa `backend.main:app`; Plan 01-06 deve trocar para `backend_app.main:app`.
- `Dockerfile.frontend` atual usa Vite dev server; Plan 01-06 deve trocar para Nginx/Caddy estático.
- `docker-compose.yml` atual é inválido; criar `docker-compose.dokploy.yml` novo.
- Supabase deve ser externo aos containers de aplicação.
- Não manter fallback para `backend/main.py` em Docker, compose, README ou scripts de deploy.
- Staging Dokploy precisa provar API `/health`, auth própria contra Postgres real e frontend consumindo `backend_app`.

## Arquivos com conflito potencial

| Arquivo | Planos | Tratamento |
|---|---|---|
| `pyproject.toml` | 01-02 | Apenas Plan 01-02 deve alterar dependências/pacote. |
| `src/services/database.ts` | 01-04 | Plan 01-04 adiciona tipos DTO; outros planos devem só ler. |
| `soroban-contract/src/contract.rs` | 01-05 | Plan 01-05 centraliza mudanças de contrato. |
| `Dockerfile.api`, `Dockerfile.frontend` | 01-06 | Plan 01-06 centraliza deploy. |
| `.planning/docs/BACKEND_INTEGRATION_SPEC.md` | 01-06 | Plan 01-06 atualiza documentação após adapters/domínios. |

## PATTERN MAPPING COMPLETE
