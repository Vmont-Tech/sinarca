# Auditoria de checklist de fluxo e tela

**Data:** 2026-05-26
**Escopo:** checklist operacional fornecido pelo time, implementação atual do checkout e documentação do projeto.

## Fontes verificadas

- Não existe diretório `docs/` na raiz deste checkout. A documentação canônica do projeto está em `.planning/docs/`, `.planning/phases/01-backend-rebuild/`, `README.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md` e `.planning/STATE.md`.
- Foram verificados os documentos Markdown em `.planning/docs/`, incluindo produto/arquitetura, Bible técnica, branding, deployment, providers e referências.
- Foram extraídos e consultados os PDFs/DOCX em `.planning/docs/` e `.planning/docs/reference/` com `pdftotext` e `textutil`: `Fluxo_Operacional_Completo.pdf`, `SINARCA_Documento_Unificado.pdf`, `Fluxo_Operacional_Completo_da_Plataforma_SINARCA.p.pdf` e o adendo `O que precisamos ajustar nesse documento para refl....docx/pdf`.
- Foram verificados os artefatos da Phase 1 em `.planning/phases/01-backend-rebuild/`, principalmente `01-COVERAGE.md`, `API-CONTRACT.md`, `DATA-MODEL.md`, `01-VALIDATION.md`, `01-04-SUMMARY.md`, `01-05-SUMMARY.md` e `01-06-SUMMARY.md`.
- Foram verificados os arquivos de implementação em `src/`, `backend_app/`, `supabase/seed.sql`, `supabase/migrations/202605220001_initial_schema.sql` e testes de contrato.

## Veredito executivo

A Phase 1 entregou uma base técnica real: `backend_app`, auth própria Argon2/JWT, schema Supabase/Postgres, seed consolidado, rotas `/api/v1`, ledger off-chain, filas de certificadora/auditoria, compra, aposentadoria, inventário, monitoramento e adapters blockchain/tesouraria.

O checklist, porém, pede fechamento de produto em nível de fluxo/tela. Nessa camada ainda há lacunas relevantes: telas com dados fixos, ausência de formulários completos, ausência de telas administrativas, fluxos de provider sem UI, anomalias sem rota pública de registro/listagem, certificados/laudos/documentos sem visualização real e algumas páginas que mostram dados estáticos apesar de existir backend persistente.

## Legenda

- **OK-base:** estrutura, rota, schema ou tela base existe.
- **Parcial:** parte do fluxo existe, mas não fecha UX, regra ou integração completa.
- **Pendente:** item não está implementado de forma operacional.
- **Divergência:** documentação, UI ou implementação conflitam com o contrato atual.

## 1. Público e Transparência

| Item | Validação | Backlog |
|---|---|---|
| Home pública em `sinarca.com.br` | **OK-base.** `src/App.tsx` expõe `/` com `LandingPage`. | Manter smoke público no deploy/staging. |
| URLs limpas sem `/public` | **OK-base.** Rotas limpas existem para `/consulta`, `/feed`, `/mapa-brasil`, `/mapa-nacional`, `/rankings`, `/sobre`; `/public/*` redireciona via `LegacyPublicRedirect`. | Manter teste de regressão para links públicos. |
| Navegação pública completa sem novos links `/public` | **Parcial.** `src/` não tem links novos para `/public`, mas `BLUEPRINT_V1.md` ainda citava rotas antigas. | Corrigir docs antigas e adicionar gate `rg "/public"` em navegação pública. |
| Detalhe público do projeto com histórico, QTAGs, baseline, certificação, auditoria, créditos e transações | **Parcial.** `/projeto/:id` usa dados de projeto e timeline, mas documentação e auditoria são estáticas; QTAGs/baseline/transações não são carregadas no detalhe público. | Completar dossiê público do projeto consumindo `projects`, `monitoring`, `documents`, `certifications`, `audits`, `environmental_credits` e `ledger_entries`. |
| Explorer de transações com filtros por projeto, hash, tipo, comprador e status | **Parcial.** `/feed` usa `/transactions`, filtra tipo/hash/origem em memória. Não há filtro dedicado por projeto, comprador ou status. | Criar filtros de API/UI e link para projeto/transação. |
| Perfis públicos de certificadoras, auditores, empresas e produtores vindos do banco | **Parcial.** Catálogos de certificadoras, auditores e empresas vêm do banco; produtores não têm catálogo público; atividade do perfil é vazia. | Adicionar perfil público completo por papel, incluindo produtor e histórico público. |

