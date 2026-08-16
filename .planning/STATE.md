---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 04.1 (geospatial-foundation) — UAT + security verified
last_updated: "2026-08-16T08:54:15.498Z"
last_activity: 2026-08-16 -- Phase 04.1 verified (UAT 6/6, security 22/22 threats closed)
progress:
  total_phases: 13
  completed_phases: 5
  total_plans: 28
  completed_plans: 28
  percent: 100
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-26)

**Core value:** Sustentar os fluxos operacionais de créditos ambientais com base persistente, segura, implantável e experiências completas por papel.
**Current focus:** Phase 04.2 — integrity-layer-foundation

## Current Position

Phase: 04.2
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-16 -- Phase 04.1 (geospatial-foundation) complete: PostGIS foundation, backfill, validation, overlap detection, persisted-geometry rendering. UAT 6/6 passed. Security 22/22 threats closed.

Progress: [███████░░░] 74%

## Performance Metrics

**Velocity:**

- Total plans completed: 22
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
| Phase 04-certification-workbench P04 | 20min | 2 tasks | 2 files |
| Phase 04-certification-workbench P05 | 35min | 3 tasks | 3 files |
| Phase 04-certification-workbench P06 | 25min | 3 tasks | 2 files |
| Phase 04-certification-workbench P07 | 30min | 3 tasks | 6 files |
| Phase 04.1 P01 | 30min | 3 tasks | 7 files |
| Phase 04.1 P02 | 15min | 3 tasks | 2 files |
| Phase 04.1 P03 | 20min | 3 tasks | 4 files |
| Phase 04.1-geospatial-foundation P04 | 25min | 3 tasks | 4 files |
| Phase 04.1 P05 | 10min | 3 tasks | 6 files |
| 04.1 | 5 | - | - |

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
- [Phase 04-certification-workbench]: GET /treasury/authorizations retorna uma lista JSON no nivel raiz (nao o envelope success/total/authorizations), porque os testes de aceite pre-existentes ja esperam um array.
- [Phase 04-certification-workbench]: TREASURY_QUEUE_CREATED e MINT_AUTHORIZED sao gravados com entity_type=projects/entity_id=project.id, para aparecerem na timeline de auditoria do projeto e no dossie publico, que filtram estritamente por entity_type==projects.
- [Phase 04-certification-workbench]: CertifierQueueResponse usa items (chave exigida pelo teste imutável de 04-01) com projects como alias de compatibilidade com CertifierReview.tsx
- [Phase 04-certification-workbench]: GET /certifier/projects/{id}/history manteve formato de lista JSON no nível raiz com filtros event_type/actor_role, sem o envelope CertificationHistoryResponse descrito na prosa do plano, porque testes imutáveis de 04-01 consomem a rota como array
- [Phase 04-certification-workbench]: fetchCertificationHistory monta o envelope events/availableEventTypes/availableActorRoles no cliente a partir da lista bruta retornada por GET /certifier/projects/{id}/history, ja que a rota manteve o formato de lista no nivel raiz (desvio ja documentado em 04-05-SUMMARY.md).
- [Phase 04-certification-workbench]: A aba Documentos da bancada da certificadora usa document_item (sem filename/metadata) porque esse e o serializador interno realmente entregue pelo plano 04-02, distinto do public_document_item do dossie publico; o rotulo exibido usa o tipo do documento (documentTypeLabel).
- [Phase 04-certification-workbench]: [Phase 04-certification-workbench]: GET /projects/{id}/certification-history entrega a trilha interna completa (com notes) para produtor dono, certificadora do projeto e admin, guardado por _assert_project_edit_permission org-scoped e nao apenas require_role.
- [Phase 04-certification-workbench]: GET /projects/{id}/certificate usa optional_user (nao require_role) e converte 401/403 de _assert_project_edit_permission em 403 uniforme, para nao disparar clearAuthSession() no visitante anonimo do dossie publico.
- [Phase 04-certification-workbench]: Dossie publico (MrcaDetails.tsx) exibe referencia/hash/download condicional do certificado e a linha do tempo publica de decisoes finais; codigo morto cert.notes removido, sem regressao de minimizacao (D-20).
- [Phase 04.1-01]: PostGIS 3.3.7 enabled; project_boundaries e a fundacao geoespacial aditiva, sem tocar project_tags.
- [Phase 04.1-01]: D-GEO-01 -- project_boundaries e tabela operacional interna: RLS habilitado, DML revogado de anon/authenticated, sem policy de select; geometria so chega ao cliente via backend_app (GeoJSON).
- [Phase 04.1-01]: D-GEO-03 -- active_boundary espelha declared_boundary por codigo (migration/seed), nunca por trigger; active_boundary_tier = 'DECLARED' nesta fase.
- [Phase 04.1-01]: Backfill do declared_boundary reusa exatamente o algoritmo centroide + atan2 de _polygon_area()/orderTagsForPolygon(); PRC-2024-002 backfilled com vertices/area identicos ao calculo shoelace anterior (1e-12).
- [Phase 04.1-01]: npx supabase db reset aplica migrations antes de seed.sql; a logica idempotente de backfill foi replicada em supabase/seed.sql (apos inserir project_tags) para garantir PRC-2024-002 backfilled em todo reset local fresco.
- [Phase 04.1]: D-GEO-02: divergencia de area declarada vs calculada e sempre computada, sempre persistida, sempre exposta, e NUNCA bloqueia persistencia nesta fase. Limiar BOUNDARY_AREA_DIVERGENCE_WARN_PCT = 10.0 (flag-only). No retangulo dos fixtures de teste a heuristica _area_from_tags() devolve ~104.93 ha contra ~486 ha geodesicos (ST_Area(::geography)) -- ~363% de divergencia; um limiar bloqueante rejeitaria todo projeto existente. Falhas topologicas (ST_IsValid/ST_IsSimple falso, vertices duplicados, <4 ou >500 vertices) SEGUEM bloqueando com HTTP 400.
- [Phase 04.1]: tests/ nao tem __init__.py, entao import estilo pacote (tests.test_certifier_workbench) nao resolve na config de pytest deste repo; fixtures HTTP foram copiadas verbatim em tests/test_project_boundaries.py em vez de importadas, conforme fallback ja documentado no proprio plano.
- [Phase 04.1-03]: GEOF-04: detect_boundary_overlaps e GET /projects/{id}/boundary-overlaps sao deteccao/medicao apenas via ST_Intersects (pre-filtro GiST) + ST_Area(ST_Intersection(...)::geography); nenhum Conflict, severidade ou threshold criado (Phase 04.2/INTG-03)
- [Phase 04.1-03]: Endpoint boundary-overlaps guardado org-scoped pelo mesmo require_role + _assert_project_edit_permission de /projects/{id}/pendencies, porque overlap revela existencia e proximidade geometrica de projetos de terceiros (T-041-11)
- [Phase 04.1-04]: boundary_item/public_boundary_item mirroram o padrao certification_item/document_item: dossie publico recebe geometria + declaredAreaHa + declaredVertexCount + activeTier; revisao do certificador recebe o objeto completo com declaredSource e ambos os campos de divergencia de area (D-GEO-02).
- [Phase 04.1]: Frontend GEOF-05: ProjectGeofencePreview passa a renderizar boundary GeoJSON persistido (dossie publico e revisao do certificador), com fallback client-side quando boundary e null; wizard de originacao continua recalculando ao vivo, intencionalmente sem a prop boundary.

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
- ~~Planejar Phase 04.1 (`geospatial-foundation`)~~ — concluído 2026-08-16 (5/5 plans, UAT 6/6, security 22/22). Phase 04.2 e Phase 5 expandida agora desbloqueadas.
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

Last session: 2026-08-16T02:53:33.233Z
Stopped at: Completed 04.1-05-PLAN.md
Resume file: None
