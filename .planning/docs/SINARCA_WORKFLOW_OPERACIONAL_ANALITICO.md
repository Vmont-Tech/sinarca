# Workflow Operacional Analítico — SINARCA

**Status:** leitura analítica do sistema completo
**Base:** documentação existente, roadmap, verificações de fase, checklist operacional, Bible técnica e fluxo operacional completo
**Última atualização:** 2026-08-18

Copyright (c) 2026 SINARCA. Todos os direitos reservados. Este documento consolida visão de produto, arquitetura, estado de execução, lacunas e próximos milestones sugeridos para uso interno. O conteúdo não substitui parecer jurídico, metodologia de certificação, auditoria independente ou decisão regulatória. Reprodução, distribuição ou uso externo dependem de autorização formal da SINARCA.

## 1. Sumário Executivo

O SINARCA é uma plataforma de rastreabilidade e integridade para créditos ambientais. Sua função é organizar o ciclo operacional de um ativo ambiental desde cadastro, demarcação, documentação, validação, auditoria, monitoramento, comercialização e aposentadoria até trilha auditável e integração blockchain.

A leitura dos documentos mostra uma evolução importante:

- A visão original do sistema já descrevia um ciclo completo de produtor, certificadora, auditor, marketplace, compra e burn.
- O roadmap v1.0 transformou essa visão em 13 fases.
- As fases 01 a 05 foram executadas e verificadas, incluindo as fases inseridas 04.1 e 04.2.
- O sistema atual já tem uma fundação operacional real, mas a experiência de produto e os fluxos pós-monitoramento ainda precisam de refinamento forte.
- QID e Selo Sinarca devem permanecer como uma evolução específica dentro da camada de integridade, não como substituto do documento sistêmico.

## 2. Fontes Lidas

| Fonte | Uso nesta leitura |
| --- | --- |
| `.planning/PROJECT.md` | Core value, milestone atual e decisões-chave |
| `.planning/ROADMAP.md` | Fases, objetivos, critérios de sucesso e progresso |
| `.planning/STATE.md` | Estado atual do milestone e próxima fase |
| `.planning/REQUIREMENTS.md` | Requisitos rastreáveis por fase |
| `.planning/docs/BLUEPRINT_V1.md` | Separação público/painel, papéis e UX esperada |
| `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` | Lacunas de fluxo/tela e matriz de fases |
| `.planning/docs/BIBLE_PHASE_COVERAGE_AUDIT.md` | Cobertura dos documentos da Bible no roadmap |
| `.planning/docs/PROJECT_LIFECYCLE_ONBOARDING.md` | Jornada do ativo ambiental |
| `.planning/docs/Fluxo_Operacional_Completo.pdf` | Fluxo operacional original completo |
| `.planning/docs/bible/03_Arquitetura_Tecnica_Detalhada.md` | Camadas técnicas, satélite, NFC, backend, blockchain e apresentação |
| `.planning/docs/bible/05_Fluxos_de_Negocio_e_Casos_de_Uso.md` | Fluxos de registro, monitoramento, auditoria, tokenização, compra e burn |
| `.planning/docs/bible/14_Novos_requisitos.md` | Integrity Layer, claims, evidence, conflicts, risk e review |
| `.planning/docs/bible/15_Geofance_sentinel_requisitos.md` | PostGIS, Sentinel-2, AOI, histórico e monitoramento |
| Verificações das Phases 01, 02, 03, 04, 04.1, 04.2 e 05 | Estado implementado e evidências |
| `.planning/codebase/*` | Arquitetura de código, stack, integrações e preocupações |

## 3. Tese do Produto

O SINARCA não é apenas marketplace, nem apenas blockchain, nem apenas monitoramento satelital. Ele é uma camada operacional de confiança.

O ativo ambiental só ganha valor quando existe uma cadeia coerente de provas:

```text
Declaração
  -> evidência
  -> validação
  -> certificação
  -> auditoria
  -> monitoramento
  -> risco
  -> marketplace
  -> compra
  -> aposentadoria
  -> trilha auditável
```

A blockchain preserva registro e rastreabilidade, mas não transforma uma declaração falsa em fato verdadeiro. Por isso a arquitetura atual evoluiu para Claim, Evidence, Conflict, Risk Score, PostGIS, Sentinel-2, auditoria humana e, futuramente, registros externos.

## 4. Atores e Responsabilidades

