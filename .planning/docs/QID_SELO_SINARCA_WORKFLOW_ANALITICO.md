# Workflow Analítico — QID, Selo Sinarca e Score de Risco

**Status:** documento analítico de produto, arquitetura e desenvolvimento
**Base:** PRD_QID_SELO_SINARCA_INTEGRIDADE.md
**Última atualização:** 2026-08-18

Copyright (c) 2026 SINARCA. Todos os direitos reservados. Este documento contém diretrizes proprietárias de produto, arquitetura e governança técnica para avaliação de integridade ambiental. O conteúdo não substitui laudo técnico, parecer jurídico, auditoria independente ou certificação regulatória. Reprodução, distribuição ou uso externo dependem de autorização formal da SINARCA.

## 1. Sumário Executivo

O QID, ou Qualified Integrity Data, é o mecanismo de prova de estado ambiental da SINARCA. Ele transforma imagens, índices, metadados de cena, qualidade analítica, hashes e assinaturas em uma sequência versionada e auditável.

O Selo Sinarca é a camada de comunicação e decisão que usa o QID, o motor de risco e a revisão humana para explicar se uma área está íntegra, sob observação, pendente de auditoria, em bloqueio operacional ou saneada.

A intenção deste documento é reduzir o ruído do chat original e entregar ao time uma referência operacional em dois níveis:

- uma visão consolidada para alinhamento de escopo;
- um detalhamento técnico suficiente para pontuar, planejar e desenvolver.

## 2. Problema Que o Workflow Resolve

O monitoramento ambiental por satélite pode gerar falsos positivos quando compara imagens sem considerar contexto. Queda natural de folhas, estresse hídrico sazonal, sombra de nuvem, baixa qualidade atmosférica e pixels mistos nas bordas do polígono podem parecer degradação real mesmo quando a área permanece íntegra.

Ao mesmo tempo, uma plataforma de ativos ambientais precisa provar integridade de forma auditável. Não basta mostrar uma imagem ou um número de NDVI. É necessário demonstrar:

- qual dado foi usado;
- como ele foi processado;
- qual estado foi medido;
- como esse estado se compara ao histórico;
- quem confirmou ou descartou uma anomalia;
- qual impacto a decisão teve no score de risco;
- se a prova pode ser revalidada no futuro.

## 3. Conceitos-Chave

| Conceito | Definição |
| --- | --- |
| QID | Pacote versionado de evidências ambientais e criptográficas de uma área |
| Genesis Hash | Primeiro snapshot imutável da área no onboarding |
| QID Hash | Hash composto do estado ambiental observado |
| Hash multi-índice | Composição de hashes individuais de NDVI, NDMI e RGB |
| Selo Sinarca | Representação explicável da integridade e confiança da área |
| Score de risco | Pontuação consolidada de sinais documentais, geoespaciais e ambientais |
| Auditoria pendente | Estado em que a autenticidade operacional fica bloqueada até validação |
| Append-only | Modelo em que versões novas são adicionadas sem alterar versões antigas |

## 4. Princípios de Arquitetura

- Determinismo: a mesma entrada processada pelo mesmo método deve produzir o mesmo QID Hash.
- Rastreabilidade: cada versão deve apontar fonte, cena, período, índices, parâmetros e decisão.
- Fail-closed: dado de baixa qualidade não deve virar conclusão crítica automaticamente.
- Separação de responsabilidades: satélite observa, QID prova estado, risco pontua, humano confirma eventos críticos.
- Mínima exposição pública: o selo deve comunicar confiança sem expor metadados sensíveis da área.
- Histórico imutável: correções, saneamentos e reprocessamentos geram novas versões.
- Não acusação automática: o sistema gera evidência e risco, não classificação jurídica automática.

## 5. Overview da Arquitetura

