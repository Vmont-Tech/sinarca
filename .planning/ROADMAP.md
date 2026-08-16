# Roadmap: SINARCA

## Overview

O ciclo atual separa a base técnica do fechamento de produto. A Phase 1 permanece limitada à reconstrução do backend do SINARCA, saindo do MVP em memória para uma base operacional com API persistente, auth própria, Supabase Postgres, adapters financeiros/blockchain e deploy verificável.

A auditoria de checklist de 2026-05-26 identificou lacunas de fluxo, tela e operação que deixariam a Phase 1 extensa demais. A conferência contra `.planning/docs/bible/` adicionou os requisitos transversais de segurança, compliance, privacidade, governança de dados, qualidade e operação. Esses itens passam a ser programados como fases próprias a partir da Phase 2, preservando a Phase 1 como fundação concluída.

A ingestão de `.planning/docs/bible/14_Novos_requisitos.md` (Sinarca Integrity Layer) e `.planning/docs/bible/15_Geofance_sentinel_requisitos.md` (Satellite Historical Reconstruction & Monitoring) em 2026-08-14 inseriu quatro fases: 04.1 (fundação geoespacial/PostGIS, pré-requisito comum de ambas as Bibles), 04.2 (fundação do Integrity Layer — Claim/Evidence/Conflict/Risk Score), a Phase 5 existente foi expandida para incorporar monitoramento satelital real via Copernicus Sentinel-2, e 05.1 (four-eyes review e registros externos, iniciando pela decisão de build vs. buy — sem fornecedor definido no momento da ingestão).

## Baseline de Fase

`.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` é a base de aceite das Phases 2-10. Todo plano futuro precisa declarar:

1. Quais seções e itens do checklist cobre.
2. Quais itens do checklist permanecem fora de escopo e por quê.
3. Como valida a regra transversal de dados: nada de mock runtime no frontend; exemplos devem vir de `supabase/seed.sql` ou de `/api/v1`.
4. Quais fluxos/telas exigem evidência manual de UAT antes de marcar a fase como concluída.

## Phases

- [x] **Phase 1: backend-rebuild** - Reconstruir o backend, cobrir os fluxos do frontend dependentes de dados e preparar validação local/staging.
- [x] **Phase 2: public-transparency-and-profiles** - Fechar experiência pública, dossiê público de projeto, explorer, perfis públicos, cadastro por perfil e edição de perfil.
- [x] **Phase 3: project-origination-and-documents** - Completar originação do projeto com produtor, localização, metodologia, QTAGs/NFC, geofence, documentos e timeline canônica.
- [x] **Phase 4: certification-workbench** - Completar revisão da certificadora, decisão técnica, certificado/documento, histórico e orquestração para lastro/mint bloqueado.
- [x] **Phase 4.1: geospatial-foundation** *(inserida)* - Introduzir PostGIS e perímetro real (geometry), backfill dos QTAGs e overlap interno — pré-requisito comum do Integrity Layer e do Satellite Monitoring.
- [ ] **Phase 4.2: integrity-layer-foundation** *(inserida)* - Claim/Evidence/Conflict, estados de confiança, Risk Score e detecção de duplicidade — P0 do Sinarca Integrity Layer.
- [ ] **Phase 5: satellite-monitoring-and-field-audit** *(expandida)* - Completar auditoria de campo e monitoramento via Copernicus Sentinel-2 real (NDVI/NDMI/NBR, reconstrução histórica, anomalias), substituindo o baseline determinístico atual.
- [ ] **Phase 5.1: integrity-review-and-external-registries** *(inserida)* - Four-eyes review e verificação de registros oficiais (ONR/SIGEF/CAR) — começa pela decisão de build vs. buy, sem fornecedor definido hoje.
- [ ] **Phase 6: marketplace-wallet-and-retirement** - Completar checkout, carteira off-chain, histórico/exportação, recibos, aposentadoria real e certificado de impacto.
- [ ] **Phase 7: emissions-inventory-and-compensation** - Completar inventário de emissões, upload seguro pela UI, vínculo com compensação e dashboard emissões versus créditos.
- [ ] **Phase 8: treasury-blockchain-and-interoperability** - Criar consoles operacionais para tesouraria, providers, Soroban/Stellar, mint/unlock/transfer/burn e lock-and-mint Polygon.
- [ ] **Phase 9: admin-operations-and-observability** - Criar operação admin para usuários, organizações, eventos sensíveis, overrides, health/status e filas.
- [ ] **Phase 10: security-compliance-and-data-governance** - Fechar requisitos da Bible para segurança, LGPD/GDPR, DPO, retenção, AML/CFT, qualidade, acessibilidade, DR e auditoria externa.

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
- [x] 01-02: Criar `backend_app` FastAPI com configuração, health, auth própria Argon2/JWT e guards por papel.
- [x] 01-03: Criar schema Supabase, RLS mínima, seed completo e camada de dados.
- [x] 01-04: Implementar módulos operacionais persistentes da API v1 e remover mocks runtime do frontend.
- [x] 01-05: Implementar adapters blockchain/financeiros e smoke real de provedores sandbox/testnet.
- [x] 01-06: Preparar Docker/Dokploy, cutover sem fallback e documentação operacional.

