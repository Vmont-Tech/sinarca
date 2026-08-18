# Workflow Sintético — QID e Selo Sinarca

**Status:** documento de alinhamento executivo e de produto
**Base:** PRD_QID_SELO_SINARCA_INTEGRIDADE.md
**Última atualização:** 2026-08-18

Copyright (c) 2026 SINARCA. Todos os direitos reservados. Este documento descreve uma metodologia proprietária de avaliação de integridade ambiental e deve ser usado internamente para alinhamento de produto, arquitetura, desenvolvimento e governança. Reprodução, distribuição ou uso externo dependem de autorização formal da SINARCA.

## 1. Objetivo

Transformar o workflow técnico do QID e do Selo Sinarca em uma visão simples, compreensível por produto, negócio, engenharia, auditoria e parceiros.

O documento responde a quatro perguntas:

- O que é o QID?
- Como o Selo Sinarca usa esse QID?
- Onde entram Sentinel-2, risco, auditoria e criptografia?
- Quais partes já existem e quais são evolução?

## 2. Definição em Uma Frase

O QID, ou Qualified Integrity Data, é a prova versionada do estado ambiental de uma área; o Selo Sinarca é a tradução dessa prova em um indicador auditável de integridade, risco e confiança.

## 3. Fluxo Alto Nível

1. A área é cadastrada com polígono, documentos e contexto territorial.
2. O sistema consulta Sentinel-2 via Copernicus para obter cenas, bandas e estatísticas ambientais.
3. A plataforma calcula ou consolida índices como NDVI, NDMI, NBR e RGB.
4. O QID registra o estado observado da área em uma versão imutável.
5. O motor compara a nova observação contra o histórico, respeitando sazonalidade, nuvens, sombra e qualidade de pixels.
6. Desvios relevantes geram níveis de atenção, pendência de auditoria ou bloqueio operacional.
7. O motor de risco transforma sinais confirmados em score e classe de integridade.
8. O Selo Sinarca apresenta a avaliação de forma explicável, verificável e adequada ao público certo.

## 4. Overview da Arquitetura

```text
Polígono + documentos + baseline
        |
        v
Sentinel-2 L2A / Copernicus
        |
        v
Qualidade da cena + índices ambientais
        |
        v
Observação satelital versionada
        |
        +----> QID Hash + assinatura + trilha append-only
        |
        v
Detector de anomalia e comparação sazonal
        |
        v
Evento ambiental e revisão humana
        |
        v
Motor de risco + Selo Sinarca
```

## 5. O Que Vem do Sentinel e o Que é Sinarca

| Bloco | Origem | Papel |
| --- | --- | --- |
| Cena Sentinel-2 | Copernicus | Fonte primária de observação remota |
| Produto L2A / BoA | Copernicus | Reflectância de superfície já corrigida atmosfericamente |
| Bandas espectrais | Sentinel-2 | Base para RGB, NDVI, NDMI e NBR |
| Cobertura de nuvem | Copernicus | Filtro de qualidade da cena |
| Máscara de sombra/nuvem | Sentinel/Copernicus | Redução de falso positivo |
| NDVI, NDMI, NBR | Derivado das bandas | Indicadores de vegetação, umidade e fogo |
| QID Hash | SINARCA | Prova composta e versionada do estado da área |
| Assinatura Falcon 512 | SINARCA | Selo criptográfico de integridade pós-quântica |
| Score de risco | SINARCA | Consolidação de sinais territoriais, documentais e ambientais |
| Selo Sinarca | SINARCA | Comunicação auditável do estado de integridade |

## 6. Níveis da Avaliação

| Nível | Condição | Ação |
| --- | --- | --- |
| Estável | Variação dentro do comportamento esperado | Mantém selo e histórico |
| Observação | Desvio leve, tipicamente 5% a 10% | Alerta silencioso e espera nova janela |
| Atenção | Desvio intermediário ou baixa confiança da cena | Mantém monitoramento reforçado |
| Auditoria pendente | Desvio acima de 15% ou persistência de anomalia | Bloqueia autenticidade até validação |
| Impacto confirmado | Anomalia confirmada por auditoria ou evidência complementar | Entra no score de risco |
| Saneado | Evento revisado e resolvido | Remove peso no próximo recálculo |

## 7. Decisões Centrais

- O QID não é uma imagem isolada. Ele é um pacote de evidências do estado ambiental.
- O Selo Sinarca não deve depender de uma única métrica. Ele deve consolidar índices, histórico, qualidade da imagem, documentos, conflitos e auditoria.
- O sistema não deve gerar acusação automática de desmatamento. Ele deve gerar evidência, risco e pendência de auditoria.
- O score só deve incorporar anomalia satelital depois de confirmação humana quando o impacto for alto ou crítico.
- O histórico deve ser append-only: correção gera nova versão, não sobrescreve o passado.