```text
Entrada territorial
  - polígono
  - documentos
  - organização
  - baseline inicial
        |
        v
Aquisição satelital
  - Sentinel-2 L2A
  - STAC Search
  - Statistical API
  - Process API para RGB
        |
        v
Qualidade analítica
  - filtro de nuvem
  - máscara de sombra
  - pixels válidos
  - buffer interno
  - normalização de raster
        |
        v
Observação ambiental
  - NDVI
  - NDMI
  - NBR
  - RGB
  - metadados da cena
        |
        +--------------------+
        |                    |
        v                    v
Ledger QID              Detector de anomalias
  - Genesis Hash          - comparação histórica
  - QID Hash              - sazonalidade
  - assinatura            - tiers de desvio
  - versão append-only    - confiança
        |                    |
        +----------+---------+
                   |
                   v
Evento ambiental e auditoria
  - detectado
  - analisado
  - confirmado
  - descartado
  - saneado
                   |
                   v
Motor de risco
  - risk_assessments
  - risk_signals
  - classe de risco
  - integridade operacional
                   |
                   v
Selo Sinarca
  - explicação pública
  - detalhe interno
  - trilha verificável
```

## 6. Arquitetura Atual no Código

Esta seção separa o que já está implementado do que é proposta de evolução.

| Camada | Implementado hoje | Evidência |
| --- | --- | --- |
| Contrato satelital | Interface `SatelliteProvider` com cenas, estatísticas e imagem | `backend_app/adapters/satellite.py` |
| Provedor Copernicus | Busca Sentinel-2 L2A via STAC e calcula estatísticas via Statistical API | `backend_app/adapters/copernicus.py` |
| Índices | NDVI, NDMI e NBR calculados por evalscript | `backend_app/adapters/copernicus.py` |
| Máscara de nuvem/sombra | SCL exclui sombra, nuvem média/alta e cirrus | `backend_app/adapters/copernicus.py` |
| Observações | Persistência idempotente em `satellite_observations` | `backend_app/modules/satellite/service.py`, `backend_app/db/models.py` |
| Baseline exibido | `project_baselines` com hash atual em SHA-256, NDVI médio e cena Sentinel | `backend_app/modules/satellite/service.py` |
| Anomalia | Detector puro compara observações consecutivas e cria sinal | `backend_app/modules/satellite/anomaly_detector.py` |
| Evento ambiental | Pipeline cria `ProjectEvent` e para antes de confirmação humana | `backend_app/modules/satellite/monitoring.py` |
| Score de risco | Motor puro soma sinais, satura 0-100 e grava histórico append-only | `backend_app/modules/integrity/risk_engine.py`, `backend_app/modules/integrity/service.py` |
| Sinal satelital no risco | Só anomalia confirmada, HIGH/CRITICAL e não saneada pesa no score | `backend_app/modules/integrity/risk_engine.py` |

## 7. Evolução Proposta Para QID Completo

| Camada | Necessidade | Observação |
| --- | --- | --- |
| Ledger QID | Nova tabela versionada append-only | Não substituir `project_baselines`; complementar |
| Genesis Hash | Primeira versão imutável no onboarding ou primeira cena válida | Deve preservar método e parâmetros |
| Hash multi-índice | SHA-3 sobre hashes de NDVI, NDMI e RGB | Exige normalização rigorosa |
| Assinatura Falcon 512 | Assinar o QID Hash e metadados de verificação | Pode ficar atrás de interface criptográfica |
| Sazonalidade | Comparar janela atual com período equivalente do histórico | Preferência por year-over-year |
| Buffer interno | Reduzir interferência de pixels mistos nas bordas | Deve preservar polígono original intocado |
| Estado QID | Criar state machine própria de integridade | Deve mapear para risco e auditoria |
| Verificador | Permitir validação interna ou externa do QID | Expor apenas metadados publicáveis |

## 8. Modelo de Dados Proposto

### 8.1 Tabela `qid_versions`

```text
qid_versions
  id
  project_id
  version_number
  parent_qid_version_id
  observation_id
  baseline_id
  qid_hash
  h_ndvi
  h_ndmi
  h_rgb
  hash_algorithm
  signature_algorithm
  signature
  signature_public_key_ref
  status_integrity
  delta_percentage
  comparison_basis
  comparison_window_start
  comparison_window_end
  cloud_coverage_pct
  cloud_shadow_pct
  valid_pixel_percentage
  edge_buffer_meters
  processing_version
  generated_at
  metadata
  created_at
```