## 2. Auth e Perfis

| Item | Validação | Backlog |
|---|---|---|
| Login/cadastro via API própria Argon2/JWT | **OK-base.** `backend_app/modules/auth` e `AuthContext` usam `/auth/login`, `/auth/register`, `/auth/me` e `/auth/me` via PATCH. | Manter contrato e testes. |
| Logout no painel | **OK-base.** `DashboardLayout` e `Settings` limpam sessão e voltam para `/login`. | Manter. |
| Tela de cadastro por perfil: produtor, empresa, auditor, certificadora | **Parcial.** Login mostra produtor/auditor/empresa; backend aceita `certifier`, mas a UI não oferece certificadora no seletor público. | Adicionar fluxo de cadastro por perfil e regras de onboarding por papel. |
| Edição completa de perfil persistida | **Parcial.** Nome, e-mail, organização e telefone são editáveis; backend aceita documento/avatar, mas UI não edita documento nem faz upload real de avatar. | Completar perfil com documento, avatar persistido, validações e organização. |
| Provisionamento administrativo de admin sem cadastro público | **OK-base no backend, pendente em operação.** Backend bloqueia `admin` no cadastro público e seed cria admin demo; não há fluxo operacional ou runbook de provisionamento. | Criar runbook/CLI/admin screen para provisionar admin. |
| Estados de erro amigáveis | **Parcial.** API retorna mensagens para credenciais inválidas e e-mail duplicado; frontend exibe `err.message`, mas sessão expirada/API indisponível ainda ficam genéricos ou silenciosos. | Padronizar erros de auth e banners de API/session failure. |

## 3. Produtor / Originação do Projeto

| Item | Validação | Backlog |
|---|---|---|
| Tela de adicionar projeto | **OK-base.** `AddProject.tsx` envia `/projects`. | Evoluir para fluxo completo. |
| Cadastro completo do projeto | **Parcial.** Backend suporta produtor, localização, bioma, área, estoque e certificadora; UI usa estados/cidades pré-definidos e não envia metodologia/documentos reais. | Criar formulário completo com município/UF livres, metodologia, produtor responsável, documentos e validação. |
| Entrada das 4 QTAGs/NFC obrigatórias com coordenadas, CMAC e vértice A/B/C/D | **Parcial no backend, pendente na UI.** `ProjectCreate.tags` existe e backend exige 4 se enviado, mas `AddProject` não captura nem envia tags. | Implementar etapa de QTAGs obrigatórias e validação geográfica. |
| Visualização do polígono/geofence gerado pelas QTAGs | **Pendente.** Monitoramento mostra overlay visual genérico, não polígono calculado das tags. | Gerar e exibir geofence real a partir de `project_tags`. |
| Upload/gestão de documentação legal e inventário florestal | **Parcial.** Schema `documents` e upload de inventário existem; `AddProject` mostra dropzone sem envio. | Criar upload real de documentos do projeto, listagem e vínculo por tipo. |
| Linha do tempo do status CREATED até AVAILABLE | **Parcial.** `projects.timeline` existe e é mostrado no detalhe, mas o fluxo usa poucos eventos e não cobre todo o ciclo canônico. | Normalizar timeline operacional com todos os status e eventos sensíveis. |

## 4. Certificadora