### Phase 2: public-transparency-and-profiles
**Goal**: Fechar a experiência pública e de identidade básica usando dados persistidos: rotas públicas limpas, dossiê público completo de projeto, explorer de transações, perfis públicos por papel, cadastro por perfil, perfil editável, páginas legais/institucionais e estados de erro amigáveis.
**Depends on**: Phase 1
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seções 1 e 2.
  - Nenhum dado demonstrativo novo pode vir de mock runtime no frontend.
**Success Criteria** (what must be TRUE):
  1. Navegação pública e CTAs usam URLs limpas sem prefixo visível `/public`, mantendo apenas redirect de compatibilidade.
  2. `/projeto/:id` exibe histórico, QTAGs, baseline, certificação, auditoria, créditos, documentos e transações vindos de `/api/v1`.
  3. `/feed` ou explorer equivalente filtra por projeto, hash, tipo de evento, comprador e status.
  4. Perfis públicos de produtores, empresas, auditores e certificadoras vêm do banco/seed.
  5. Cadastro por perfil, edição de perfil completa e erros de auth/sessão/API estão cobertos na UI.
  6. Termos de Uso, Política de Privacidade, suporte jurídico, contato/DPO e posicionamento institucional ficam publicados com copy consistente: SINARCA é camada tecnológica complementar, não certificadora nem consultoria jurídica.
**Plans**: 5 plans

Plans:
- [x] 02-01: Fechar navegação pública, páginas legais e copy institucional.
- [x] 02-02: Criar contrato público de dossiê, transações e perfis.
- [x] 02-03: Completar dossiê público de projeto e explorer de transações.
- [x] 02-04: Completar perfis públicos, catálogos e rankings por papel.
- [x] 02-05: Completar cadastro por perfil, edição de perfil e erros amigáveis.

**Execution evidence**: `.planning/phases/02-public-transparency-and-profiles/02-VERIFICATION.md`

### Phase 3: project-origination-and-documents
**Goal**: Completar o fluxo do produtor/certificadora para cadastrar projeto com dados técnicos, cliente de campo web/PWA/mobile para QTAGs/NFC, geofence, documentos reais e timeline operacional.
**Depends on**: Phase 2
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seção 3.
  - `ProjectCreate.tags` deve ser usado pela UI, não apenas pelo backend.
**Success Criteria** (what must be TRUE):
  1. `AddProject` captura produtor responsável, município, estado, bioma, metodologia, área, estoque de carbono e documentos.
  2. O formulário exige exatamente 4 QTAGs/NFC com coordenadas, CMAC e vértices A/B/C/D.
  3. A UI exibe polígono/geofence real calculado a partir de `project_tags`.
  4. Documentos legais e inventário florestal são enviados, listados e vinculados ao projeto.
  5. Validação de SUN/CMAC, hash inicial de área e pontos de referência Sentinel-2 ficam explicitados no contrato ou como bloqueio técnico documentado.
  6. A timeline do projeto cobre o ciclo canônico de `CREATED` até `AVAILABLE`.
**Plans**: 5/5 plans executed

Plans:
**Wave 1**
- [x] 03-01: Fechar contrato backend de originação, documentos e timeline.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02: Transformar AddProject em wizard de originação com quatro QTAGs.
- [x] 03-03: Adicionar captura de campo fail-closed e preview de geofence.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 03-04: Implementar upload e listagem de documentos reais no fluxo de projeto.

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 03-05: Fechar dossiê, timeline, cobertura e UAT da originação.

