---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-03-PLAN.md
last_updated: "2026-08-15T13:03:42.759Z"
last_activity: 2026-08-15
progress:
  total_phases: 13
  completed_phases: 3
  total_plans: 23
  completed_plans: 19
  percent: 83
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-26)

**Core value:** Sustentar os fluxos operacionais de créditos ambientais com base persistente, segura, implantável e experiências completas por papel.
**Current focus:** Phase 04 — certification-workbench

## Current Position

Phase: 04 (certification-workbench) — IN PROGRESS
Plan: 3 of 7 complete
Status: Ready to execute
Last activity: 2026-08-15

Progress: [███████░░░] 74%

## Performance Metrics

**Velocity:**

- Total plans completed: 17
- Average duration: tracked in per-plan summaries where available
- Total execution time: tracked in phase summaries where available

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
| Phase 04 P01 | 25min | 3 tasks | 6 files |
| Phase 04-certification-workbench P02 | 20min | 3 tasks | 6 files |
| Phase 04-certification-workbench P03 | 30min | 3 tasks | 6 files |

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
- [Roadmap 2026-08-14]: Ingestão de `.planning/docs/bible/14_Novos_requisitos.md` (Integrity Layer) e `15_Geofance_sentinel_requisitos.md` (Satellite Monitoring) inseriu Phase 04.1 (geospatial-foundation) e 04.2 (integrity-layer-foundation) entre Phase 4 e Phase 5, expandiu a Phase 5 para `satellite-monitoring-and-field-audit` e inseriu Phase 05.1 (integrity-review-and-external-registries). Nenhum plano/execução foi afetado — Phase 4 segue READY_TO_PLAN sem bloqueio.
- [Roadmap 2026-08-14]: Nem PRD 14 nem PRD 15 têm fundação hoje: zero PostGIS/geometry no schema, geofence é shoelace ingênuo sobre 4 pontos (backend e frontend), e `deterministic_baseline()` gera `ndvi_mean`/`sentinel_scene_id` por hash do nome do projeto, não por observação de satélite real.
- [Roadmap 2026-08-14]: Sinarca não tem acesso a nenhum provedor de geoportal/registro externo (tipo InfoTerras) hoje; Phase 05.1 começa pela decisão documentada de build vs. buy antes de qualquer integração ONR/SIGEF/CAR.
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
- [Phase 03]: Dossiê de projeto renderiza geofence a partir de `dossier.tags`, documentos reais de `dossier.documents`, timeline canônica da API e baseline rotulado como determinístico/Sentinel bloqueado quando aplicável.
- [Phase 04]: Constraint unica (project_id, decision) de certifications removida; decisoes de certificacao passam a ser append-only (sempre INSERT, indice por project_id/created_at).
- [Phase 04]: certification_pendencies e treasury_authorizations sao tabelas operacionais sem policy de SELECT no RLS; acesso exclusivo via backend_app com auth propria e guard de papel.
- [Phase 04-certification-workbench]: Dossie publico minimizado: public_certification_item/public_document_item excluem notas internas e documentos nao PUBLIC_DOCUMENT_TYPES; certificate/certificationHistory expostos sem metadata/beforeData/afterData.
- [Phase 04-certification-workbench]: assert_certification_dossier_complete usa HTTP 400 para propagar o detail exato do 04-UI-SPEC.md via src/services/api.ts.
- [Phase 04-certification-workbench]: GET /certifier/projects/{id}/review entrega o dossie tecnico completo e registra CERTIFICATION_REVIEW_OPENED uma vez por ator.
- [Phase 04-certification-workbench]: project.timeline nunca recebe as notes internas do certificador (nenhuma das tres decisoes); usa sempre uma descricao publica fixa, ja que project.timeline e serializado tanto no dossie publico quanto na revisao interna pelo mesmo project_to_mrca().
- [Phase 04-certification-workbench]: GET /certifier/projects/{id}/history e GET /projects/{id}/pendencies foram adicionados no plano 04-03 como funcionalidade critica ausente (Rule 2): nenhuma task os declarava, mas os proprios testes de aceite do plano exigem ambos.

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
- Phase 04.1 inserted (2026-08-14): geospatial-foundation, após Phase 4.
- Phase 04.2 inserted (2026-08-14): integrity-layer-foundation, após Phase 04.1.
- Phase 5 edited (2026-08-14): audit-monitoring-and-anomalies → satellite-monitoring-and-field-audit.
- Phase 05.1 inserted (2026-08-14): integrity-review-and-external-registries, após Phase 5.

### Pending Todos

- Planejar Phase 4 (`certification-workbench`) a partir de `.planning/phases/04-certification-workbench/04-CONTEXT.md`.
- Antes de seguir para execução de Phase 4, confirmar se a branch `feat/fase-3-originacao-documentos` já foi revisada/shipada conforme fluxo de PR.
- Planejar Phase 04.1 (`geospatial-foundation`) — pré-requisito bloqueante de 04.2 e da Phase 5 expandida; nenhuma das duas pode ser executada antes dela.
- Decidir e documentar build vs. buy de provedor de registro externo (ONR/SIGEF/CAR) antes de planejar a Phase 05.1 — sem fornecedor definido em 2026-08-14.

### Blockers/Concerns

- Supabase, Dokploy, Soroban, Etherfuse e Polygon dependem de credenciais/ambientes externos para smoke real.
- Soroban testnet deploy/invoke/status bloqueado: falta source account/identidade de assinatura e SOROBAN_CONTRACT_ID; ver .planning/docs/providers/PHASE1-PROVIDER-SMOKE.md.
- Polygon testnet smoke bloqueado: POLYGON_RPC_URL, POLYGON_VAULT_ADDRESS e source lock tx hash ausentes.
- Etherfuse sandbox smoke bloqueado: ETHERFUSE_API_URL e ETHERFUSE_API_KEY ausentes.
- Staging Dokploy Phase 1 bloqueado: STAGING_API_URL, STAGING_WEB_URL, credenciais Dokploy e Supabase remoto ausentes; ver .planning/docs/deployment/PHASE1-STAGING-SMOKE.md.
- Phase 2 execução deve usar canais provisórios distintos no domínio `@sinarca.com.br`: `contato@sinarca.com.br` para contato geral, `suporte@sinarca.com.br` para suporte e `dpo@sinarca.com.br` para DPO.
- `npx tsc -b` segue bloqueado por dívida legada fora do escopo da Phase 2, principalmente imports não usados e tipos incompletos no impact-engine; `npm run build` passa.
- Phase 3 Web NFC/SUN/Sentinel live permanecem bloqueados por hardware, chaves e credenciais externas; fluxo registra fallback manual e baseline determinístico.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Mobile | App nativo avançado além do cliente de campo web/PWA/mobile previsto nas Phases 3 e 5 | Future enhancement | Phase 1 discussion |
| Production | Mainnet e operação financeira produtiva | Future phase | Phase 1 discussion |

## Session Continuity

Last session: 2026-08-15T13:03:42.754Z
Stopped at: Completed 04-03-PLAN.md
Resume file: None