| Ator | Responsabilidade no sistema |
| --- | --- |
| Público | Consulta projetos, perfis, rankings, mapas, transações e transparência |
| Produtor | Origina projeto, fornece documentos, mantém área e responde pendências |
| Certificadora | Analisa dossiê, calcula potencial, decide certificação e emite certificado |
| Auditor | Verifica campo, QTAGs, evidências, anomalias e laudos |
| Empresa/cidadão | Compra créditos, acompanha carteira e aposenta créditos |
| Admin/Operação | Gerencia usuários, organizações, providers, filas, overrides e health |
| SINARCA | Orquestra evidências, risco, monitoramento, ledger, tesouraria e rastreabilidade |

## 5. Fluxo Operacional Completo

### 5.1 Fluxo Ideal Consolidado

```text
1. Visitante consulta o ecossistema público
2. Usuário cadastra perfil por papel
3. Produtor ou certificadora origina projeto
4. Projeto recebe documentos, QTAGs e geofence
5. Backend valida geometria, documentos e cria claims/evidences
6. PostGIS persiste perímetro e detecta overlaps
7. Integrity Layer calcula conflitos, score e status de confiança
8. Copernicus/Sentinel-2 gera baseline e série ambiental
9. Certificadora revisa dossiê e decide certificação
10. Aprovação gera certificado e autorização de tesouraria
11. Auditoria de campo valida evidências físicas e ambientais
12. Monitoramento contínuo detecta anomalias e eventos
13. Eventos confirmados afetam risco, disponibilidade e créditos
14. Marketplace lista créditos disponíveis
15. Empresa compra créditos e recebe saldo em carteira
16. Empresa aposenta créditos e recebe certificado de impacto
17. Tesouraria/blockchain executa mint, unlock, transfer, burn e reconciliação
18. Admin acompanha operação, segurança, compliance e observabilidade
```

### 5.2 Correção Sobre o Fluxo Original

O PDF original de maio descreve tokenização logo após a certificação e antes da auditoria. A implementação atual trata isso de forma mais segura:

- A certificação aprovada prepara uma autorização de tesouraria.
- A execução de mint/provider externo não acontece dentro da decisão da certificadora.
- Blockchain/tesouraria ficam em fase própria.
- Monitoramento satelital não deve classificar automaticamente “desmatamento”; ele gera evidência e evento que dependem de revisão humana para confirmação.

Essa correção é importante para reduzir risco operacional, jurídico e reputacional.

## 6. Overview da Arquitetura

```text
Camada de apresentação
  React/Vite
  - público: consulta, projetos, perfis, compliance, mapas, rankings
  - logado: dashboards por papel, projeto, certificação, auditoria, monitoramento

Camada de API
  FastAPI /api/v1
  - auth
  - projects
  - certifier
  - integrity
  - audit
  - satellite
  - marketplace
  - inventory
  - treasury
  - blockchain

Camada de domínio
  - originação
  - documentos
  - geofence/PostGIS
  - claims/evidence/conflicts
  - risk engine
  - auditoria
  - monitoramento satelital
  - ledger/créditos
  - tesouraria

Camada de persistência
  PostgreSQL/Supabase
  PostGIS
  Supabase Storage
  audit_events
  ledger_entries

Camada de integrações
  Copernicus/Sentinel-2
  Stellar/Soroban
  Etherfuse
  Polygon
  futuros registros oficiais externos
```

## 7. Estado Atual do Milestone v1.0

| Métrica | Valor |
| --- | --- |
| Milestone | v1.0 |
| Objetivo | Base operacional e fechamento de fluxos/telas |
| Fases totais | 13 |
| Fases completas | 7 |
| Progresso | 54% |
| Planos executados | 42 |
| Resumos gerados | 42 |
| Requisitos completos | 42/74 |
| Próxima fase | 05.1 — integrity-review-and-external-registries |
| Última atividade registrada | 2026-08-17 — Phase 05 verified complete |

### 7.1 Fases Completas

| Fase | Entrega principal |
| --- | --- |
| 01 — backend-rebuild | Runtime FastAPI canônico, Supabase/Postgres, auth, API v1, ledger base, adapters e deploy |
| 02 — public-transparency-and-profiles | Rotas públicas, dossiê público, explorer, perfis, cadastro/edição e páginas legais |
| 03 — project-origination-and-documents | Wizard de originação, QTAGs, geofence, documentos reais e timeline |
| 04 — certification-workbench | Dossiê técnico da certificadora, decisão append-only, certificado e autorização de tesouraria |
| 04.1 — geospatial-foundation | PostGIS, boundaries reais, backfill de QTAGs e overlap interno |
| 04.2 — integrity-layer-foundation | Claims, evidence, conflicts, risk score, auto hold e status público minimizado |
| 05 — satellite-monitoring-and-field-audit | Auditoria de campo, Copernicus/Sentinel-2, baseline real, anomalias, eventos e dashboard |