**Execution evidence**: `.planning/phases/03-project-origination-and-documents/03-VERIFICATION.md`

### Phase 4: certification-workbench
**Goal**: Completar a bancada da certificadora com dossiê técnico, decisão auditável, certificado/documento e preparação de lastro/mint bloqueado.
**Depends on**: Phase 3
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seção 4.
  - Decisões de certificadora devem gerar trilha em `audit_events` ou equivalente.
**Success Criteria** (what must be TRUE):
  1. A certificadora abre revisão detalhada com baseline, documentos, QTAGs e cálculo de potencial.
  2. Aprovação/reprovação permite notas, metodologia, potencial de crédito e motivo estruturado.
  3. Certificado digital ou referência documental é registrado e exibido no projeto.
  4. Aprovação aciona ou prepara explicitamente o fluxo de lastro/mint bloqueado com status visível.
  5. Histórico de decisões por projeto fica disponível para certificadora e dossiê público quando aplicável.
**Plans**: 7 plans

Plans:
- [x] 04-01-PLAN.md — Fundação de dados (migration, modelos de pendência/tesouraria) e contrato de testes CERT-01..05.
- [x] 04-02-PLAN.md — Dossiê técnico da certificadora e minimização do dossiê público (serializadores público/interno).
- [x] 04-03-PLAN.md — Decisão multipart append-only com gate de dossiê mínimo e certificado PDF obrigatório.
- [x] 04-04-PLAN.md — Autorização atômica de lastro/mint bloqueado para a fila da tesouraria.
- [x] 04-05-PLAN.md — Filas com escopo e contador, linha do tempo filtrável e ciclo de resposta do produtor.
- [x] 04-06-PLAN.md — Bancada da certificadora no frontend: card expansível, seis abas e upload real do certificado.
- [x] 04-07-PLAN.md — Certificado e histórico no dossiê público e trilha interna completa para o produtor (D-13/D-22).

### Phase 04.1: geospatial-foundation (INSERTED)
**Goal**: Introduzir PostGIS e persistir o perímetro do projeto como `geometry` real (declared/field_verified/certified/active), com backfill dos QTAGs existentes a partir do algoritmo de ordenação/shoelace hoje usado em runtime e detecção interna de overlap via `ST_Intersects`/`ST_Area`. Pré-requisito comum para as Phases 04.2 (Integrity Layer) e 05 (Satellite Monitoring) — nenhuma das duas tem onde persistir geometria sem esta fase.
**Depends on**: Phase 4
**Requirements**:
  - `.planning/docs/bible/14_Novos_requisitos.md` seções 12-18 (Geospatial Integrity Engine, Canonical Geometry, validações geométricas, detecção de overlap).
  - `.planning/docs/bible/15_Geofance_sentinel_requisitos.md` seções 5-8 (Project Boundary, tipos de perímetro, validações geográficas, persistência geoespacial).
  - Migração de dados deve reaproveitar `project_tags` como origem de `declared_boundary`, sem duplicar ou substituir a tabela de QTAG/NFC físico.
**Success Criteria** (what must be TRUE):
  1. `postgis` está habilitado no Supabase e `project_boundaries` armazena `geometry(Polygon, 4326)` com colunas `declared_boundary`/`field_verified_boundary`/`certified_boundary`/`active_boundary`.
  2. Todo projeto com QTAGs existentes (Phase 3) tem `declared_boundary` populada via backfill, sem perda de área/vértices em relação ao cálculo shoelace anterior.
  3. `ST_IsValid`, autointerseção, vértices duplicados e divergência entre área declarada e calculada são validados no backend antes de persistir.
  4. `ST_Intersects`/`ST_Area` detectam overlap entre dois projetos do próprio Sinarca e calculam `overlapPercentage`.
  5. `ProjectGeofencePreview` (frontend) passa a renderizar a partir da geometria persistida, não do recálculo client-side dos 4 pontos.
**Plans**: 5 plans

