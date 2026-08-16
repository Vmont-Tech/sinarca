# Requirements: SINARCA

**Defined:** 2026-08-14 (retroativo — consolidado a partir de `.planning/ROADMAP.md`, `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` e `.planning/PROJECT.md`)
**Core Value:** Sustentar os fluxos operacionais de créditos ambientais com API persistente, autenticação própria, ledger off-chain, integrações sandbox/testnet, deploy verificável e experiências completas por papel.

> Cada requisito abaixo é um Success Criterion já declarado em `.planning/ROADMAP.md` por fase, convertido em ID rastreável. Fases 1-3 estão marcadas concluídas porque já têm `VALIDATION.md`/`VERIFICATION.md` auditados (2026-08-14). As demais refletem o roadmap de 13 fases do milestone v1.0 (inclui as fases 4.1, 4.2 e 5.1 inseridas em 2026-08-14 pela ingestão do Sinarca Integrity Layer e do Satellite Monitoring).

## v1 Requirements

Requisitos do milestone v1.0. Cada um mapeia para exatamente uma fase do roadmap.

### Base Técnica (Phase 1 — backend-rebuild)

- [x] **BASE-01**: Frontend autentica contra a API nova e consome dados reais/persistidos para todos os fluxos dependentes de dados.
- [x] **BASE-02**: `supabase db push` real aplica schema e seed idempotente no Supabase.
- [x] **BASE-03**: Marketplace, compra, aposentadoria, certificação, auditoria, inventário, transações e mapas funcionam via `/api/v1`.
- [x] **BASE-04**: Soroban testnet tem deploy/invoke/status documentado; Etherfuse/Polygon têm tentativa real ou bloqueio externo documentado.
- [x] **BASE-05**: Dokploy publica API e web com `/health`, login e frontend consumindo `backend_app`.

### Transparência Pública e Perfis (Phase 2 — public-transparency-and-profiles)

- [x] **PUBL-01**: Navegação pública e CTAs usam URLs limpas sem prefixo visível `/public`, mantendo apenas redirect de compatibilidade.
- [x] **PUBL-02**: `/projeto/:id` exibe histórico, QTAGs, baseline, certificação, auditoria, créditos, documentos e transações vindos de `/api/v1`.
- [x] **PUBL-03**: `/feed` ou explorer equivalente filtra por projeto, hash, tipo de evento, comprador e status.
- [x] **PUBL-04**: Perfis públicos de produtores, empresas, auditores e certificadoras vêm do banco/seed.
- [x] **PUBL-05**: Cadastro por perfil, edição de perfil completa e erros de auth/sessão/API estão cobertos na UI.
- [x] **PUBL-06**: Termos de Uso, Política de Privacidade, suporte jurídico, contato/DPO e posicionamento institucional ficam publicados com copy consistente: SINARCA é camada tecnológica complementar, não certificadora nem consultoria jurídica.

### Originação do Projeto (Phase 3 — project-origination-and-documents)

- [x] **ORIG-01**: `AddProject` captura produtor responsável, município, estado, bioma, metodologia, área, estoque de carbono e documentos.
- [x] **ORIG-02**: O formulário exige exatamente 4 QTAGs/NFC com coordenadas, CMAC e vértices A/B/C/D.
- [x] **ORIG-03**: A UI exibe polígono/geofence real calculado a partir de `project_tags`.
- [x] **ORIG-04**: Documentos legais e inventário florestal são enviados, listados e vinculados ao projeto.
- [x] **ORIG-05**: Validação de SUN/CMAC, hash inicial de área e pontos de referência Sentinel-2 ficam explicitados no contrato ou como bloqueio técnico documentado.
- [x] **ORIG-06**: A timeline do projeto cobre o ciclo canônico de `CREATED` até `AVAILABLE`.

### Bancada da Certificadora (Phase 4 — certification-workbench)