| Item | Validação | Backlog |
|---|---|---|
| Fila de certificadora | **OK-base.** `/certifier/queue` e `CertifierReview.tsx` existem. | Manter. |
| Revisão detalhada com baseline, documentos, QTAGs e cálculo de potencial | **Pendente.** A tela lista cards simples e não abre dossiê técnico detalhado. | Criar tela de revisão detalhada da certificadora. |
| Aprovar/reprovar com notas, metodologia e potencial de crédito | **Parcial.** Backend aceita decisão, notas e `credit_potential`; UI envia notas fixas e não permite editar potencial/metodologia. | Adicionar formulário de decisão completo. |
| Emitir/registrar certificado digital ou referência documental | **Parcial.** Backend grava `signed_document_hash` determinístico; não há upload/registro de certificado real na UI. | Criar registro de certificado/documento assinado. |
| Acionar tokenização/mint bloqueado após aprovação | **Parcial.** Aprovação cria crédito `LOCKED`; fluxo de treasury/mint existe em serviço/adapters, mas não é orquestrado pela decisão da certificadora. | Orquestrar certificação -> lastro -> mint bloqueado com status visível. |
| Histórico de decisões por projeto | **Parcial.** `certifications`, `audit_events` e timeline existem; nenhuma tela mostra histórico completo da certificadora. | Exibir histórico de decisões e trilha auditável. |

## 5. Auditoria

| Item | Validação | Backlog |
|---|---|---|
| Fila de auditoria | **OK-base.** `/audit/queue` e `AuditorReview.tsx` existem. | Manter. |
| Inspeção de campo com fotos, vídeos, geolocalização, observações e laudo | **Parcial.** A tela captura geolocalização, observações e laudo; evidências são `mock://` locais e não há upload real de vídeo/foto/documento. | Implementar upload seguro e armazenamento real de evidências. |
| Assinatura digital/biométrica ou stub verificável | **Parcial.** Há campo textual de assinatura; não há stub verificável com hash/assinatura forte. | Criar assinatura verificável, mesmo que stub assinável pelo backend. |
| Aprovar/reprovar auditoria e atualizar status | **OK-base.** Backend aprova, bloqueia ou pede recálculo e atualiza status/créditos. | Expandir UX de confirmação e motivos. |
| Recalcular créditos após incidente/anomalia | **Parcial.** Status `RECALCULATION_REQUIRED` e bloqueio existem; cálculo/quantidade ajustada não é recalculado. | Implementar recálculo de crédito e retorno parcial ao marketplace. |
| Visualização do laudo na tela do projeto | **Pendente.** `MrcaDetails` mostra auditoria estática, não consulta `audits`/`documents`. | Mostrar laudos e evidências no dossiê público/interno do projeto. |

## 6. Monitoramento e Anomalias

| Item | Validação | Backlog |
|---|---|---|
| Tela de monitoramento/NDVI | **OK-base.** `MonitoringNDVI.tsx` consome `/monitoring/projects/{id}`. | Remover projeto hardcoded. |
| Exibir baseline Sentinel-2, NDVI médio, pontos analisados e hash | **Parcial.** Tela mostra Sentinel, NDVI e pontos; o hash de baseline não fica exposto com clareza na tela principal. | Expor baseline hash e evidência de referência. |
| Registrar/listar anomalias | **Parcial no serviço, pendente na API/UI.** `MonitoringService.evaluate_anomaly()` existe, mas não há rota nem tabela/listagem de anomalias. | Criar `monitoring/anomalies` com registro, listagem e filtros. |
| Bloquear projeto automaticamente em caso de anomalia | **Parcial.** Serviço bloqueia se chamado; não há job/endpoint agendado ou fluxo UI usando isso. | Conectar job/endpoint de anomalia e auditoria urgente. |
| Notificar produtor/certificadora/auditor | **Pendente.** Não há mecanismo de notificação. | Criar notificações persistidas e UI. |
| Desbloqueio após auditoria aprovada | **OK-base.** Auditoria aprovada muda projeto para `ACTIVE` e crédito para `AVAILABLE`. | Expor trilha de desbloqueio na UI. |

## 7. Marketplace e Compra

