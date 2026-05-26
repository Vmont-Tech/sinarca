---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 03 plan 03-04 completed; next plan 03-05
last_updated: "2026-05-26T21:58:03.056Z"
last_activity: 2026-05-26 -- Phase 03 execution started
progress:
  total_phases: 10
  completed_phases: 2
  total_plans: 16
  completed_plans: 15
  percent: 20
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-26)

**Core value:** Sustentar os fluxos operacionais de créditos ambientais com base persistente, segura, implantável e experiências completas por papel.
**Current focus:** Phase 03 — project-origination-and-documents

## Current Position

Phase: 03 (project-origination-and-documents) — EXECUTING
Plan: 03-05 of 03-05
Status: Phase 03 plan 03-04 complete; executing Phase 03
Last activity: 2026-05-26 -- Phase 03 plan 03-04 completed

Progress: [██--------] 20%

## Performance Metrics

**Velocity:**

- Total plans completed: 6
- Average duration: 12min
- Total execution time: 1.18 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 backend-rebuild | 6/6 | 71min | 12min |
| Phase 01-backend-rebuild P01-01 | 5min | 3 tasks | 4 files |
| Phase 01-backend-rebuild P01-02 | 6min | 3 tasks | 20 files |
| Phase 01-backend-rebuild P01-03 | 24min | 4 tasks | 14 files |
| Phase 01-backend-rebuild P01-04 | 12min | 4 tasks | 26 files |
| Phase 01-backend-rebuild P01-05 | 11min | 5 tasks | 17 files |
| Phase 01-backend-rebuild P01-06 | 13min | 5 tasks | 14 files |

## Accumulated Context

### Decisions

- Phase 1 executa apenas `01-01` a `01-06` como planos canônicos.
- `DEPLOYMENT-GUIDE.md`, `PYTHON-IMPLEMENTATION-GUIDE.md` e `NODE-IMPLEMENTATION-GUIDE.md` são documentação auxiliar, não planos executáveis.
- Auth própria com Argon2/JWT; Supabase apenas como Postgres.
- Cutover sem fallback runtime para `backend/main.py`.
- [Phase 01]: O contrato legado foi congelado contra backend.main:app antes da reconstrução em backend_app.
- [Phase 01]: A aposentadoria de créditos usa apiPost('/marketplace/compensate') para herdar VITE_API_URL e bearer token.
- [Phase 01]: O adapter Stellar legado deve falhar explicitamente quando habilitado sem chaves públicas.
- [Phase 01]: backend_app agora expõe auth própria com Argon2/JWT e resposta compatível com AuthContext.
- [Phase 01]: repositório de perfis em memória é stub temporário da Plan 01-02 e será substituído por Supabase Postgres na Plan 01-03.
- [Phase 01]: Supabase local oficial roda via Docker em 54321/54322/54323; migrations e seed passam com `npx supabase db reset`.
- [Phase 01]: Seed inicial consolida mocks do backend e frontend para mapas, feed/detalhes, rankings, perfis, inventário, transações e filas de auditoria/certificação.
- [Phase 01-backend-rebuild]: [Phase 01]: backend_app API v1 agora cobre projetos, certificação, auditoria, marketplace, transações, inventário e upload seguro contra Supabase Postgres local. — Execução da Plan 01-04.
- [Phase 01-backend-rebuild]: [Phase 01]: Compras usam ledger off-chain com OFFCHAIN_LEDGER_PURCHASE em chain_events.payload, sem wallet externa do comprador. — Execução da Plan 01-04.
- [Phase 01-backend-rebuild]: [Phase 01]: Declarações de inventário persistem como documentos lógicos auditáveis em documents, sem nova tabela na Plan 01-04. — Execução da Plan 01-04.
- [Phase 01-backend-rebuild]: Adapters Stellar/Soroban, Etherfuse e Polygon falham fechado em testnet/sandbox sem segredos e configuração obrigatórios.
- [Phase 01-backend-rebuild]: backend_app auth própria permaneceu canônica nas rotas blockchain/tesouraria; Supabase segue apenas como Postgres.
- [Phase 01-backend-rebuild]: Soroban SDK 26 constrói WASM local com wasm32v1-none; wasm32-unknown-unknown é incompatível com o Rust atual.
- [Phase 01-backend-rebuild]: Deploy Dokploy usa backend_app.main:app como runtime único da API, com web estática Nginx e Supabase Postgres externo.
- [Phase 01-backend-rebuild]: Staging Phase 1 permanece bloqueado externamente até existirem STAGING_API_URL, STAGING_WEB_URL, credenciais Dokploy e Supabase remoto.
- [Roadmap]: A auditoria de checklist de fluxo/tela de 2026-05-26 não reabre a Phase 1; ela distribui as lacunas identificadas em fases próprias de produto/UX e operação.
- [Roadmap]: A conferência contra `.planning/docs/bible/` adiciona cobertura explícita para campo mobile/PWA, pagamentos/settlement e requisitos transversais de segurança, privacidade, compliance, qualidade e governança de dados.
- [Roadmap]: O checklist operacional em `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` é baseline obrigatório das Phases 2-10; cada plano futuro deve declarar cobertura do checklist, fora de escopo e gate de dados seed/API.
- [Phase 02]: A discussão foi fechada por documentos, sem pergunta bloqueante, porque checklist, Bible e roadmap já definem o recorte.
- [Phase 02]: A fase foi dividida em cinco planos: navegação/legal, contrato público de API, dossiê/explorer UI, perfis públicos/rankings e auth/perfil.
- [Phase 02]: Admin permanece sem cadastro público; provisionamento e gestão admin ficam na Phase 9.
- [Phase 02]: Conteúdo legal/institucional entra agora, mas operações completas de DPO, LGPD, retenção, anonimização e AML/CFT ficam na Phase 10.
- [Phase 02]: Canais provisórios distintos usam o domínio `@sinarca.com.br`: `contato@`, `suporte@`, `dpo@` e `compliance@` quando aplicável.
- [Phase 02]: Dossiê público agregado fica em `/api/v1/projects/{id}/public-dossier` para evitar montagem frágil na UI.
- [Phase 02]: Explorer público usa `/api/v1/transactions` com filtros por projeto, hash, tipo, comprador e status, além de `/api/v1/transactions/{hash_or_id}`.
- [Phase 02]: Perfis públicos usam `/api/v1/profiles/{id}` com documento mascarado e dados minimizados.
- [Phase 02]: Cadastro público aceita produtor, empresa, auditor e certificadora; admin segue bloqueado para provisionamento operacional futuro.
- [Phase 03]: Originação backend registra quatro QTAGs A/B/C/D, bloqueia SUN/Sentinel como credenciais ausentes, persiste documentos por projeto e usa timeline inicial com códigos canônicos.
- [Phase 03]: `AddProject` agora é wizard operacional; município/UF são campos livres, produtores/certificadoras vêm da API e `ProjectCreate.tags` é montado por `projectOrigination.ts`.
- [Phase 03]: Captura de campo web/PWA falha fechado para NFC/SUN sem credenciais, permite geolocalização com fallback manual e renderiza geofence SVG a partir das mesmas QTAGs enviadas no submit.
- [Phase 03]: Documentos obrigatórios são selecionados no wizard, enviados via `FormData` após criação do projeto e só liberam sucesso final quando os uploads obrigatórios terminam.