Plans:
- [x] 04.1-01-PLAN.md — PostGIS habilitado, tabela `project_boundaries` (4 colunas geometry(Polygon,4326)) e backfill idempotente dos QTAGs existentes, com push do schema para o Postgres local (GEOF-01, GEOF-02).
- [x] 04.1-02-PLAN.md — Construção server-side do polígono reusando a ordenação por ângulo polar, bateria de validação PostGIS antes de persistir e escrita de declared/active boundary em create/update (GEOF-03).
- [x] 04.1-03-PLAN.md — Detecção interna de overlap via `ST_Intersects`/`ST_Area` com `overlapPercentage` e endpoint autenticado de leitura (GEOF-04).
- [x] 04.1-04-PLAN.md — Serializador GeoJSON (`ST_AsGeoJSON`) e campo `boundary` no dossiê público (minimizado) e na revisão da certificadora (completo) (GEOF-05).
- [x] 04.1-05-PLAN.md — `ProjectGeofencePreview` renderiza a geometria persistida em MrcaDetails e CertifierReview; wizard de originação segue no recálculo client-side, documentado (GEOF-05).

### Phase 04.2: integrity-layer-foundation (INSERTED)
**Goal**: Implementar o P0 do Sinarca Integrity Layer sobre a geometria real da Phase 04.1: entidades `Claim`/`Evidence`/`Conflict`, estados de confiança `DECLARED → IDENTITY_VERIFIED → EVIDENCE_VERIFIED → VERIFIED/ON_HOLD/SUSPENDED/REVOKED`, Risk Score 0-100 com sinais explicáveis e detecção de duplicidade/double claim internos ao Sinarca. Muda o princípio operacional do sistema de "dado enviado = fato" para "dado enviado = declaração até validação" — cross-cutting sobre Project (Phase 3), Certification (Phase 4) e Audit (Phase 5).
**Depends on**: Phase 04.1
**Requirements**:
  - `.planning/docs/bible/14_Novos_requisitos.md` seções 4-11, 19-23 (princípios de produto, entidades, estados de confiança, Double Claiming Engine, Duplicate Detection, Risk Engine, Risk Classes).
  - Reaproveitar `documents.sha256_hash` como base de `Evidence`; não recriar hashing de documento do zero.
  - `audit_events` permanece como trilha de auditoria genérica; `Evidence`/`Claim` não a substituem, se relacionam a ela.
**Success Criteria** (what must be TRUE):
  1. Toda submissão relevante (propriedade, metodologia, direito de operar) gera um registro `Claim` com `status` e `confidenceScore` próprios, sem promover `projects.status` diretamente a partir do input do usuário.
  2. `Evidence` referencia hash, origem, `validationMethod` e `validationStatus`, vinculada a um `Claim`.
  3. `Conflict` é gerado automaticamente quando `ST_Intersects` (Phase 04.1) encontra overlap acima do limiar configurável, com severidade `CLEAR → CRITICAL`.
  4. Risk Score é calculado com sinais explicáveis (ex.: "+30 SIGEF diverge da geometria") e projetos `CRITICAL` entram automaticamente em `ON_HOLD`.
  5. O status público do projeto nunca usa apenas "Certified" sem explicitar o que foi verificado, conforme `.planning/docs/bible/14_Novos_requisitos.md` seção 40.
**Plans**: 5 plans

Plans:
- [x] 04.2-01-PLAN.md — Schema do Integrity Layer: migrations claims/evidence/conflicts/risk_assessments/risk_signals, colunas `projects.integrity_status`/`risk_score`, modelos, constantes e limiares configuráveis (INTG-01..04).
- [x] 04.2-02-PLAN.md — `IntegrityService` de Claim/Evidence: Claims de originação `DECLARED`, Evidence a partir de `documents.sha256_hash`, 4 hooks de escrita e rotas org-scoped `/claims` e `/evidence` (INTG-01, INTG-02).
- [x] 04.2-03-PLAN.md — Conflict com severidade `CLEAR→CRITICAL` sobre o overlap da Phase 04.1, re-derivação a cada mudança de geometria, DOUBLE_CLAIM restrito a pares sobrepostos e rota `/conflicts` (INTG-03).
- [ ] 04.2-04-PLAN.md — Risk Engine puro e explicável, persistência append-only em `risk_assessments`/`risk_signals`, Auto Hold em `ON_HOLD` e rota `/integrity` (INTG-04).
- [ ] 04.2-05-PLAN.md — Bloco `integrity` minimizado no dossiê público e vocabulário D-16 em `MrcaDetails.tsx`, sem Trust Badge completo (INTG-05).

