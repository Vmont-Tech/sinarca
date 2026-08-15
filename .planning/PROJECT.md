# Projeto SINARCA

## Core Value

Sustentar os fluxos operacionais de créditos ambientais com API persistente, autenticação própria, ledger off-chain, integrações sandbox/testnet, deploy verificável e experiências completas por papel.

## Current Milestone

v1.0 — base operacional e fechamento de fluxos/telas.

## Key Decisions

| Data | Decisão |
|---|---|
| 2026-05-22 | `backend_app` será o runtime canônico da Phase 1; `backend/main.py` fica apenas como legado temporário. |
| 2026-05-22 | Supabase será usado apenas como Postgres; identidade canônica será auth própria com Argon2/JWT. |
| 2026-05-22 | Todos os fluxos do frontend que dependem de dados devem ser cobertos pelo backend novo e pelo seed Supabase. |
| 2026-05-22 | Phase 1 exige Supabase real, staging Dokploy e Soroban testnet; Etherfuse/Polygon exigem tentativa real ou bloqueio documentado. |
| 2026-05-26 | Phase 1 permanece restrita à base técnica concluída; lacunas de fluxo/tela da auditoria viram Phases 2-9 no roadmap. |
| 2026-05-26 | Conferência contra `.planning/docs/bible/` adiciona Phase 10 para segurança, compliance, privacidade, governança de dados e qualidade, além de reforços nas Phases 2, 3, 5, 6 e 9. |
| 2026-05-26 | Checklist operacional em `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` é baseline obrigatório das Phases 2-10; planos futuros devem declarar cobertura do checklist e gate de dados seed/API. |

## Source Documents

- `.planning/phases/01-backend-rebuild/01-CONTEXT.md`
- `.planning/phases/01-backend-rebuild/01-DISCUSSION-LOG.md`
- `.planning/docs/reference/Fluxo_Operacional_Completo_da_Plataforma_SINARCA.p.pdf`
- `.planning/docs/reference/O que precisamos ajustar nesse documento para refl....docx`
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`
- `.planning/docs/BIBLE_PHASE_COVERAGE_AUDIT.md`
