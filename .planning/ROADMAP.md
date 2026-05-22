# Roadmap: SINARCA

## Overview

O ciclo atual concentra a Phase 1 na reconstrução do backend do SINARCA, saindo do MVP em memória para uma base operacional com API persistente, auth própria, Supabase Postgres, adapters financeiros/blockchain e deploy verificável.

## Phases

- [ ] **Phase 1: backend-rebuild** - Reconstruir o backend, cobrir os fluxos do frontend dependentes de dados e preparar validação local/staging.

## Phase Details

### Phase 1: backend-rebuild
**Goal**: Reconstruir/refatorar o backend do SINARCA em `backend_app`, com Supabase Postgres, auth própria Argon2/JWT, seed dos mocks do frontend, ledger off-chain, adapters Stellar/Soroban/Etherfuse/Polygon e cutover Dokploy sem fallback runtime para `backend/main.py`.
**Depends on**: Nothing (first phase)
**Requirements**: None
**Success Criteria** (what must be TRUE):
  1. Frontend autentica contra a API nova e consome dados reais/persistidos para todos os fluxos dependentes de dados.
  2. `supabase db push` real aplica schema e seed idempotente no Supabase.
  3. Marketplace, compra, aposentadoria, certificação, auditoria, inventário, transações e mapas funcionam via `/api/v1`.
  4. Soroban testnet tem deploy/invoke/status documentado; Etherfuse/Polygon têm tentativa real ou bloqueio externo documentado.
  5. Dokploy publica API e web com `/health`, login e frontend consumindo `backend_app`.
**Plans**: 6 plans

Plans:
- [x] 01-01: Congelar contrato atual, limpar testes obsoletos e corrigir chamada hardcoded de aposentadoria.
- [ ] 01-02: Criar `backend_app` FastAPI com configuração, health, auth própria Argon2/JWT e guards por papel.
- [ ] 01-03: Criar schema Supabase, RLS mínima, seed completo e camada de dados.
- [ ] 01-04: Implementar módulos operacionais persistentes da API v1 e remover mocks runtime do frontend.
- [ ] 01-05: Implementar adapters blockchain/financeiros e smoke real de provedores sandbox/testnet.
- [ ] 01-06: Preparar Docker/Dokploy, cutover sem fallback e documentação operacional.

## Auxiliary Documents

- `.planning/phases/01-backend-rebuild/DEPLOYMENT-GUIDE.md`
- `.planning/phases/01-backend-rebuild/PYTHON-IMPLEMENTATION-GUIDE.md`
- `.planning/phases/01-backend-rebuild/NODE-IMPLEMENTATION-GUIDE.md`

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. backend-rebuild | 1/6 | In Progress | - |