### Phase 5: satellite-monitoring-and-field-audit
*(expandida — antes "audit-monitoring-and-anomalies"; escopo de satélite incorporado a partir de `.planning/docs/bible/15_Geofance_sentinel_requisitos.md`)*
**Goal**: Completar auditoria de campo e monitoramento ambiental com evidência satelital real: cliente de campo web/PWA/mobile, evidências reais, assinatura verificável, e reconstrução histórica + monitoramento contínuo via Copernicus Sentinel-2 sobre a geometria da Phase 04.1 (NDVI/NDMI/NBR, baseline, anomalias, bloqueio automático, notificação, desbloqueio auditável). Substitui o baseline hoje determinístico (`deterministic_baseline()`, derivado de hash do nome do projeto) por observação satelital real, alimentando `Evidence` da Phase 04.2.
**Depends on**: Phase 04.2
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seções 5 e 6.
  - `.planning/docs/bible/15_Geofance_sentinel_requisitos.md` completo (Project Boundary como AOI, integração Copernicus, STAC, Statistical API, NDVI/NDMI/NBR, reconstrução histórica, anomalias, monitoramento contínuo).
  - Evidências não podem usar `mock://` como operação real; baseline não pode mais ser gerado por `deterministic_baseline()`.
  - Introduzir a primeira infraestrutura assíncrona do backend (scheduler leve, ex. APScheduler in-process) para reconstrução histórica e job diário de monitoramento — não bloquear a Statistical API na request HTTP síncrona.
**Success Criteria** (what must be TRUE):
  1. Auditoria aceita fotos, vídeos, geolocalização, observações e laudo com upload real em experiência de campo.
  2. Assinatura digital/biométrica ou stub verificável é registrada pelo backend.
  3. Laudo e evidências aparecem no projeto interno e no dossiê público conforme regra de visibilidade.
  4. Auditoria pode reler QTAGs/NFC para validar integridade física da demarcação quando o ambiente/hardware permitir.
  5. `CopernicusProvider` reconstrói ao menos 5 anos de histórico NDVI mensal para a AOI (`project_boundaries.active_boundary`) e persiste `SatelliteObservation`.
  6. Anomalias (`SatelliteAnomaly`) são detectadas por queda significativa de NDVI, nunca rotuladas automaticamente como `DEFORESTATION`, e geram `ProjectEvent` com estado `DETECTED → ANALYZED → CONFIRMED/DISMISSED`.
  7. Monitoramento exibe baseline Sentinel-2 real, NDVI médio, pontos analisados e hash de referência — sem nenhum campo derivado de `deterministic_baseline()`.
  8. Anomalias confirmadas bloqueiam projeto automaticamente, notificam papéis envolvidos e liberam desbloqueio após auditoria aprovada.
  9. Recálculo de créditos após incidente ajusta disponibilidade e prepara ajuste de tokens quando aplicável.
  10. Job de monitoramento roda periodicamente sem bloquear requests HTTP, respeita `maxCloudCoverage` configurável e é idempotente por `projectId + satellite + sceneId + processingVersion`.
**Plans**: Not planned yet

### Phase 05.1: integrity-review-and-external-registries (INSERTED)
**Goal**: Fechar o P1 do Sinarca Integrity Layer: Integrity Review Console com regra de four-eyes para risco HIGH+ (nenhum ator único pode submeter, validar e aprovar o mesmo projeto), e verificação de registros oficiais (ONR/CNM, SIGEF/INCRA, CAR/SICAR) via uma interface `ExternalRegistryProvider` desacoplada — análoga em desenho ao `SatelliteProvider` da Phase 5. O Sinarca hoje **não tem acesso a nenhum provedor desse tipo** (ex.: geoportal InfoTerras-like); a primeira entrega desta fase é a decisão de build vs. buy documentada, não a integração em si.
**Depends on**: Phase 04.2
**Requirements**:
  - `.planning/docs/bible/14_Novos_requisitos.md` seções 10, 25-27 (Validação fundiária, Human Review, Four-Eyes Principle, Independent Verification).
  - Decisão de fornecedor (geoportal terceirizado tipo InfoTerras vs. integração direta com ONR/SIGEF/CAR vs. postergar) deve ficar registrada em `PROJECT.md` antes de qualquer plano de execução desta fase.
  - `ExternalRegistryProvider` deve seguir o mesmo padrão de `assert_ready()` fail-closed já usado nos adapters blockchain (`backend_app/adapters/stellar.py`).