| Item | Validação | Backlog |
|---|---|---|
| Marketplace e compra via API | **OK-base.** `/marketplace` e `/marketplace/buy` existem e reduzem estoque. | Manter testes. |
| Tela de compra com quantidade, preço unitário, taxa, total e confirmação | **Parcial.** UI tem quantidade e preço fixo; resultado mostra taxa depois da compra; não há modal/resumo de confirmação antes do envio. | Criar checkout com total/taxa/confirmacao antes de comprar. |
| Saldo/estoque por projeto e vintage | **Parcial.** Estoque disponível vem de `EnvironmentalCredit`, mas UI não separa vintage nem mostra saldo por lote. | Exibir estoque por projeto/vintage/lote. |
| Registrar compra no ledger e refletir em Meus Créditos | **OK-base no backend.** Compra cria `Purchase`, `LedgerEntry` e aparece em `/transactions`. | Criar carteira/saldo por projeto. |
| Recibo com hash/ID da transação | **Parcial.** Resultado mostra ID/hash; não há página/recibo persistente navegável. | Criar recibo de compra e link transacional. |
| Estados de erro | **Parcial.** Backend valida estoque/quantidade; frontend não trata erro de compra com mensagem visual robusta. | Implementar estados de erro e desabilitar compra inválida. |

## 8. Meus Créditos / Ledger

| Item | Validação | Backlog |
|---|---|---|
| Transações persistidas | **OK-base.** `ledger_entries` e `/transactions` existem. | Manter. |
| Carteira off-chain com saldo por projeto/vintage | **Parcial.** `ledger_accounts.balance` existe, mas a UI não mostra carteira por projeto/vintage. | Criar tela "Meus Créditos" com saldo detalhado. |
| Histórico de compras, recebimentos, transferências, aposentadorias e ajustes | **Parcial.** Tipos existem no enum e formatter cobre alguns; transferências/ajustes não têm fluxo/tela completo. | Completar histórico e fluxos de transferência/ajuste. |
| Filtros e exportação básica | **Parcial.** Filtros existem em memória; botão CSV não exporta. | Implementar exportação CSV e filtros por período/status/projeto. |
| Tela de detalhe da transação | **OK-base.** `/tx/:hash` e `TransactionDetails` existem, mas buscam em lista geral. | Evoluir para endpoint de detalhe por hash. |

## 9. Aposentadoria / Burn

| Item | Validação | Backlog |
|---|---|---|
| Endpoint e tela inicial de compensação | **OK-base.** `/marketplace/compensate` e `RetireCredits.tsx` existem. | Manter. |
| Formulário real de aposentadoria | **Pendente.** UI usa valores e projeto hardcoded (`PRC-2024-002`, 5000 tCO2e). | Criar seleção de projeto/vintage/saldo, escopos, quantidade e finalidade. |
| Validação de saldo antes de aposentar | **OK-base no backend.** `LedgerService.debit_account()` bloqueia saldo insuficiente. | Mostrar pré-validação na UI. |
| Burn/registro com hash e certificado | **Parcial.** Backend gera `burn_hash`, `certificateUrl` e ledger entry; UI só exibe alert e não mostra certificado. | Criar página de certificado/recibo de aposentadoria. |
| Página/visualização do certificado de impacto ambiental | **Pendente.** URL é retornada, mas não há rota/página de certificado. | Implementar `/certificados/:id` ou equivalente público. |
| Histórico de créditos aposentados por empresa | **Parcial.** Transações mostram aposentadorias; não há visão específica/histórico consolidado por empresa. | Criar histórico e filtros de aposentadoria. |

## 10. Inventário de Emissões

| Item | Validação | Backlog |
|---|---|---|
| Declaração e upload na API | **OK-base.** `/inventory/declare` e `/inventory/upload` existem com validação de tipo/tamanho/magic bytes. | Manter. |
| Tela de inventário com escopos, período e documentação | **Parcial.** `ImpactInventory` tem wizard visual sem API; `RegisterInventory` persiste escopos, mas não cobre período/documentação do fluxo empresarial. | Unificar UI de inventário com API e período/documentos. |
| Upload seguro com validação de tipo/tamanho | **OK-base no backend, pendente na UI.** Upload API existe; telas não chamam `/inventory/upload`. | Ligar upload da UI ao endpoint seguro. |
| Vincular inventário ao fluxo de compensação | **Pendente.** Não há vínculo persistido entre inventário declarado e aposentadoria. | Conectar inventário -> recomendação -> aposentadoria. |
| Dashboard de emissões versus créditos compensados | **Parcial.** Há resumo visual local; não cruza inventários persistidos com retirements/ledger. | Criar dashboard com dados persistidos. |

