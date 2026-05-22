# Projeto SINARCA

## Core Value

Reconstruir o backend do SINARCA para sustentar os fluxos operacionais de créditos ambientais com API persistente, autenticação própria, ledger off-chain, integrações sandbox/testnet e deploy verificável.

## Current Milestone

v1.0 — backend rebuild.

## Key Decisions

| Data | Decisão |
|---|---|
| 2026-05-22 | `backend_app` será o runtime canônico da Phase 1; `backend/main.py` fica apenas como legado temporário. |
| 2026-05-22 | Supabase será usado apenas como Postgres; identidade canônica será auth própria com Argon2/JWT. |
| 2026-05-22 | Todos os fluxos do frontend que dependem de dados devem ser cobertos pelo backend novo e pelo seed Supabase. |
| 2026-05-22 | Phase 1 exige Supabase real, staging Dokploy e Soroban testnet; Etherfuse/Polygon exigem tentativa real ou bloqueio documentado. |

## Source Documents

- `.planning/phases/01-backend-rebuild/01-CONTEXT.md`
- `.planning/phases/01-backend-rebuild/01-DISCUSSION-LOG.md`
- `.planning/docs/reference/Fluxo_Operacional_Completo_da_Plataforma_SINARCA.p.pdf`
- `.planning/docs/reference/O que precisamos ajustar nesse documento para refl....docx`
