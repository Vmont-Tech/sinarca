# Roadmap: SINARCA

## Overview

O ciclo atual separa a base técnica do fechamento de produto. A Phase 1 permanece limitada à reconstrução do backend do SINARCA, saindo do MVP em memória para uma base operacional com API persistente, auth própria, Supabase Postgres, adapters financeiros/blockchain e deploy verificável.

A auditoria de checklist de 2026-05-26 identificou lacunas de fluxo, tela e operação que deixariam a Phase 1 extensa demais. A conferência contra `.planning/docs/bible/` adicionou os requisitos transversais de segurança, compliance, privacidade, governança de dados, qualidade e operação. Esses itens passam a ser programados como fases próprias a partir da Phase 2, preservando a Phase 1 como fundação concluída.

## Baseline de Fase

`.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` é a base de aceite das Phases 2-10. Todo plano futuro precisa declarar:

1. Quais seções e itens do checklist cobre.
2. Quais itens do checklist permanecem fora de escopo e por quê.
3. Como valida a regra transversal de dados: nada de mock runtime no frontend; exemplos devem vir de `supabase/seed.sql` ou de `/api/v1`.
4. Quais fluxos/telas exigem evidência manual de UAT antes de marcar a fase como concluída.

## Phases

- [x] **Phase 1: backend-rebuild** - Reconstruir o backend, cobrir os fluxos do frontend dependentes de dados e preparar validação local/staging.
- [ ] **Phase 2: public-transparency-and-profiles** - Fechar experiência pública, dossiê público de projeto, explorer, perfis públicos, cadastro por perfil e edição de perfil.
- [ ] **Phase 3: project-origination-and-documents** - Completar originação do projeto com produtor, localização, metodologia, QTAGs/NFC, geofence, documentos e timeline canônica.
- [ ] **Phase 4: certification-workbench** - Completar revisão da certificadora, decisão técnica, certificado/documento, histórico e orquestração para lastro/mint bloqueado.
- [ ] **Phase 5: audit-monitoring-and-anomalies** - Completar auditoria de campo, evidências, assinatura verificável, monitoramento NDVI, anomalias, bloqueio e desbloqueio auditável.
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
- [ ] 02-01: Fechar navegação pública, páginas legais e copy institucional.
- [ ] 02-02: Criar contrato público de dossiê, transações e perfis.
- [ ] 02-03: Completar dossiê público de projeto e explorer de transações.
- [ ] 02-04: Completar perfis públicos, catálogos e rankings por papel.
- [ ] 02-05: Completar cadastro por perfil, edição de perfil e erros amigáveis.

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
**Plans**: Not planned yet

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
**Plans**: Not planned yet

### Phase 5: audit-monitoring-and-anomalies
**Goal**: Completar auditoria de campo e monitoramento ambiental: cliente de campo web/PWA/mobile, evidências reais, assinatura verificável, NDVI/baseline, anomalias, bloqueio automático, notificação e desbloqueio auditável.
**Depends on**: Phase 4
**Requirements**:
  - `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seções 5 e 6.
  - Evidências não podem usar `mock://` como operação real.
**Success Criteria** (what must be TRUE):
  1. Auditoria aceita fotos, vídeos, geolocalização, observações e laudo com upload real em experiência de campo.
  2. Assinatura digital/biométrica ou stub verificável é registrada pelo backend.
  3. Laudo e evidências aparecem no projeto interno e no dossiê público conforme regra de visibilidade.
  4. Auditoria pode reler QTAGs/NFC para validar integridade física da demarcação quando o ambiente/hardware permitir.
  5. Monitoramento exibe baseline Sentinel-2, NDVI médio, pontos analisados e hash de referência.
  6. Anomalias são registradas/listadas, bloqueiam projeto automaticamente, notificam papéis envolvidos e liberam desbloqueio após auditoria aprovada.
  7. Recálculo de créditos após incidente ajusta disponibilidade e prepara ajuste de tokens quando aplicável.
**Plans**: Not planned yet

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
| 2. public-transparency-and-profiles | 0/5 | Planned | - |
| 3. project-origination-and-documents | 0/0 | Not planned | - |
| 4. certification-workbench | 0/0 | Not planned | - |
| 5. audit-monitoring-and-anomalies | 0/0 | Not planned | - |
| 6. marketplace-wallet-and-retirement | 0/0 | Not planned | - |
| 7. emissions-inventory-and-compensation | 0/0 | Not planned | - |
| 8. treasury-blockchain-and-interoperability | 0/0 | Not planned | - |
| 9. admin-operations-and-observability | 0/0 | Not planned | - |
| 10. security-compliance-and-data-governance | 0/0 | Not planned | - |