## 11. Tesouraria, Blockchain e Interoperabilidade

| Item | Validação | Backlog |
|---|---|---|
| Adapters e serviços backend | **OK-base.** Stellar/Soroban, Etherfuse/liquidity, Polygon, treasury e Soroban contract existem. | Manter provider smoke. |
| Tela/admin de tesouraria, lastro e yield 90/10 | **Pendente.** Só existe rota admin `POST /treasury/harvest` e tabelas `treasury_positions`/`yield_distributions`. | Criar console de tesouraria. |
| Tela/admin para mint bloqueado, unlock, transfer e burn | **Pendente.** Métodos/adapters/contrato existem, mas não há UI/admin. | Criar console blockchain operacional. |
| Exibir status Stellar/Soroban por projeto | **Parcial.** `/stellar/status` existe global; UI de projeto ainda tem texto antigo "Algorand" em `MrcaDetails`. | Exibir status Soroban/Stellar por projeto e remover textos legados. |
| Lock-and-mint Polygon para projeto externo | **OK-base backend, pendente UI.** Rota protegida existe; sem tela. | Criar fluxo de certificadora/admin para lock-and-mint. |
| Documentar visualmente provider bloqueado por falta de credenciais | **Parcial.** Bloqueios estão documentados em provider smoke; não há UI visual. | Criar painel de providers com status/bloqueios. |

## 12. Admin / Operação

| Item | Validação | Backlog |
|---|---|---|
| Dashboard admin operacional | **Pendente.** Não há área admin dedicada no frontend. | Criar dashboard operacional. |
| Gestão de usuários e papéis | **Pendente.** Auth tem papéis; não há CRUD admin. | Criar gestão de usuários/roles. |
| Gestão de organizações | **Parcial no banco, pendente UI.** `organizations` existe; catálogos públicos leem dados. | Criar CRUD de organizações. |
| Auditoria de eventos sensíveis | **Parcial no banco.** `audit_events` existe e é escrito por fluxos sensíveis; sem tela de consulta. | Criar tela de auditoria e filtros. |
| Reprocessamento/manual override | **Pendente.** Não há ferramenta admin para reprocessar projeto, ledger ou status. | Criar operações controladas com evento compensatório. |
| Health/status API, Postgres, providers e filas | **Parcial.** `/health` e docs de provider smoke existem; não há tela operacional. | Criar painel de health/status. |

## Regra transversal

**Regra:** tudo que aparecer como exemplo na interface precisa vir do banco/seed; não usar mock runtime no frontend.

**Validação:** a base técnica moveu os dados de demonstração para `supabase/seed.sql` e `src/services/database.ts` consome `/api/v1`. Testes de contrato também bloqueiam `MOCK_DB` e mocks antigos. Ainda assim, há violações de UX em telas que exibem dados fixos ou stubs:

- `RetireCredits.tsx` usa volume/projeto/beneficiário hardcoded no fluxo de aposentadoria.
- `MrcaDetails.tsx` mostra documentos fixos, auditoria com datas fixas e texto de rede legado "Algorand".
- `CreditMarketplace.tsx` usa `buyer_id: 'comp-001'` e preço fixo.
- `ImpactInventory.tsx` calcula localmente e não persiste.
- `AuditorReview.tsx` usa `mock://` para arquivos de evidência.

**Gate transversal:** criar validação de "runtime data source" por tela antes de aceitar novos fluxos: todo dado de demonstração deve estar no seed ou vir de endpoint `/api/v1`, e stubs devem aparecer claramente como bloqueios de escopo, não como operação real.

## Fases programadas no roadmap

