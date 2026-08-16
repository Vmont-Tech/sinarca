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
| 2026-08-14 | Ingestão de `.planning/docs/bible/14_Novos_requisitos.md` (Sinarca Integrity Layer) e `15_Geofance_sentinel_requisitos.md` (Satellite Historical Reconstruction & Monitoring). Nenhuma das duas tem fundação geoespacial hoje: zero PostGIS, geofence é shoelace client/server-side sobre 4 pontos, e `project_baselines`/`sentinel_scene_id`/`ndvi_mean` são gerados por `deterministic_baseline()` (hash do nome do projeto), não por observação real. |
| 2026-08-14 | Inseridas Phase 04.1 (geospatial-foundation) e Phase 04.2 (integrity-layer-foundation) entre Phase 4 e Phase 5; Phase 5 expandida de "audit-monitoring-and-anomalies" para "satellite-monitoring-and-field-audit"; inserida Phase 05.1 (integrity-review-and-external-registries). Decisão do usuário: expandir a Phase 5 existente em vez de criar fase solta para satélite; fundação geoespacial é pré-requisito bloqueante antes de Certification Workbench (Phase 4) consumir Claim/Evidence. |
| 2026-08-14 | Sinarca não tem acesso hoje a nenhum provedor de geoportal/registro externo (tipo InfoTerras) para ONR/CNM, SIGEF/INCRA, CAR/SICAR. A Phase 05.1 começa pela decisão documentada de build vs. buy, não pela integração em si — ver `.planning/docs/bible/relatorio_MG-3126000-4A5F440A95394810A3531AEB447BCBAB_2026-08-10.pdf` como referência do que um provedor desse tipo entrega. |
| 2026-08-16 | Phase 04.2 (integrity-layer-foundation) concluída: `Claim`/`Evidence`/`Conflict`/Risk Engine/Auto Hold vivem em `backend_app/modules/integrity/`, com `integrity_status`/`risk_score` paralelos a `projects.status` — nunca o substituem nesta fase (gating completo de workflow por confiança fica para a Phase 05.1, quando existir Four-Eyes). Status público nunca mais mostra "Certified" isolado. UAT 8/8 (evidência ao vivo contra API real) e segurança 24/24 threats fechados. |

## Source Documents

- `.planning/phases/01-backend-rebuild/01-CONTEXT.md`
- `.planning/phases/01-backend-rebuild/01-DISCUSSION-LOG.md`
- `.planning/docs/reference/Fluxo_Operacional_Completo_da_Plataforma_SINARCA.p.pdf`
- `.planning/docs/reference/O que precisamos ajustar nesse documento para refl....docx`
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`
- `.planning/docs/BIBLE_PHASE_COVERAGE_AUDIT.md`
- `.planning/docs/bible/14_Novos_requisitos.md`
- `.planning/docs/bible/15_Geofance_sentinel_requisitos.md`
- `.planning/docs/bible/relatorio_MG-3126000-4A5F440A95394810A3531AEB447BCBAB_2026-08-10.pdf`