### 7.2 Fases Pendentes no v1.0

| Fase | Foco | Lacuna que fecha |
| --- | --- | --- |
| 05.1 | Revisão de integridade e registros externos | Four-eyes, ONR/CNM, SIGEF/INCRA, CAR/SICAR, Trust Badge |
| 06 | Marketplace, carteira e aposentadoria | Checkout real, carteira, recibo, burn e certificado de impacto |
| 07 | Inventário e compensação | Inventário persistido, documentos e vínculo com aposentadoria |
| 08 | Tesouraria/blockchain/interoperabilidade | Execução operacional de mint, unlock, transfer, burn e providers |
| 09 | Admin e observabilidade | Console admin, filas, users/orgs, overrides, health e runbooks |
| 10 | Segurança, compliance e governança | LGPD/GDPR, DPO, MFA, segredos, AML/CFT, auditoria externa e qualidade |

## 8. Estado Atual Por Domínio

### 8.1 Plataforma Pública

Já existe:

- rotas públicas limpas;
- dossiê público de projeto;
- páginas institucionais, legais e de compliance;
- explorer/transações;
- perfis públicos e catálogos.

Precisa melhorar:

- clareza visual do ciclo completo do ativo;
- leitura pública de integridade, risco e confiança;
- componente público do Trust Badge/Selo;
- busca/comparação por status e integridade;
- consistência de copy para não confundir SINARCA com certificadora ou regulador.

### 8.2 Painel Logado

Já existe:

- painel protegido por autenticação;
- navegação por papel;
- originação de projeto;
- filas de certificadora e auditoria;
- monitoramento satelital;
- marketplace, inventário e aposentadoria como base.

Precisa melhorar:

- dashboards menos fragmentados;
- visão de carteira/projeto por prioridade operacional;
- estados de erro, loading, vazio, permissão e baixa confiança;
- mobile para campo e reuniões;
- atalhos entre projeto, score, anomalia, auditoria e marketplace;
- consistência visual entre telas públicas e logadas.

### 8.3 Originação e Documentos

Já existe:

- cadastro com produtor, localização, metodologia, área e certificadora;
- quatro QTAGs A/B/C/D com UID, CMAC e coordenadas;
- geofence renderizado;
- upload real de documentos;
- timeline canônica.

Precisa melhorar:

- validação real de SUN/CMAC com chaves/KMS/HSM;
- experiência mobile/PWA mais robusta para campo;
- políticas de retenção e exposição documental;
- revisão visual do wizard e dos estados de upload.

### 8.4 Geoespacial

Já existe:

- PostGIS;
- `project_boundaries`;
- geometrias declared/field/certified/active;
- validação geométrica;
- overlap interno via `ST_Intersects`/`ST_Area`;
- dossiê e revisão consumindo boundary persistido.

Precisa melhorar:

- importação de polígonos reais mais complexos;
- integração com registros externos;
- revisão de UX de mapas;
- representação visual clara de divergência de área e sobreposição;
- política de minimização para geometria pública.

### 8.5 Integrity Layer

Já existe:

- Claim Registry;
- Evidence Registry;
- Conflict Registry;
- Risk Engine;
- Risk Score 0-100;
- Auto Hold por classe crítica;
- sinais explicáveis;
- histórico append-only em risk assessments/signals.

Precisa melhorar:

- four-eyes review;
- Trust Badge público;
- console de revisão de integridade;
- provedores externos de registro;
- QID/Selo como prova versionada ambiental;
- diferenciação mais forte entre status operacional, integridade e certificação.

### 8.6 Certificação

Já existe:

- fila da certificadora;
- dossiê técnico com baseline, tags, documentos e cálculo;
- decisão append-only;
- certificado PDF obrigatório na aprovação;
- pendências estruturadas;
- histórico interno e público minimizado;
- autorização de tesouraria.

Precisa melhorar:

- operação integrada com tesouraria;
- visual de status pós-certificação;
- workflow de ajustes/reenvio mais claro;
- governança de quem pode aprovar sob alto risco;
- integração com Trust Badge.

### 8.7 Auditoria e Monitoramento

Já existe:

- fila de auditoria;
- evidências de campo reais;
- assinatura server-side verificável;
- Copernicus/Sentinel-2 L2A;
- NDVI, NDMI e NBR;
- reconstrução histórica;
- monitoramento contínuo;
- anomalias, eventos e decisões humanas;
- dashboard satelital com mapa e séries.

Precisa melhorar:

- sazonalidade year-over-year;
- métricas mais detalhadas de nuvem/sombra;
- buffer interno de borda;
- timeline de anomalia mais clara;
- experiência mobile da auditoria;
- QID como versão imutável do estado ambiental.