### 8.2 Relação Com Tabelas Existentes

| Tabela existente | Relação com QID |
| --- | --- |
| `projects` | Entidade dona da área avaliada |
| `project_boundaries` | Fonte do polígono e tier de perímetro |
| `project_baselines` | Baseline ambiental atual, hoje com hash SHA-256 |
| `satellite_observations` | Fonte principal de índices e metadados por cena |
| `satellite_anomalies` | Resultado do detector de anomalias |
| `project_events` | Evento ambiental auditável criado a partir de anomalia |
| `risk_assessments` | Snapshot append-only do score |
| `risk_signals` | Explicação granular do score |
| `audit_events` | Trilha de mudanças e decisões humanas |

## 9. Entrada de Dados

### 9.1 Vem de Sentinel-2/Copernicus

- `scene_id`
- `observed_at`
- `processing_version`
- `product = L2A`
- `cloud_coverage`
- bandas B02, B03, B04, B08, B11, B12
- SCL para máscara de nuvem, sombra e cirrus
- RGB verdadeiro por Process API quando necessário
- estatísticas agregadas por intervalo via Statistical API

### 9.2 Derivado Pela SINARCA

- NDVI, NDMI e NBR consolidados por área e período.
- Percentual de pixels válidos.
- Baseline ambiental e Genesis Hash.
- Hash individual por índice.
- QID Hash composto.
- Assinatura do QID.
- Delta contra baseline ou janela sazonal.
- Tier de anomalia.
- Status de integridade.
- Sinal de risco.
- Selo exibido.

## 10. Cálculo do QID Hash

O QID Hash não deve ser calculado diretamente sobre uma imagem bruta sem normalização. A recomendação é criar um payload canônico, serializado de forma determinística, com os valores ambientais e metadados necessários.

Fluxo proposto:

1. Normalizar NDVI, NDMI e RGB para formato canônico.
2. Remover pixels inválidos conforme máscara e qualidade mínima.
3. Aplicar buffer interno apenas para análise, sem alterar o perímetro original.
4. Calcular hashes individuais:

```text
H_NDVI = SHA-3(payload_ndvi_normalizado)
H_NDMI = SHA-3(payload_ndmi_normalizado)
H_RGB  = SHA-3(payload_rgb_normalizado)
```

5. Calcular hash composto:

```text
QID_Hash = SHA-3(H_NDVI + H_NDMI + H_RGB)
```

6. Assinar o QID Hash:

```text
QID_Assinatura = Falcon512.sign(QID_Hash, chave_privada_sinarca)
```

7. Persistir versão append-only em `qid_versions`.

## 11. Comparação Sazonal

Comparar uma cena atual contra o mês imediatamente anterior é útil para detectar mudanças abruptas, mas pode gerar falso positivo em biomas com sazonalidade marcada.

A evolução QID deve suportar:

- comparação mês atual contra mesmo mês do ano anterior;
- janela histórica de referência por bioma;
- fallback para projetos novos sem histórico suficiente;
- marcação de baixa confiança quando não houver histórico;
- registro da base de comparação usada em `comparison_basis`.

Exemplos de `comparison_basis`:

- `GENESIS_BASELINE`
- `PREVIOUS_OBSERVATION`
- `YEAR_OVER_YEAR`
- `SEASONAL_WINDOW`
- `MANUAL_AUDIT_REFERENCE`

## 12. Filtros de Qualidade

| Risco | Tratamento esperado |
| --- | --- |
| Nuvem | Usar `maxCloudCoverage` e descartar cenas acima do limite |
| Sombra de nuvem | Usar SCL e rebaixar confiança quando houver contaminação |
| Cirrus | Excluir no cálculo de índices |
| Poucos pixels válidos | Não gerar conclusão crítica automática |
| Produto inadequado | Preferir Sentinel-2 L2A / BoA |
| Raster inconsistente | Normalizar antes de hashear |
| Polígono estreito | Aplicar buffer interno ou classificar baixa confiança |