- [x] **CERT-01**: A certificadora abre revisão detalhada com baseline, documentos, QTAGs e cálculo de potencial.
- [x] **CERT-02**: Aprovação/reprovação permite notas, metodologia, potencial de crédito e motivo estruturado.
- [x] **CERT-03**: Certificado digital ou referência documental é registrado e exibido no projeto.
- [x] **CERT-04**: Aprovação aciona ou prepara explicitamente o fluxo de lastro/mint bloqueado com status visível.
- [x] **CERT-05**: Histórico de decisões por projeto fica disponível para certificadora e dossiê público quando aplicável.

### Fundação Geoespacial (Phase 4.1 — geospatial-foundation) *(inserida 2026-08-14)*

- [x] **GEOF-01**: `postgis` está habilitado no Supabase e `project_boundaries` armazena `geometry(Polygon, 4326)` com colunas `declared_boundary`/`field_verified_boundary`/`certified_boundary`/`active_boundary`.
- [x] **GEOF-02**: Todo projeto com QTAGs existentes (Phase 3) tem `declared_boundary` populada via backfill, sem perda de área/vértices em relação ao cálculo shoelace anterior.
- [x] **GEOF-03**: `ST_IsValid`, autointerseção, vértices duplicados e divergência entre área declarada e calculada são validados no backend antes de persistir.
- [x] **GEOF-04**: `ST_Intersects`/`ST_Area` detectam overlap entre dois projetos do próprio Sinarca e calculam `overlapPercentage`.
- [x] **GEOF-05**: `ProjectGeofencePreview` (frontend) passa a renderizar a partir da geometria persistida, não do recálculo client-side dos 4 pontos.

### Fundação do Integrity Layer (Phase 4.2 — integrity-layer-foundation) *(inserida 2026-08-14)*

- [ ] **INTG-01**: Toda submissão relevante (propriedade, metodologia, direito de operar) gera um registro `Claim` com `status` e `confidenceScore` próprios, sem promover `projects.status` diretamente a partir do input do usuário. *(schema pronto na Plan 04.2-01; lógica de criação de Claim é a Plan 04.2-02)*
- [ ] **INTG-02**: `Evidence` referencia hash, origem, `validationMethod` e `validationStatus`, vinculada a um `Claim`. *(schema pronto na Plan 04.2-01; lógica de criação de Evidence é a Plan 04.2-02)*
- [ ] **INTG-03**: `Conflict` é gerado automaticamente quando `ST_Intersects` (Phase 4.1) encontra overlap acima do limiar configurável, com severidade `CLEAR → CRITICAL`. *(schema pronto na Plan 04.2-01; geração de Conflict é a Plan 04.2-03)*
- [ ] **INTG-04**: Risk Score é calculado com sinais explicáveis (ex.: "+30 SIGEF diverge da geometria") e projetos `CRITICAL` entram automaticamente em `ON_HOLD`. *(schema pronto na Plan 04.2-01; Risk Engine é a Plan 04.2-04)*
- [ ] **INTG-05**: O status público do projeto nunca usa apenas "Certified" sem explicitar o que foi verificado.

### Monitoramento Satelital e Auditoria de Campo (Phase 5 — satellite-monitoring-and-field-audit) *(expandida 2026-08-14)*

- [ ] **SATM-01**: Auditoria aceita fotos, vídeos, geolocalização, observações e laudo com upload real em experiência de campo.
- [ ] **SATM-02**: Assinatura digital/biométrica ou stub verificável é registrada pelo backend.
- [ ] **SATM-03**: Laudo e evidências aparecem no projeto interno e no dossiê público conforme regra de visibilidade.
- [ ] **SATM-04**: Auditoria pode reler QTAGs/NFC para validar integridade física da demarcação quando o ambiente/hardware permitir.
- [ ] **SATM-05**: `CopernicusProvider` reconstrói ao menos 5 anos de histórico NDVI mensal para a AOI (`project_boundaries.active_boundary`) e persiste `SatelliteObservation`.
- [ ] **SATM-06**: Anomalias (`SatelliteAnomaly`) são detectadas por queda significativa de NDVI, nunca rotuladas automaticamente como `DEFORESTATION`, e geram `ProjectEvent` com estado `DETECTED → ANALYZED → CONFIRMED/DISMISSED`.
- [ ] **SATM-07**: Monitoramento exibe baseline Sentinel-2 real, NDVI médio, pontos analisados e hash de referência — sem nenhum campo derivado de `deterministic_baseline()`.
- [ ] **SATM-08**: Anomalias confirmadas bloqueiam projeto automaticamente, notificam papéis envolvidos e liberam desbloqueio após auditoria aprovada.
- [ ] **SATM-09**: Recálculo de créditos após incidente ajusta disponibilidade e prepara ajuste de tokens quando aplicável.
- [ ] **SATM-10**: Job de monitoramento roda periodicamente sem bloquear requests HTTP, respeita `maxCloudCoverage` configurável e é idempotente por `projectId + satellite + sceneId + processingVersion`.