### Roadmap Evolution

- Phase 2 added: public-transparency-and-profiles.
- Phase 3 added: project-origination-and-documents.
- Phase 4 added: certification-workbench.
- Phase 5 added: audit-monitoring-and-anomalies.
- Phase 6 added: marketplace-wallet-and-retirement.
- Phase 7 added: emissions-inventory-and-compensation.
- Phase 8 added: treasury-blockchain-and-interoperability.
- Phase 9 added: admin-operations-and-observability.
- Phase 10 added: security-compliance-and-data-governance.

### Pending Todos

- Abrir PR para `docs/planejamento-fase-2` ou incluir os artefatos de planejamento no PR da branch `feat/fase-2-transparencia-perfis`, porque `main` está protegida contra push direto.
- Executar Phase 3 (`project-origination-and-documents`) a partir dos cinco planos criados em `.planning/phases/03-project-origination-and-documents/`, sempre preservando seção "Cobertura do checklist" em cada `PLAN.md`.

### Blockers/Concerns

- Supabase, Dokploy, Soroban, Etherfuse e Polygon dependem de credenciais/ambientes externos para smoke real.
- Soroban testnet deploy/invoke/status bloqueado: falta source account/identidade de assinatura e SOROBAN_CONTRACT_ID; ver .planning/docs/providers/PHASE1-PROVIDER-SMOKE.md.
- Polygon testnet smoke bloqueado: POLYGON_RPC_URL, POLYGON_VAULT_ADDRESS e source lock tx hash ausentes.
- Etherfuse sandbox smoke bloqueado: ETHERFUSE_API_URL e ETHERFUSE_API_KEY ausentes.
- Staging Dokploy Phase 1 bloqueado: STAGING_API_URL, STAGING_WEB_URL, credenciais Dokploy e Supabase remoto ausentes; ver .planning/docs/deployment/PHASE1-STAGING-SMOKE.md.
- Phase 2 execução deve usar canais provisórios distintos no domínio `@sinarca.com.br`: `contato@sinarca.com.br` para contato geral, `suporte@sinarca.com.br` para suporte e `dpo@sinarca.com.br` para DPO.
- `npx tsc -b` segue bloqueado por dívida legada fora do escopo da Phase 2, principalmente imports não usados e tipos incompletos no impact-engine; `npm run build` passa.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Mobile | App nativo avançado além do cliente de campo web/PWA/mobile previsto nas Phases 3 e 5 | Future enhancement | Phase 1 discussion |
| Production | Mainnet e operação financeira produtiva | Future phase | Phase 1 discussion |

## Session Continuity

Last session: 2026-05-22T22:53:48.032Z
Stopped at: Completed 01-backend-rebuild-01-06-PLAN.md
Resume file: None