1. **Phase 2: public-transparency-and-profiles** - público, dossiê de transparência, explorer, perfis públicos, cadastro por perfil, edição de perfil e erros amigáveis.
2. **Phase 3: project-origination-and-documents** - originação de projeto, 4 QTAGs/NFC, geofence, documentos reais e timeline canônica.
3. **Phase 4: certification-workbench** - revisão detalhada da certificadora, decisão técnica, certificado/documento, histórico e preparação de lastro/mint bloqueado.
4. **Phase 5: audit-monitoring-and-anomalies** - auditoria de campo, evidências reais, assinatura verificável, monitoramento NDVI, anomalias, bloqueio e desbloqueio.
5. **Phase 6: marketplace-wallet-and-retirement** - marketplace, checkout, carteira, ledger, recibos, aposentadoria, burn e certificado de impacto.
6. **Phase 7: emissions-inventory-and-compensation** - inventário de emissões, upload seguro, vínculo com compensação e dashboard emissões versus créditos.
7. **Phase 8: treasury-blockchain-and-interoperability** - tesouraria, providers, Soroban/Stellar, mint/unlock/transfer/burn e lock-and-mint Polygon.
8. **Phase 9: admin-operations-and-observability** - admin operacional, usuários, organizações, auditoria de eventos, overrides e health/status.
9. **Phase 10: security-compliance-and-data-governance** - requisitos transversais da Bible: segurança, privacidade, LGPD/GDPR, DPO, AML/CFT, qualidade, acessibilidade, backup/DR e auditoria externa.

## Matriz checklist -> fases

| Checklist | Fase base | Fases relacionadas | Observação de aceite |
|---|---|---|---|
| 1. Público e Transparência | Phase 2 | Phase 6, Phase 8, Phase 10 | Dossiê público deve refletir créditos, transações, status blockchain e limites de privacidade. |
| 2. Auth e Perfis | Phase 2 | Phase 9, Phase 10 | Cadastro/perfil ficam na Phase 2; provisionamento admin, RBAC, MFA e governança ficam nas Phases 9/10. |
| 3. Produtor / Originação do Projeto | Phase 3 | Phase 4, Phase 5, Phase 10 | Originação alimenta certificação, auditoria e controles de dados/geolocalização. |
| 4. Certificadora | Phase 4 | Phase 3, Phase 8, Phase 10 | Decisão técnica precisa consumir originação completa e preparar lastro/mint com trilha auditável. |
| 5. Auditoria | Phase 5 | Phase 4, Phase 10 | Auditoria precisa laudo/evidência/assinatura verificável e suporte a recálculo pela certificadora. |
| 6. Monitoramento e Anomalias | Phase 5 | Phase 9, Phase 10 | Anomalias exigem job/registro/listagem, notificação, bloqueio e desbloqueio auditável. |
| 7. Marketplace e Compra | Phase 6 | Phase 8, Phase 10 | Compra precisa checkout real, ledger, estoque e definição explícita de pagamento/settlement. |
| 8. Meus Créditos / Ledger | Phase 6 | Phase 8, Phase 9, Phase 10 | Carteira/ledger deve reconciliar transações off-chain, status on-chain e auditoria operacional. |
| 9. Aposentadoria / Burn | Phase 6 | Phase 8, Phase 10 | Burn/certificado precisa validar saldo, gerar recibo e respeitar limites de dados públicos. |
| 10. Inventário de Emissões | Phase 7 | Phase 6, Phase 10 | Inventário deve ser persistido e vinculado à compensação, com upload seguro. |
| 11. Tesouraria, Blockchain e Interoperabilidade | Phase 8 | Phase 4, Phase 6, Phase 10 | Providers sem credenciais devem falhar fechado e aparecer como bloqueio operacional. |
| 12. Admin / Operação | Phase 9 | Phase 2, Phase 8, Phase 10 | Admin deve cobrir usuários, organizações, eventos, overrides, health e filas. |
| Regra transversal de dados | Todas as Phases 2-10 | Phase 10 | Nenhuma fase pode concluir se uma tela nova usar mock runtime ou exemplo fora de seed/API. |

## Gate para planos futuros

Ao criar `PLAN.md` para qualquer Phase 2-10, incluir uma seção "Cobertura do checklist" com:

1. Itens do checklist cobertos pela fase.
2. Itens explicitamente fora de escopo.
3. Evidência de que telas novas consomem `/api/v1` ou dados de `supabase/seed.sql`.
4. UAT humano exigido para fluxos críticos, especialmente compra, aposentadoria, auditoria, anomalia, admin e compliance.