### Revisão de Integridade e Registros Externos (Phase 5.1 — integrity-review-and-external-registries) *(inserida 2026-08-14)*

- [ ] **REVW-01**: Decisão de build vs. buy para verificação de registros externos está documentada, com fornecedor(es) avaliado(s) e escopo do MVP definido.
- [ ] **REVW-02**: Interface `ExternalRegistryProvider` existe e tem ao menos uma implementação (real ou explicitamente bloqueada por credenciais ausentes, seguindo o padrão fail-closed do projeto).
- [ ] **REVW-03**: Projetos com Risk Score HIGH ou superior exigem aprovação de dois revisores distintos (four-eyes).
- [ ] **REVW-04**: Integrity Review Console exibe projeto, mapa, documentos, conflitos, fontes externas, risk score e justificativas, com ações `APPROVE/REQUEST_EVIDENCE/ON_HOLD/REJECT/ESCALATE/SUSPEND`.
- [ ] **REVW-05**: Trust Badge no status público do projeto reflete exatamente quais checks (Identity/Land Evidence/Geofence/Overlap/Rights/Independent Audit) passaram, sem usar "Certified" isolado.

### Marketplace, Carteira e Aposentadoria (Phase 6 — marketplace-wallet-and-retirement)

- [ ] **MKTP-01**: Compra mostra quantidade, preço unitário, taxa, total, confirmação e erros amigáveis.
- [ ] **MKTP-02**: Estoque/saldo é exibido por projeto, vintage e lote quando aplicável.
- [ ] **MKTP-03**: "Meus Créditos" mostra carteira por projeto/vintage, histórico completo, filtros e exportação.
- [ ] **MKTP-04**: Detalhe de transação usa endpoint próprio por hash/ID e serve como recibo navegável.
- [ ] **MKTP-05**: Aposentadoria usa formulário real, pré-valida saldo, registra burn/hash/certificado e mostra histórico por empresa.
- [ ] **MKTP-06**: Integração de pagamento ou modo de settlement explicitamente definido substitui qualquer simulação silenciosa de compra.

### Inventário de Emissões e Compensação (Phase 7 — emissions-inventory-and-compensation)

- [ ] **INVT-01**: Inventário captura emissões por escopo, período e documentação persistida.
- [ ] **INVT-02**: UI chama `/inventory/declare` e `/inventory/upload` com validações de tipo/tamanho refletidas na tela.
- [ ] **INVT-03**: Inventário persistido pode iniciar ou recomendar fluxo de compensação.
- [ ] **INVT-04**: Dashboard cruza emissões declaradas, créditos comprados e créditos aposentados.
- [ ] **INVT-05**: Nenhum resumo de inventário crítico depende apenas de estado local do frontend.

### Tesouraria, Blockchain e Interoperabilidade (Phase 8 — treasury-blockchain-and-interoperability)

- [ ] **TRES-01**: Admin vê status de tesouraria, lastro Etherfuse/Tesouro, yield 90/10 e histórico de harvest.
- [ ] **TRES-02**: Admin opera ou acompanha mint bloqueado, unlock, transfer e burn com status de execução.
- [ ] **TRES-03**: Projetos exibem status Stellar/Soroban real e removem textos legados de rede incorreta.
- [ ] **TRES-04**: Fluxo lock-and-mint Polygon para projeto externo existe em UI protegida.
- [ ] **TRES-05**: Painel de providers mostra credenciais ausentes, bloqueios e smoke status por ambiente.