Parâmetros atuais relevantes:

- nuvem máxima: 20%;
- nuvem preferencial: 10%;
- queda NDVI para anomalia: 15%;
- queda NBR para assinatura de fogo: 27%;
- janela histórica atual: 5 anos.

## 13. Gestão de Pixels Mistos

Pixels mistos aparecem quando a borda do polígono cruza estrada, pastagem, solo exposto, água ou outro uso do solo. Como Sentinel-2 trabalha na faixa de 10 a 20 metros por pixel, polígonos estreitos ou muito recortados podem gerar ruído relevante.

Regra recomendada:

- preservar o polígono legal original sem alteração;
- criar uma geometria analítica derivada com buffer interno;
- registrar `edge_buffer_meters`;
- se o buffer eliminar área demais, marcar baixa confiança;
- expor essa condição no detalhe técnico interno do selo.

## 14. State Machine do QID

| Estado | Significado | Próxima ação |
| --- | --- | --- |
| `GENESIS_CAPTURED` | Baseline inicial registrado | Monitoramento periódico |
| `STABLE` | Estado dentro da variação esperada | Manter selo ativo |
| `WATCH` | Desvio leve ou qualidade limitada | Aguardar nova cena |
| `PENDING_AUDIT` | Desvio relevante ou persistente | Bloquear autenticidade até revisão |
| `CONFIRMED_IMPACT` | Auditoria confirmou impacto ambiental | Enviar sinal ao risco |
| `DISMISSED` | Auditoria descartou falso positivo | Manter histórico e liberar selo |
| `CLEARED` | Evento confirmado foi saneado | Remover peso no recálculo |
| `ON_HOLD` | Risco crítico ou decisão operacional bloqueante | Exigir resolução formal |

## 15. Tiers de Anomalia

| Faixa | Interpretação | Ação |
| --- | --- | --- |
| 0% a 5% | Variação esperada | Sem ação operacional |
| 5% a 10% | Instabilidade leve | Alerta silencioso |
| 10% a 15% | Atenção técnica | Reforçar próxima medição e revisar qualidade |
| Acima de 15% | Anomalia provável | Gerar auditoria pendente |
| Acima de 15% persistente | Anomalia forte | Bloquear autenticidade até decisão |
| NDVI + NDMI + RGB alterados | Mudança de estado completa | Prioridade alta de auditoria |
| NDVI + NBR alterados | Possível fogo | Prioridade alta/crítica conforme severidade |

## 16. Integração Com Score de Risco

O QID não deve somar risco diretamente a cada variação. Ele deve alimentar o pipeline de eventos ambientais.

Fluxo recomendado:

1. QID detecta desvio e classifica tier.
2. Desvio leve vira `WATCH`, sem impacto no score.
3. Desvio forte vira `PENDING_AUDIT`, com bloqueio de autenticidade.
4. Auditoria humana confirma ou descarta.
5. Apenas evento confirmado, HIGH ou CRITICAL, entra no motor de risco.
6. Evento saneado deixa de pesar no próximo recálculo.

Na arquitetura atual, o motor de risco já segue o princípio de que evento satelital só pesa quando está confirmado e ainda não foi saneado.

## 17. Selo Sinarca

O Selo Sinarca deve comunicar integridade sem expor dados sensíveis. Ele deve ter dois níveis de leitura.

### 17.1 Visão Pública ou Externa

- status geral de integridade;
- última verificação;
- classe de risco;
- existência de pendência de auditoria, quando publicável;
- hash ou prova verificável quando aplicável;
- texto claro de limitação metodológica.

### 17.2 Visão Interna

- QID versionado;
- delta por índice;
- comparação usada;
- qualidade da cena;
- nuvem, sombra e pixels válidos;
- buffer aplicado;
- evento relacionado;
- decisão humana;
- sinais que compõem o score;
- trilha de auditoria.

## 18. Frontend, UX e Dashboards