### 8.8 Marketplace, Carteira e Aposentadoria

Já existe:

- base de marketplace;
- compra via API;
- ledger off-chain;
- transações;
- endpoint de compensação/aposentadoria;
- validação de saldo no backend.

Precisa melhorar:

- checkout real com confirmação, taxa, total, erro e pagamento/settlement;
- carteira por projeto, vintage e lote;
- recibos navegáveis;
- certificado de impacto ambiental;
- histórico de aposentadorias;
- ligação com inventário de emissões.

### 8.9 Inventário e Compensação

Já existe:

- base de inventário;
- declaração via API;
- upload seguro no backend;
- motor local de cálculo no frontend.

Precisa melhorar:

- unificar UI de inventário com API;
- persistir período, escopos e documentos;
- recomendar compensação a partir do inventário;
- cruzar emissões, créditos comprados e créditos aposentados;
- remover dependência de cálculo local isolado para fluxos críticos.

### 8.10 Tesouraria, Blockchain e Interoperabilidade

Já existe:

- adapters Stellar/Soroban, Etherfuse, Polygon e Transfero;
- contrato Soroban;
- autorização de tesouraria após certificação;
- smokes/bloqueios documentados para credenciais ausentes.

Precisa melhorar:

- console operacional de tesouraria;
- status por provider;
- execução de mint, unlock, transfer e burn;
- lock-and-mint Polygon com UI protegida;
- reconciliação entre off-chain ledger e on-chain status;
- falha fechada visível em produção.

### 8.11 Admin, Observabilidade e Governança

Já existe:

- `audit_events`;
- `/health`;
- auth e papéis;
- base de logs/eventos por domínio.

Precisa melhorar:

- dashboard admin real;
- gestão de usuários e organizações;
- busca de eventos sensíveis;
- overrides/reprocessamento com motivo;
- status de API, DB, providers, jobs e filas;
- runbooks;
- CI/CD e observabilidade.

## 9. Melhorias Identificadas

### 9.1 Produto e UX

| Melhoria | Prioridade | Motivo |
| --- | --- | --- |
| Refinar área pública | P0 | A confiança precisa ser entendida por comprador, parceiro e visitante |
| Refinar dashboards logados | P0 | Operação precisa saber o que fazer, não só ver métricas |
| Criar componente Trust Badge/Selo | P0 | Status de integridade deve ser visualmente consistente |
| Criar dashboard de projeto completo | P0 | Projeto é o centro do ciclo operacional |
| Melhorar mobile de campo | P1 | Auditoria, NFC e inspeção dependem de uso fora do escritório |
| Padronizar estados vazios/erro/loading | P1 | Reduz ruído operacional e suporte |
| Revisar copy de risco/certificação | P1 | Evita confusão jurídica e reputacional |

### 9.2 Produto e Operação

| Melhoria | Prioridade | Motivo |
| --- | --- | --- |
| Phase 05.1 | P0 | Fecha confiança, registros externos e four-eyes |
| Checkout/carteira/aposentadoria | P0 | Fecha ciclo econômico e receita |
| Tesouraria/blockchain operacional | P1 | Remove lacuna entre autorização e execução |
| Admin/observabilidade | P1 | Necessário para operar em escala |
| Segurança/compliance/governança | P1 | Necessário antes de produção sensível |
| Inventário -> compensação | P2 | Aumenta demanda corporativa, mas depende do marketplace mais maduro |

### 9.3 Técnica

| Melhoria | Prioridade | Motivo |
| --- | --- | --- |
| Typecheck/CI frontend | P1 | Build Vite passa mesmo com dívidas de TypeScript históricas |
| Lazy loading de rotas | P1 | Bundle já tem aviso de chunk grande |
| Observabilidade estruturada | P1 | Jobs, providers e auditoria precisam diagnóstico operacional |
| Contratos de provider visíveis | P1 | Falhas por credenciais ausentes precisam aparecer em UI/admin |
| Testes de frontend interativo | P2 | Muitas garantias visuais hoje dependem de UAT/manual |

## 10. Próximos Milestones Sugeridos

Esta proposta não substitui o roadmap atual; ela agrupa o trabalho restante em blocos compreensíveis para gestão.

### v1.0-restante — Fechamento de Confiança

Escopo sugerido:

- executar Phase 05.1;
- decisão build vs. buy de registros externos;
- `ExternalRegistryProvider`;
- four-eyes review para risco HIGH+;
- Integrity Review Console;
- Trust Badge público.

Resultado esperado: o SINARCA deixa de ter apenas risco calculado e passa a ter revisão de integridade operacional com fonte externa e dupla aprovação.