**Success Criteria** (what must be TRUE):
  1. Decisão de build vs. buy para verificação de registros externos está documentada, com fornecedor(es) avaliado(s) e escopo do MVP definido.
  2. Interface `ExternalRegistryProvider` existe e tem ao menos uma implementação (real ou explicitamente bloqueada por credenciais ausentes, seguindo o padrão fail-closed do projeto).
  3. Projetos com Risk Score HIGH ou superior exigem aprovação de dois revisores distintos (`require_role` atual evolui de ator único para dupla revisão).
  4. Integrity Review Console exibe projeto, mapa, documentos, conflitos, fontes externas, risk score e justificativas, com ações `APPROVE/REQUEST_EVIDENCE/ON_HOLD/REJECT/ESCALATE/SUSPEND`.
  5. Trust Badge no status público do projeto reflete exatamente quais checks (Identity/Land Evidence/Geofence/Overlap/Rights/Independent Audit) passaram, sem usar "Certified" isolado.
**Plans**: Not planned yet

Plans:
- [ ] TBD (run /gsd-plan-phase 05.1 to break down)

### Phase 6: marketplace-wallet-and-retirement
**Goal**: Completar marketplace, carteira off-chain e aposentadoria de créditos para empresas e cidadãos com checkout real, pagamento/settlement quando no escopo, ledger navegável, recibos, validação de saldo e certificado de impacto.
**Depends on**: Phase 5
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seções 7, 8 e 9.
  - Compras e aposentadorias devem permanecer registradas no ledger off-chain.
**Success Criteria** (what must be TRUE):
  1. Compra mostra quantidade, preço unitário, taxa, total, confirmação e erros amigáveis.
  2. Estoque/saldo é exibido por projeto, vintage e lote quando aplicável.
  3. "Meus Créditos" mostra carteira por projeto/vintage, histórico completo, filtros e exportação.
  4. Detalhe de transação usa endpoint próprio por hash/ID e serve como recibo navegável.
  5. Aposentadoria usa formulário real, pré-valida saldo, registra burn/hash/certificado e mostra histórico por empresa.
  6. Integração de pagamento ou modo de settlement explicitamente definido substitui qualquer simulação silenciosa de compra.
**Plans**: Not planned yet

### Phase 7: emissions-inventory-and-compensation
**Goal**: Completar inventário de emissões e sua ligação com compensação, removendo cálculos locais desconectados da API.
**Depends on**: Phase 6
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seção 10.
  - Upload de documentação deve usar validação segura do backend.
**Success Criteria** (what must be TRUE):
  1. Inventário captura emissões por escopo, período e documentação persistida.
  2. UI chama `/inventory/declare` e `/inventory/upload` com validações de tipo/tamanho refletidas na tela.
  3. Inventário persistido pode iniciar ou recomendar fluxo de compensação.
  4. Dashboard cruza emissões declaradas, créditos comprados e créditos aposentados.
  5. Nenhum resumo de inventário crítico depende apenas de estado local do frontend.
**Plans**: Not planned yet

### Phase 8: treasury-blockchain-and-interoperability
**Goal**: Operacionalizar tesouraria, provider status e interoperabilidade blockchain em telas/admin, sem simular sucesso quando faltam credenciais.
**Depends on**: Phase 6
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seção 11.
  - Providers externos sem credenciais devem falhar fechado e aparecer como bloqueio visual/operacional.
**Success Criteria** (what must be TRUE):
  1. Admin vê status de tesouraria, lastro Etherfuse/Tesouro, yield 90/10 e histórico de harvest.
  2. Admin opera ou acompanha mint bloqueado, unlock, transfer e burn com status de execução.
  3. Projetos exibem status Stellar/Soroban real e removem textos legados de rede incorreta.
  4. Fluxo lock-and-mint Polygon para projeto externo existe em UI protegida.
  5. Painel de providers mostra credenciais ausentes, bloqueios e smoke status por ambiente.
**Plans**: Not planned yet

### Phase 9: admin-operations-and-observability
**Goal**: Criar console operacional admin para gestão, auditoria, reprocessamento controlado e saúde do sistema.
**Depends on**: Phase 2
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seção 12.
  - Operações sensíveis devem deixar trilha auditável.