A frente de frontend precisa evoluir junto com o QID. Se o cálculo ficar correto, mas a experiência continuar fragmentada, o time não conseguirá operar, explicar ou vender a confiança do Selo Sinarca.

### 18.1 Arquitetura Frontend Atual

| Área | Rotas principais | Componentes/páginas |
| --- | --- | --- |
| Portal público | `/`, `/consulta`, `/projeto/:id`, `/compliance`, `/ciclo-credito`, `/mapa-projetos` | `LandingPage`, `Feed`, `MrcaDetails`, `Compliance`, `CreditCycle`, `GlobalMap` |
| Painel logado | `/painel`, `/painel/projetos`, `/painel/selo-sinarca`, `/painel/monitoramento`, `/painel/auditoria` | `Overview`, `Feed`, `RiskScoreMethodology`, `MonitoringNDVI`, `AuditorReview` |
| Certificadora | `/painel/certificadora`, `/painel/certificadora/cadastro` | `CertifierReview`, `CertifierPanel` |
| Empresa | `/painel/marketplace`, `/painel/calculadora`, `/painel/inventario`, `/painel/aposentar` | `CreditMarketplace`, `Calculator`, `ImpactInventory`, `RetireCredits` |
| Layout | `/painel/*` | `DashboardLayout` com navegação por perfil |

### 18.2 Problemas de Experiência a Resolver

- O Selo Sinarca ainda aparece como explicação metodológica, não como experiência operacional conectada ao projeto.
- As telas públicas precisam explicar melhor o que é confiança, risco, monitoramento e auditoria.
- Os dashboards logados precisam de hierarquia visual mais clara entre status, risco, pendência e ação.
- A jornada entre projeto, score, monitoramento NDVI, anomalia e auditoria ainda deve ficar mais fluida.
- Métricas críticas precisam aparecer com drill-down, não apenas como cards soltos.
- Estados de carregamento, erro, ausência de dados e baixa confiança precisam ser consistentes.
- A responsividade mobile precisa ser tratada como requisito, não como ajuste final.
- O texto das telas precisa diferenciar metodologia, evidência, certificação, auditoria e status operacional.

### 18.3 Área Pública

Objetivo: compradores, parceiros e visitantes precisam entender a confiabilidade do ativo sem precisar conhecer o backend.

Melhorias recomendadas:

- Criar componente público do Selo Sinarca com classe, última verificação e explicação curta.
- Melhorar `/projeto/:id` para mostrar score, integridade, origem do dado e limites metodológicos.
- Melhorar `/consulta` para permitir busca e comparação por status de integridade.
- Melhorar `/compliance` e `/ciclo-credito` com fluxo visual do QID e do selo.
- Separar linguagem pública de linguagem técnica interna.
- Evitar exposição de geometria sensível, série completa e metadados internos.

### 18.4 Área Logada

Objetivo: operadores precisam saber o que aconteceu, por que aconteceu e qual decisão tomar.

Melhorias recomendadas:

- Evoluir `/painel/selo-sinarca` para aceitar contexto de projeto.
- Exibir breakdown real do score por `risk_signals`.
- Exibir timeline QID com Genesis Hash, versões, deltas e decisões.
- Integrar atalhos para `/painel/monitoramento/:projectId` e fila de auditoria.
- Mostrar diferença entre anomalia detectada, analisada, confirmada, descartada e saneada.
- Exibir qualidade da cena: nuvem, pixels válidos, sombra e base de comparação.
- Dar tratamento visual forte para `PENDING_AUDIT`, `ON_HOLD` e `CLEARED`.
- Criar estados vazios úteis para projetos sem histórico Sentinel suficiente.

### 18.5 Dashboards Operacionais

| Dashboard | O que precisa mostrar | Usuário principal |
| --- | --- | --- |
| Carteira | distribuição de risco, projetos em auditoria, projetos estáveis, eventos recentes | gestor/produtor |
| Projeto | selo, score, QID atual, linha do tempo, pendências e ações | produtor/certificadora |
| Monitoramento | mapa, séries NDVI/NDMI/NBR, qualidade da cena, anomalias | auditor/produtor |
| Auditoria | fila priorizada, evidências, decisão e justificativa | auditor |
| Público | confiança, rastreabilidade e explicação segura | comprador/parceiro |