### v1.1 — Experiência, Selo e Dashboards

Escopo sugerido:

- refinamento de frontend público;
- refinamento de dashboards logados;
- componente visual de Selo/Trust Badge;
- página de projeto logada com score, sinais, monitoramento, auditoria e ação recomendada;
- página pública de projeto com integridade explicável;
- estados mobile, loading, erro, vazio e permissão.

Resultado esperado: o sistema fica legível para time, comprador, certificadora, auditor e produtor.

### v1.2 — Marketplace, Carteira e Aposentadoria

Escopo sugerido:

- executar Phase 06;
- checkout real;
- carteira por projeto/vintage/lote;
- recibo de compra;
- aposentadoria/burn;
- certificado de impacto;
- histórico por empresa.

Resultado esperado: o ciclo econômico fecha ponta a ponta.

### v1.3 — Inventário e Compensação

Escopo sugerido:

- executar Phase 07;
- inventário persistido;
- upload seguro pela UI;
- dashboard emissões versus créditos;
- recomendação de compensação;
- vínculo entre inventário e aposentadoria.

Resultado esperado: empresas conseguem passar de emissão declarada para compensação rastreável.

### v1.4 — Tesouraria, Blockchain e Interoperabilidade

Escopo sugerido:

- executar Phase 08;
- console de tesouraria;
- provider status;
- mint, unlock, transfer e burn operacionais;
- lock-and-mint Polygon;
- reconciliação off-chain/on-chain.

Resultado esperado: autorizações de certificação viram operações controladas, rastreáveis e visíveis.

### v1.5 — Operação, Segurança e Governança

Escopo sugerido:

- executar Phases 09 e 10;
- admin console;
- observabilidade;
- runbooks;
- LGPD/GDPR;
- DPO;
- retenção/anonimização;
- MFA;
- gestão de segredos;
- AML/CFT;
- auditoria externa e smart contract audit.

Resultado esperado: o sistema fica preparado para produção sensível e operação contínua.

## 11. Leitura Crítica do Estado Atual

### 11.1 O Sistema Avançou Bem

As primeiras sete fases fecharam a base que era mais arriscada:

- runtime backend real;
- dados persistidos;
- autenticação;
- documentos;
- geofence real;
- integridade;
- risco;
- certificação;
- auditoria;
- satélite real.

Isso muda a natureza do produto. O problema deixou de ser “temos uma demo?” e passou a ser “como transformar a base em operação e experiência confiável?”.

### 11.2 A Lacuna Principal Agora é Experiência Operacional

O time precisa melhorar muito frontend e dashboards. A base técnica está dispersa em várias telas e precisa virar uma jornada clara:

```text
O que aconteceu?
Por que aconteceu?
Qual evidência sustenta isso?
Qual risco mudou?
Quem precisa decidir?
Qual é o próximo passo?
O que pode ser visto publicamente?
```

Sem essa camada, as features existem, mas o sistema fica difícil de explicar e operar.

### 11.3 O Marketplace Ainda Não Está no Mesmo Nível da Integridade

A fundação de confiança avançou mais do que o ciclo econômico. Marketplace, carteira, aposentadoria, certificado de impacto e settlement ainda precisam virar fluxo robusto, porque são a ponte para receita e adoção por empresas.

### 11.4 A Operação Admin Ainda é um Gargalo Futuro

Quando houver mais projetos, jobs, providers, usuários, documentos, eventos e revisões, será impossível operar apenas pelas telas atuais. Admin, observabilidade e runbooks precisam entrar antes de produção real.

## 12. Anexos Especializados

Os documentos abaixo continuam válidos, mas são aprofundamentos de uma parte do sistema:

- `PRD_QID_SELO_SINARCA_INTEGRIDADE.md`
- `QID_SELO_SINARCA_WORKFLOW_SINTETICO.md`
- `QID_SELO_SINARCA_WORKFLOW_ANALITICO.md`

Eles devem ser tratados como subproduto da camada de integridade ambiental e do Selo Sinarca, não como substitutos da visão operacional do sistema inteiro.

## 13. Recomendação Final

A próxima decisão estratégica é separar o trabalho em duas frentes paralelas:

- **Confiança operacional:** Phase 05.1, registros externos, four-eyes, Trust Badge, QID/Selo.
- **Experiência e monetização:** frontend público/logado, dashboards, marketplace, carteira, aposentadoria e certificados.

Essa separação evita que o time continue acumulando complexidade técnica sem materializar a clareza de produto que compradores, certificadoras, auditores e produtores precisam para confiar e operar no SINARCA.