**Success Criteria** (what must be TRUE):
  1. Dashboard admin operacional resume usuários, organizações, projetos, ledger, providers e filas.
  2. Admin gerencia usuários, papéis e organizações sem cadastro público de admin.
  3. Eventos sensíveis em `audit_events` são pesquisáveis por ator, entidade, tipo e período.
  4. Reprocessamento/manual override de projeto, ledger e status exige motivo e cria evento compensatório.
  5. Health/status cobre API, Postgres, providers, filas, jobs e notificações em tela protegida.
  6. Runbooks de suporte/manutenção e resposta a incidentes operacionais ficam vinculados ao console.
**Plans**: Not planned yet

### Phase 10: security-compliance-and-data-governance
**Goal**: Fechar os requisitos transversais da Bible que não pertencem a uma tela única: segurança, privacidade, governança de dados, compliance regulatório, qualidade, acessibilidade, resiliência e auditoria externa.
**Depends on**: Phase 2
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` regra transversal e efeitos de segurança/compliance dos fluxos 1-12.
  - `.planning/docs/bible/02_Requisitos_Funcionais_e_Nao_Funcionais.md`.
  - `.planning/docs/bible/07_Seguranca_Compliance_e_Qualidade.md`.
  - `.planning/docs/bible/08_Como_Operamos_Dados.md`.
  - `.planning/docs/bible/09_Auditoria_e_Compliance.md`.
  - `.planning/docs/bible/10_Termos_de_Uso.md`, `11_Suporte_Juridico.md` e `12_Politica_de_Privacidade.md`.
  - `.planning/docs/BIBLE_PHASE_COVERAGE_AUDIT.md`.
**Success Criteria** (what must be TRUE):
  1. LGPD/GDPR tem fluxo operacional para direitos do titular, DPO/contato, consentimento, retenção, exclusão/anonimização off-chain e limitação de dados on-chain.
  2. Segurança cobre MFA por papel, RBAC mínimo privilégio, gerenciamento de segredos, HSM/KMS ou bloqueio explícito, criptografia em trânsito/repouso e plano para PQC quando aplicável.
  3. Compliance cobre AML/CFT/KYC ou decisão documentada de escopo para pagamentos/tokens, prevenção a fraude, dupla contagem e greenwashing.
  4. Qualidade cobre acessibilidade, desempenho crítico, disponibilidade, backup/DR, monitoramento, logging, CI/CD, varredura de vulnerabilidades e testes de segurança.
  5. Auditoria externa e smart contract audit têm evidências, runbooks ou bloqueios explícitos antes de produção.
**Plans**: Not planned yet

## Auxiliary Documents

- `.planning/phases/01-backend-rebuild/DEPLOYMENT-GUIDE.md`
- `.planning/phases/01-backend-rebuild/PYTHON-IMPLEMENTATION-GUIDE.md`
- `.planning/phases/01-backend-rebuild/NODE-IMPLEMENTATION-GUIDE.md`
- `.planning/phases/02-public-transparency-and-profiles/02-DISCUSSION-LOG.md`
- `.planning/phases/02-public-transparency-and-profiles/02-RESEARCH.md`
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`
- `.planning/docs/BIBLE_PHASE_COVERAGE_AUDIT.md`

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. backend-rebuild | 6/6 | Complete | 2026-05-22 |
| 2. public-transparency-and-profiles | 5/5 | Complete | 2026-05-26 |
| 3. project-origination-and-documents | 5/5 | Complete | 2026-05-26 |
| 4. certification-workbench | 0/0 | Not planned | - |
| 4.1. geospatial-foundation | 0/0 | Not planned | - |
| 4.2. integrity-layer-foundation | 0/0 | Not planned | - |
| 5. satellite-monitoring-and-field-audit | 0/0 | Not planned | - |
| 5.1. integrity-review-and-external-registries | 0/0 | Not planned | - |
| 6. marketplace-wallet-and-retirement | 0/0 | Not planned | - |
| 7. emissions-inventory-and-compensation | 0/0 | Not planned | - |
| 8. treasury-blockchain-and-interoperability | 0/0 | Not planned | - |
| 9. admin-operations-and-observability | 0/0 | Not planned | - |
| 10. security-compliance-and-data-governance | 0/0 | Not planned | - |