### 18.6 Requisitos de UI

- Usar componentes visuais consistentes para selo, classe de risco, status de auditoria e qualidade de dado.
- Garantir leitura em desktop e mobile.
- Evitar sobreposição de textos, métricas e mapas.
- Criar navegação clara entre metodologia geral e avaliação de um projeto específico.
- Incluir tooltips ou textos curtos para termos técnicos como NDVI, NDMI, NBR, QID e Genesis Hash.
- Manter a tela pública mais simples e a tela interna mais detalhada.
- Usar copy objetiva: o usuário deve entender a decisão sem ler documentação técnica.

### 18.7 Entregáveis de Frontend

| Entregável | Prioridade | Resultado |
| --- | --- | --- |
| Componente visual do Selo Sinarca | P0 | Reuso em público e logado |
| Página detalhada do Selo por projeto | P0 | Score, sinais, QID e ações |
| Timeline QID/eventos | P1 | Auditoria visual do histórico |
| Dashboard de risco da carteira | P1 | Priorização operacional |
| Melhoria do detalhe público do projeto | P1 | Transparência para compradores |
| Estados vazios/erro/loading padronizados | P1 | Redução de confusão operacional |
| Revisão mobile dos dashboards | P1 | Uso em campo e reuniões |
| Guia visual de status e cores | P2 | Consistência entre telas |

## 19. Backlog Pontuado

| Épico | Prioridade | Esforço | Dependência | Resultado |
| --- | --- | --- | --- | --- |
| Criar `qid_versions` | P0 | 8 pts | Modelos/migration | Histórico append-only |
| Gerar Genesis Hash | P0 | 5 pts | Baseline/cena válida | Identidade inicial da área |
| Hash multi-índice SHA-3 | P0 | 5 pts | Normalização de payload | QID Hash determinístico |
| Vincular QID a observação satelital | P0 | 5 pts | `satellite_observations` | Rastreabilidade por cena |
| State machine QID | P1 | 5 pts | `qid_versions` | Estados de integridade |
| Comparação sazonal | P1 | 8 pts | Histórico suficiente | Menos falso positivo |
| Buffer interno | P1 | 3 pts | Geometria analítica | Menos ruído de borda |
| Qualidade de sombra/nuvem detalhada | P1 | 5 pts | Métricas por cena | Confiança explícita |
| Integração QID -> evento -> risco | P1 | 5 pts | State machine | Score coerente |
| UI interna do Selo detalhado | P1 | 5 pts | API de QID | Transparência operacional |
| Componente visual do Selo | P0 | 5 pts | Tokens/status do Selo | Reuso em público e logado |
| Página do Selo por projeto | P0 | 8 pts | API de QID + risk_signals | Decisão operacional clara |
| Refinamento área pública | P1 | 5 pts | Copy/metodologia aprovada | Confiança para compradores |
| Refinamento dashboards logados | P1 | 8 pts | Dados de QID/risco | Operação por carteira/projeto |
| Padronização mobile e estados | P1 | 5 pts | Componentes compartilhados | Experiência robusta em campo |
| Assinatura Falcon 512 | P2 | 8 pts | Biblioteca/infra de chaves | Prova pós-quântica |
| Verificador externo | P2 | 8 pts | Hash + assinatura | Auditoria independente |
| Integração drone/RGB alta resolução | P3 | 8 pts | Provedor e storage | Confirmação complementar |

## 20. Critérios de Aceite