## 8. O Que Já Existe na Plataforma

- Ingestão Sentinel-2 L2A via Copernicus.
- Cálculo de estatísticas NDVI, NDMI e NBR.
- Filtro de nuvem e sombra no pipeline atual.
- Persistência de observações satelitais.
- Detecção de anomalias por queda de NDVI e assinatura de fogo via NBR.
- Eventos ambientais vinculados à revisão humana.
- Motor de risco append-only com sinais explicáveis.
- Página explicativa do Selo Sinarca no painel.

## 9. Evolução Necessária Para o QID Completo

- Criar tabela versionada de QID.
- Gerar Genesis Hash no onboarding da área.
- Gerar hash multi-índice com NDVI, NDMI e RGB.
- Assinar o QID Hash com Falcon 512.
- Comparar observações com sazonalidade year-over-year.
- Aplicar buffer interno nas bordas para reduzir pixels mistos.
- Expor histórico do QID para auditoria.
- Criar verificador público ou semi-público do Selo Sinarca.

## 10. Pontuação Inicial Para Desenvolvimento

| Frente | Prioridade | Esforço sugerido |
| --- | --- | --- |
| Ledger QID append-only | P0 | 8 pts |
| Hash multi-índice SHA-3 | P0 | 5 pts |
| Genesis Hash no onboarding | P0 | 5 pts |
| Integração com observações Sentinel existentes | P0 | 5 pts |
| Comparação sazonal year-over-year | P1 | 8 pts |
| Buffer interno de borda | P1 | 3 pts |
| Estados de auditoria QID | P1 | 5 pts |
| Exibição interna do Selo detalhado | P1 | 5 pts |
| Componente visual do Selo | P0 | 5 pts |
| Página do Selo por projeto | P0 | 8 pts |
| Refinamento da área pública | P1 | 5 pts |
| Refinamento dos dashboards logados | P1 | 8 pts |
| Padronização mobile, loading e erro | P1 | 5 pts |
| Assinatura Falcon 512 | P2 | 8 pts |
| Verificador externo do selo | P2 | 8 pts |

Essa pontuação é uma referência inicial para discussão do time, não um compromisso fechado de sprint.

## 11. Frente de Frontend e Experiência

O Selo Sinarca precisa ser entendido como produto, não apenas como cálculo. A evolução deve melhorar muito a experiência visual e operacional nas telas públicas, telas logadas e dashboards.

### 11.1 Área Pública

Objetivo: explicar confiança sem expor dado sensível.

- Criar leitura pública clara do que o selo significa.
- Melhorar páginas públicas de projeto, compliance, ciclo de crédito e transparência.
- Exibir status de integridade, última verificação e metodologia em linguagem simples.
- Evitar que o público confunda o selo com laudo jurídico, regulatório ou certificação externa.
- Criar componentes visuais consistentes para selo, classe de risco, verificação e pendência.

Rotas relacionadas hoje:

- `/projeto/:id`
- `/consulta`
- `/compliance`
- `/ciclo-credito`
- `/mapa-projetos`

### 11.2 Área Logada

Objetivo: dar ferramenta de decisão para produtor, auditor, certificadora e empresa.

- Melhorar dashboard com leitura rápida de risco, pendências e próximos passos.
- Evoluir `/painel/selo-sinarca` de explicativo estático para página com metodologia e dados do projeto.
- Integrar Selo, QID, monitoramento NDVI e auditoria em uma jornada única.
- Mostrar linha do tempo de versões QID e eventos ambientais.
- Exibir sinais que compõem o score com pesos, evidências e status.
- Refinar estados vazios, loading, erro, permissões e responsividade mobile.

Rotas relacionadas hoje:

- `/painel`
- `/painel/selo-sinarca`
- `/painel/monitoramento`
- `/painel/auditoria`
- `/painel/certificadora`
- `/painel/projetos`

### 11.3 Dashboards

Objetivo: sair de páginas informativas para painéis operacionais.

- Dashboard executivo com saúde geral da carteira.
- Dashboard do projeto com score, selo, QID, anomalias e auditorias.
- Dashboard de auditoria com fila, prioridade, evidências e decisão.
- Dashboard de monitoramento com mapa, série temporal, qualidade de cena e alerta.
- Dashboard público com transparência suficiente para compradores e parceiros.

## 12. Resultado Esperado

Ao final da evolução, qualquer avaliação do Selo Sinarca deve responder de forma rastreável:

- qual área foi avaliada;
- qual cena ou período foi usado;
- quais índices foram considerados;
- qual era o estado anterior;
- qual é o delta atual;
- qual versão do QID foi gerada;
- qual assinatura garante a integridade;
- qual decisão operacional foi tomada;
- qual impacto isso teve no score de risco.