### Operação Admin e Observabilidade (Phase 9 — admin-operations-and-observability)

- [ ] **ADMN-01**: Dashboard admin operacional resume usuários, organizações, projetos, ledger, providers e filas.
- [ ] **ADMN-02**: Admin gerencia usuários, papéis e organizações sem cadastro público de admin.
- [ ] **ADMN-03**: Eventos sensíveis em `audit_events` são pesquisáveis por ator, entidade, tipo e período.
- [ ] **ADMN-04**: Reprocessamento/manual override de projeto, ledger e status exige motivo e cria evento compensatório.
- [ ] **ADMN-05**: Health/status cobre API, Postgres, providers, filas, jobs e notificações em tela protegida.
- [ ] **ADMN-06**: Runbooks de suporte/manutenção e resposta a incidentes operacionais ficam vinculados ao console.

### Segurança, Compliance e Governança de Dados (Phase 10 — security-compliance-and-data-governance)

- [ ] **SECG-01**: LGPD/GDPR tem fluxo operacional para direitos do titular, DPO/contato, consentimento, retenção, exclusão/anonimização off-chain e limitação de dados on-chain.
- [ ] **SECG-02**: Segurança cobre MFA por papel, RBAC mínimo privilégio, gerenciamento de segredos, HSM/KMS ou bloqueio explícito, criptografia em trânsito/repouso e plano para PQC quando aplicável.
- [ ] **SECG-03**: Compliance cobre AML/CFT/KYC ou decisão documentada de escopo para pagamentos/tokens, prevenção a fraude, dupla contagem e greenwashing.
- [ ] **SECG-04**: Qualidade cobre acessibilidade, desempenho crítico, disponibilidade, backup/DR, monitoramento, logging, CI/CD, varredura de vulnerabilidades e testes de segurança.
- [ ] **SECG-05**: Auditoria externa e smart contract audit têm evidências, runbooks ou bloqueios explícitos antes de produção.

## v2 Requirements

Nenhum item foi formalmente deferido para v2 até o momento — o roadmap atual (13 fases) cobre o milestone v1.0 inteiro. Itens de UX identificados na auditoria de checklist (`.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`) que ainda não têm fase própria devem ser adicionados aqui se surgirem antes de virar requisito v1.

## Out of Scope

Nenhuma exclusão explícita documentada até o momento. Itens adiados para uma fase futura específica (ex.: "MFA, RBAC avançado e governança completa de privacidade ficam na Phase 10", citado no plano `02-05-PLAN.md`) são tratados como *mapeados para outra fase*, não como fora de escopo do produto.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BASE-01..05 | Phase 1 | Complete |
| PUBL-01..06 | Phase 2 | Complete |
| ORIG-01..06 | Phase 3 | Complete |
| CERT-01..05 | Phase 4 | Complete |
| GEOF-01..05 | Phase 4.1 | Pending |
| INTG-01..05 | Phase 4.2 | Pending |
| SATM-01..10 | Phase 5 | Pending |
| REVW-01..05 | Phase 5.1 | Pending |
| MKTP-01..06 | Phase 6 | Pending |
| INVT-01..05 | Phase 7 | Pending |
| TRES-01..05 | Phase 8 | Pending |
| ADMN-01..06 | Phase 9 | Pending |
| SECG-01..05 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 74 total
- Mapped to phases: 74
- Unmapped: 0 ✓
- Completos (Phases 1-3): 17
- Pendentes (Phases 4-10): 57

---
*Requirements defined: 2026-08-14*
*Last updated: 2026-08-14 — consolidação retroativa a partir de ROADMAP.md, FLOW_SCREEN_CHECKLIST_AUDIT.md e PROJECT.md; Phases 1-3 marcadas Complete após auditoria Nyquist (01-VALIDATION.md, 02-VALIDATION.md, 03-VALIDATION.md) do mesmo dia.*
