# Phase 04: certification-workbench - Contexto

**Coletado:** 2026-05-27
**Status:** Pronto para planejamento

<domain>
## Limite da Fase

A Phase 04 completa a bancada da certificadora. Ela parte da fila existente da certificadora e entrega revisão técnica detalhada no próprio card da fila, decisão auditável, upload obrigatório de certificado em PDF, histórico de decisões por projeto e autorização operacional para mint bloqueado pela tesouraria.

Esta fase não executa o mint, não cria console completo de tesouraria/blockchain, não implementa auditoria de campo e não entrega marketplace. A certificação autoriza a emissão/mint; a execução operacional fica para a tesouraria em fila própria, a ser aprofundada em fases posteriores.

</domain>

<decisions>
## Decisões de Implementação

### Revisão detalhada

- **D-01:** A fila da certificadora permanece como base. A revisão detalhada abre como card expansível na própria fila, seguindo o padrão da área do auditor.
- **D-02:** O card expandido usa abas internas para organizar o dossiê técnico. As abas esperadas são: resumo, QTAGs/geofence, documentos, cálculo, decisão e histórico.
- **D-03:** A decisão fica bloqueada sem dossiê mínimo completo: baseline, quatro QTAGs válidas/geofence e documentos obrigatórios.
- **D-04:** Quando o dossiê mínimo estiver incompleto, a certificadora não decide. Ela gera uma pendência estruturada para o produtor/origem, vinculada ao projeto, e o projeto fica marcado como pendente de correção.

### Decisão técnica

- **D-05:** Aprovação, reprovação e pedido de ajustes usam formulário completo por decisão.
- **D-06:** Aprovação exige metodologia, potencial de crédito, notas, justificativa quando o potencial for ajustado e certificado em PDF anexado.
- **D-07:** O potencial de crédito deve ser sugerido pelo sistema a partir dos dados do projeto/baseline/metodologia, mas a certificadora pode editar o valor com justificativa obrigatória.
- **D-08:** Reprovação e pedido de ajustes exigem categoria estruturada e descrição obrigatória.
- **D-09:** Decisão registrada não deve ser editada. Correções devem entrar como nova decisão ou evento auditável vinculado.
- **D-10:** Solicitar ajustes gera demanda para correção, tira o projeto da fila principal da certificadora e o move para uma fila separada de "aguardando retorno do produtor", com contador no dashboard. O projeto só volta para a fila principal quando o produtor/responsável responder ou corrigir a pendência.

### Certificado e referência documental

- **D-11:** Aprovação exige upload obrigatório de certificado/documento assinado em PDF. Hash determinístico sem arquivo real não conta como entrega da fase.
- **D-12:** A Phase 04 aceita PDF apenas para certificado. Imagem, XML/JSON de assinatura e templates ficam fora desta fase.
- **D-13:** O certificado aparece no dossiê interno e no dossiê público. O dossiê interno mostra metadados completos; o dossiê público mostra referência/hash e download quando permitido.
- **D-14:** Se o upload do certificado falhar, a aprovação não conclui. A decisão fica em rascunho/pendente até o certificado ser anexado com sucesso.

### Mint bloqueado e tesouraria

- **D-15:** A certificação autoriza a emissão/mint, mas não executa provider ou adapter externo nesta fase.
- **D-16:** A execução do mint bloqueado fica para a tesouraria, em fila própria.
- **D-17:** A aprovação deve gerar status visível no card e no histórico: `Certificação aprovada`, `Mint autorizado` e `Aguardando tesouraria`.
- **D-18:** A fila da tesouraria recebe um pacote mínimo de autorização: projeto, certificadora, potencial aprovado, metodologia, certificado/hash, data, status e trilha de auditoria.
- **D-19:** Aprovação e criação da pendência de tesouraria são atômicas. Se a pendência de tesouraria falhar, a aprovação não conclui.

### Histórico de decisões