- Dado um projeto com primeira cena válida, o sistema cria `GENESIS_CAPTURED`.
- Dado um novo ciclo Sentinel-2 válido, o sistema cria nova versão QID sem alterar versões anteriores.
- Dado o mesmo payload canônico, o sistema gera o mesmo QID Hash.
- Dado payload alterado em NDVI, NDMI ou RGB, o QID Hash muda.
- Dado cena com nuvem ou sombra acima do limite, o sistema não cria impacto crítico automaticamente.
- Dado desvio leve, o sistema cria `WATCH` sem alterar score.
- Dado desvio acima de 15%, o sistema cria `PENDING_AUDIT`.
- Dado evento confirmado HIGH/CRITICAL, o score incorpora o sinal satelital.
- Dado evento saneado, o próximo recálculo remove o peso correspondente.
- Dado QID publicado, um verificador consegue validar hash e assinatura sem acessar dados sensíveis.
- Dado um visitante público, a página do projeto explica o Selo Sinarca sem expor dados sensíveis.
- Dado um usuário logado, a página do projeto mostra score, sinais, QID, eventos e ação recomendada.
- Dado um auditor em campo, os dashboards funcionam em viewport mobile sem perda de contexto ou sobreposição.

## 21. Riscos Técnicos

| Risco | Mitigação |
| --- | --- |
| Falcon 512 sem biblioteca madura no stack atual | Criar interface criptográfica e feature flag |
| Hash instável por variação de raster | Canonicalizar payload e versionar método |
| Sazonalidade insuficiente em projetos novos | Fallback para Genesis Hash e classificação de baixa confiança |
| Buffer reduz área útil demais | Registrar perda de área e rebaixar confiança |
| Alto custo de imagens RGB frequentes | Usar RGB detalhado apenas sob demanda ou em anomalia |
| Confusão entre selo e laudo legal | Texto de limitação e revisão humana explícitos |
| Experiência pública simplifica demais o risco | Separar selo resumido de detalhe técnico interno |
| Dashboard logado vira excesso de cards | Priorizar jornada, ação e drill-down |
| Mobile quebra mapas e tabelas | Criar layouts responsivos específicos por painel |

## 22. Perguntas Para Fechamento de Escopo

- Falcon 512 entra no MVP ou fica para a etapa de verificação externa?
- Qual largura padrão do buffer interno por bioma e formato de polígono?
- Qual histórico mínimo habilita comparação year-over-year confiável?
- O QID será registrado apenas no banco, também em blockchain, ou ambos?
- Qual parte do QID Hash será pública?
- Quem pode confirmar, descartar ou sanear uma anomalia QID?
- Quais estados do Selo podem aparecer para público externo?
- Qual é a diferença visual entre Selo público, Selo interno e bloqueio operacional?
- Quais dashboards são prioridade: carteira, projeto, auditoria ou marketplace?

## 23. Sequência Recomendada de Implementação

1. Criar o ledger `qid_versions` e eventos de auditoria correspondentes.
2. Gerar Genesis Hash usando primeira observação Sentinel válida.
3. Implementar payload canônico e QID Hash multi-índice.
4. Expor API interna para histórico e detalhe do QID.
5. Integrar state machine QID com anomalias e eventos ambientais.
6. Atualizar tela do Selo com leitura sintética e detalhe técnico.
7. Criar componente visual reutilizável do Selo para área pública e logada.
8. Refinar dashboard do projeto com score, QID, timeline, monitoramento e ação.
9. Refinar dashboards de carteira, monitoramento e auditoria.
10. Implementar comparação sazonal year-over-year.
11. Implementar buffer interno e métricas de qualidade avançadas.
12. Encapsular assinatura Falcon 512 em interface criptográfica.
13. Criar verificador externo controlado.

## 24. Definição de Pronto

Uma entrega do QID/Selo só deve ser considerada pronta quando:

- o histórico for append-only;
- o cálculo for determinístico;
- os parâmetros usados estiverem persistidos;
- o score tiver explicação por sinais;
- anomalias críticas dependerem de confirmação humana;
- dados de baixa qualidade falharem fechado;
- a UI diferenciar visão pública e interna;
- dashboards públicos e logados estiverem responsivos e sem sobreposição;
- telas mostrarem ação recomendada, não apenas métrica;
- o time conseguir auditar uma avaliação do Genesis Hash até o estado atual.