- **D-20:** Certificadora e produtor veem a trilha completa por projeto. O dossiê público mostra apenas decisões finais e certificado/referência, sem notas internas sensíveis.
- **D-21:** O histórico inclui todos os eventos da certificação: abertura de revisão, pendência criada, resposta do produtor, aprovação, reprovação, pedido de ajustes, certificado anexado, mint autorizado e envio à tesouraria.
- **D-22:** Notas internas completas ficam visíveis para certificadora, admin, produtor e tesouraria. O público vê apenas o dossiê público limitado.
- **D-23:** O histórico deve aparecer como linha do tempo por projeto com filtros básicos por tipo de evento/status e ator.

### Discrição do agente

- O agente pode definir nomes técnicos de tabelas, DTOs, endpoints e componentes, desde que preserve os comportamentos acima, use `/api/v1`, mantenha eventos auditáveis e não reintroduza mock runtime no frontend.
- O agente pode decidir a composição exata das abas internas, desde que todas as informações exigidas estejam disponíveis antes da decisão.

</decisions>

<canonical_refs>
## Referências Canônicas

**Agentes downstream devem ler estas referências antes de planejar ou implementar.**

### Planejamento e escopo

- `.planning/ROADMAP.md` — define Phase 04, critérios de sucesso e dependências com Phase 03, Phase 08 e Phase 10.
- `.planning/STATE.md` — estado atual do milestone, com Phases 2 e 3 completas e Phase 4 pronta para planejamento.
- `.planning/PROJECT.md` — decisões de projeto, runtime canônico e baseline obrigatório do checklist.
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` — seção 4 é o checklist base da certificadora: fila, revisão detalhada, decisão, certificado, mint bloqueado e histórico.
- `.planning/phases/04-certification-workbench/04-CONTEXT.md` — este contexto é a fonte canônica das decisões da discussão.

### Contexto das fases anteriores

- `.planning/phases/03-project-origination-and-documents/03-CONTEXT.md` — originação alimenta a certificadora com produtor, localização, metodologia, QTAGs, geofence, documentos e timeline.
- `.planning/phases/03-project-origination-and-documents/03-VERIFICATION.md` — evidencia que o fluxo de originação já envia QTAGs, documentos e dossiê público.
- `.planning/phases/02-public-transparency-and-profiles/02-CONTEXT.md` — define dossiê público, minimização de dados e separação do que pode aparecer publicamente.
- `.planning/phases/01-backend-rebuild/01-CONTEXT.md` — define `backend_app`, Supabase Postgres, audit events, adapters e bloqueio explícito para provedores sem credenciais.

### Mapas de codebase

- `.planning/codebase/STACK.md` — stack real: React/Vite, FastAPI, SQLAlchemy async, Supabase Postgres e adapters.
- `.planning/codebase/ARCHITECTURE.md` — fronteiras frontend/backend, rotas protegidas e fluxo de auditoria/certificação.
- `.planning/codebase/CONVENTIONS.md` — convenções de documentação PT-BR, rotas `/api/v1`, chamadas via `src/services/api.ts` e organização de código.

### Código fonte operacional

- `backend_app/modules/certifier/routes.py` — rotas atuais `/certifier/queue` e `/certifier/projects/{project_id}/decision`; base para evoluir decisão, certificado, pendências e autorização de tesouraria.
- `backend_app/modules/projects/service.py` — montagem de dossiê, certificações, documentos, timeline e dados públicos do projeto.
- `backend_app/db/models.py` — modelos de `Project`, `Certification`, `EnvironmentalCredit`, `Document`, `AuditEvent` e status canônicos.
- `backend_app/db/repositories.py` — helpers de `audit_events`.
- `backend_app/modules/blockchain/routes.py` — fluxo protegido de lock-and-mint externo; referência para manter execução fora da Phase 04.
- `backend_app/adapters/stellar.py` — contrato de adapter para `mint_locked`; referência futura, não execução obrigatória da Phase 04.
- `src/pages/Dashboard/CertifierReview.tsx` — fila atual da certificadora e ponto principal de evolução do card expansível.
- `src/pages/Dashboard/AuditorReview.tsx` — referência de padrão visual/operacional para card de revisão detalhada.
- `src/pages/Dashboard/MrcaDetails.tsx` — dossiê público que deve exibir certificado e histórico público limitado.
- `src/services/database.ts` — fachada de dados e tipos de dossiê público.
- `src/services/api.ts` — cliente obrigatório para chamadas autenticadas e `FormData`.
- `supabase/seed.sql` — dados seed de certificadora, projetos em fila e entidades associadas.

</canonical_refs>

<code_context>
## Insights do Código Existente

### Ativos reutilizáveis

- `src/pages/Dashboard/CertifierReview.tsx`: já carrega `/certifier/queue` e renderiza cards de projetos com ações. Deve ser evoluído para cards expansíveis com abas.
- `src/pages/Dashboard/AuditorReview.tsx`: referência de experiência para revisão detalhada dentro do dashboard, com dossiê operacional e ações por projeto.
- `src/pages/Dashboard/MrcaDetails.tsx`: já consome `ProjectPublicDossier` e renderiza certificações, documentos e timeline pública; deve receber certificado e histórico público limitado.
- `src/services/api.ts`: já suporta JSON e `FormData`; deve ser usado para upload de certificado.
- `backend_app/modules/certifier/routes.py`: já cria `Certification`, atualiza status, cria crédito `LOCKED`, registra `audit_events` e timeline.
- `backend_app/modules/projects/service.py`: já transforma certificações e documentos em itens de dossiê.

### Padrões estabelecidos

- Chamadas frontend passam por `apiGet`, `apiPost` ou `apiPatch`; não usar URL absoluta.
- Dados demonstrativos de tela devem vir de `supabase/seed.sql` ou `/api/v1`; não criar mock runtime novo.
- Operações sensíveis geram `audit_events` e timeline.
- Provedores externos sem credenciais devem falhar fechado e aparecer como bloqueio/status operacional, não como sucesso simulado.
- Documentação autoral em `.planning` deve ser PT-BR com acentuação correta.

### Pontos de integração

- Backend: ampliar `/api/v1/certifier/queue`, `/api/v1/certifier/projects/{id}/decision` e criar endpoints para pendências, certificado PDF, histórico e autorização de tesouraria.
- Frontend: evoluir `/painel/certificadora` em `CertifierReview.tsx` com card expansível, abas internas, filas/contadores e formulário completo.
- Dossiê: atualizar `ProjectPublicDossier` e `MrcaDetails.tsx` para exibir certificado/referência e histórico público limitado.
- Persistência: reutilizar ou estender `certifications`, `documents`, `audit_events`, `environmental_credits` e timeline; criar estrutura de pendências e fila de tesouraria se o schema atual não suportar.

</code_context>

<specifics>
## Ideias Específicas

- A fila de certificadora atual é a tela base; não criar página dedicada por projeto nesta fase.
- O card expandido deve se comportar como a área do auditor, mas organizado com abas internas.
- A fila deve ter pelo menos dois estados visíveis: fila principal de decisão e fila separada de ajustes aguardando retorno do produtor, com contador no dashboard.
- O formulário de decisão deve impedir aprovação sem dossiê mínimo completo e sem certificado PDF anexado.
- O sistema deve sugerir potencial de crédito, mas permitir ajuste pela certificadora com justificativa.
- A autorização para tesouraria deve ser registrada como pendência operacional própria, com status visível, mas sem chamar adapter de mint nesta fase.

</specifics>

<deferred>
## Ideias Adiadas

- Criar área futura para template de certificado, preenchimento automático com dados do sistema e assinatura digital pela certificadora.
- Executar mint bloqueado em provider/adapters externos; isso pertence à tesouraria/blockchain, especialmente Phase 08.
- Console completo de tesouraria, reprocessamento operacional e gestão ampla de filas; isso pertence a fases posteriores, especialmente Phase 8 e Phase 9.

</deferred>

---

*Phase: 04-certification-workbench*
*Context gathered: 2026-05-27*
