# PRD — QID e Selo Sinarca de Integridade

**Produto:** SINARCA  
**Área:** Integridade, monitoramento satelital e selo de risco  
**Status:** Proposto para evolução  
**Origem:** Sugestões técnicas recebidas em 17/08/2026  
**Última atualização:** 17/08/2026  

## 1. Resumo Executivo

O Selo Sinarca de Integridade deve evoluir de uma apresentação de score de risco para uma prova técnica auditável do estado ambiental, documental e territorial de um projeto.

Essa evolução introduz o conceito de **QID — Qualified Integrity Data**, um "KYC geográfico" que registra a identidade de estado da área ao longo do tempo. O QID não deve ser tratado como uma imagem isolada ou uma variável simples. Ele deve funcionar como um agregado versionado de evidências, com hashes multi-índice, assinatura criptográfica e trilha histórica verificável desde o baseline inicial.

O objetivo é reduzir falsos positivos, aumentar confiança institucional no selo e permitir auditoria retrospectiva da trajetória de integridade de cada área.

## 2. Problema

O monitoramento ambiental por satélite pode gerar falsos positivos quando o sistema interpreta variações naturais ou artefatos técnicos como degradação real.

Os principais riscos são:

- Sazonalidade natural de biomas, como queda de folhas, estresse hídrico e transições climáticas.
- Sombras de nuvens e falhas de correção atmosférica confundidas com queda brusca de NDVI, NDMI ou NBR.
- Pixels mistos em bordas de polígonos, especialmente próximos a estradas, pastagens ou áreas estreitas.
- Dependência excessiva de um único índice de vegetação.
- Falta de um registro imutável e versionado do estado ambiental ao longo do tempo.

Sem esses controles, o Selo Sinarca pode gerar alarmes indevidos, bloquear ativos legítimos ou perder credibilidade operacional.

## 3. Objetivos

- Definir o QID como uma prova de estado imutável e versionada.
- Tornar o cálculo do Selo Sinarca mais robusto contra sazonalidade, nuvens, sombras e pixels mistos.
- Registrar a evolução temporal da integridade ambiental com hashes por ciclo de medição.
- Usar hash composto multi-índice para identificar qual dimensão ambiental mudou.
- Criar tiers de anomalia que evitem bloqueios prematuros por ruído estatístico.
- Preservar uma trilha auditável para inspeção técnica, certificadora, comprador e governança interna.

## 4. Não Objetivos

- Substituir certificação independente, auditoria de campo ou decisão regulatória.
- Declarar integridade absoluta de um ativo ambiental.
- Transformar o Selo Sinarca em garantia jurídica isolada.
- Bloquear automaticamente projetos por variações leves e não persistentes.
- Expor metadados sensíveis ou identificadores internos em leitura pública.

## 5. Posicionamento do Selo

### Copy institucional

**Selo Sinarca de Integridade**  
Avaliação computacional auditável da integridade ambiental, territorial e documental de um projeto.

O selo comunica risco calculado, evidências consideradas e trajetória de integridade. Ele não substitui certificação independente, decisão regulatória ou auditoria externa. Sua função é tornar verificável o estado de confiança de um projeto dentro do ecossistema Sinarca.

### Promessa de produto

O Selo Sinarca deve responder a três perguntas:

1. O projeto mantém coerência ambiental em relação ao baseline?
2. As evidências documentais e geoespaciais sustentam as declarações feitas?
3. Existe algum sinal técnico que exija retenção, revisão ou auditoria complementar?

## 6. Conceito do QID

O **Qualified Integrity Data** é o conjunto versionado de evidências que representa o estado de uma área em um ciclo de monitoramento.

Cada QID deve ser composto por:

- Snapshot RGB da área.
- Índices de vegetação e umidade, incluindo NDVI e NDMI.
- Metadados de aquisição e processamento.
- Hashes individuais por índice.
- Hash composto final.
- Assinatura criptográfica.
- Status de integridade.
- Delta percentual em relação ao baseline ou à janela sazonal comparável.

## 7. Estrutura de Hashes

### 7.1 Genesis Hash

O **Genesis Hash** representa o primeiro snapshot confiável da reserva.

Ele deve ser gerado no onboarding do projeto a partir de:

- Imagem RGB validada.
- Índices calculados no baseline.
- Geometria do projeto.
- Metadados mínimos de aquisição e processamento.

Esse hash é fixo e imutável. Ele representa a identidade ambiental inicial da área.

### 7.2 Hash de Atualização

A cada novo ciclo de processamento, o sistema deve gerar um hash de atualização.

Esse hash representa o estado ambiental daquele ciclo e deve ser comparável ao baseline e à janela sazonal equivalente.

### 7.3 Hash Composto Multi-Índice

O QID final não deve depender de um único índice.

Processamento proposto:

```text
H_NDVI = hash do estado NDVI
H_NDMI = hash do estado NDMI
H_RGB  = hash do estado RGB

QID_Hash = SHA-3(H_NDVI + H_NDMI + H_RGB)
```

Essa estrutura permite diferenciar tipos de mudança:

- NDVI muda, RGB estável: possível estresse hídrico ou variação fenológica.
- NDVI e NDMI mudam, RGB pouco alterado: possível perda de vigor ou umidade.
- NDVI, NDMI e RGB mudam drasticamente: possível mudança de estado completa, como corte, fogo ou supressão vegetal.

## 8. Assinatura Criptográfica

Cada QID deve ser selado com assinatura pós-quântica usando **Falcon 512**, conforme estratégia técnica definida para robustez criptográfica.

Requisitos:

- Assinar o QID Hash final.
- Preservar o algoritmo e versão da assinatura nos metadados.
- Registrar chave pública/verificador associado ao ciclo.
- Impedir alteração retroativa de versões já assinadas.
- Permitir verificação externa futura sem depender de estado mutável da aplicação.

## 9. Sazonalidade e Comparação Temporal

O motor de anomalias deve considerar a sazonalidade natural de cada bioma.

Requisitos:

- Comparar o mês atual com o mesmo período do ano anterior sempre que houver histórico suficiente.
- Preferir baseline sazonal por mês, bioma e região quando houver série multi-anual.
- Evitar comparação ingênua mês contra mês imediatamente anterior quando a estação seca ou chuvosa alterar naturalmente os índices.
- Registrar no QID qual janela temporal foi usada como referência.
- Expor no painel técnico se a anomalia foi medida contra baseline anual, year-over-year ou fallback por falta de histórico.

Exemplo: em Tocantins e áreas de transição, queda natural de vigor vegetal na estação seca não deve ser tratada automaticamente como supressão.

## 10. Nuvem, Sombra e Correção Atmosférica

O pipeline deve priorizar produtos Sentinel-2 de reflectância de superfície **BoA / Nível 2A**.

Requisitos:

- Usar máscaras rigorosas de nuvem.
- Usar máscara de sombra de nuvem.
- Rejeitar cenas acima do limite máximo de cobertura de nuvem configurado.
- Marcar cenas com risco de contaminação atmosférica como baixa confiança.
- Registrar o percentual de nuvem e o método de filtragem no QID.
- Evitar que sombras de nuvem sejam interpretadas como queda drástica de NDVI ou anomalia ambiental.

## 11. Pixels Mistos e Bordas

Como o Sentinel-2 trabalha com resolução espacial de aproximadamente 10 a 20 metros por pixel, bordas de polígonos podem misturar vegetação nativa com estrada, pastagem, água ou área antrópica.

Requisitos:

- Aplicar buffer interno de segurança nas análises de borda.
- Registrar a largura do buffer usado.
- Preservar a geometria original do projeto para fins jurídicos e cadastrais.
- Usar a geometria com buffer apenas para purificar o sinal analítico.
- Expor quando a área analisável ficou abaixo de um mínimo confiável.
- Tratar polígonos estreitos como casos de baixa confiança se o buffer eliminar área excessiva.

## 12. Tiers de Anomalia

O sistema não deve depender de um único percentual fixo para decidir anomalias.

### Nível 1 — Monitoramento de Estabilidade

**Faixa:** 5% a 10% de desvio  
**Ação:** Alerta silencioso  
**Comportamento esperado:**

- Registrar discrepância no QID.
- Aguardar próxima janela de medição.
- Escalar apenas se o desvio persistir ou aumentar.

**Racional:** variações atmosféricas residuais, pixel misto ou sazonalidade local podem produzir ruído nessa faixa.

### Nível 2 — Anomalia Provável

**Faixa:** acima de 15% de desvio  
**Ação:** Auditoria pendente e retenção da autenticidade do ativo ambiental  
**Comportamento esperado:**

- Abrir pendência de auditoria técnica.
- Bloquear a confiança do selo até nova validação.
- Recomendar verificação por imagem RGB de maior resolução, drone ou auditoria de campo.

**Racional:** queda acima de 15% em índices como NDVI/NDMI tende a indicar evento físico relevante, como corte, fogo ou seca extrema.

## 13. State Machine do QID

O QID deve ter tabela de versões, e não apenas colunas soltas no projeto.

Modelo lógico mínimo:

```json
{
  "timestamp": "2026-08-17T21:57:37-03:00",
  "qid_hash": "sha3...",
  "status_integrity": "STABLE | WATCH | PENDING_AUDIT | ON_HOLD | CLEARED",
  "delta_percentage": 0.0
}
```

Campos recomendados:

- `id`
- `project_id`
- `timestamp`
- `genesis_hash`
- `qid_hash`
- `h_ndvi`
- `h_ndmi`
- `h_rgb`
- `status_integrity`
- `delta_percentage`
- `reference_window`
- `biome`
- `cloud_coverage_pct`
- `cloud_shadow_pct`
- `edge_buffer_meters`
- `analyzable_area_ha`
- `signature_algorithm`
- `signature`
- `public_key_id`
- `created_at`

## 14. Integração com Score de Risco

O QID deve alimentar o Selo Sinarca sem substituir o motor de risco existente.

Integração esperada:

- QID estável não adiciona sinal de risco.
- Nível 1 persistente pode gerar sinal informativo ou pendência técnica.
- Nível 2 confirmado deve gerar sinal de anomalia satelital de alta severidade.
- Mudança completa de estado multi-índice deve gerar sinal crítico.
- Eventos saneados devem deixar de pesar no score após novo recálculo.

O score continua sendo uma soma saturada de sinais ativos, com explicação preservada por sinal.

## 15. Requisitos Funcionais

### QID-01 — Geração de Genesis Hash

Ao concluir onboarding técnico de um projeto, o sistema deve gerar e persistir o Genesis Hash da área.

### QID-02 — Geração de QID por Ciclo

A cada ciclo válido de monitoramento, o sistema deve gerar um novo QID versionado.

### QID-03 — Hash Multi-Índice

O sistema deve calcular hashes individuais para NDVI, NDMI e RGB, depois gerar o hash composto final via SHA-3.

### QID-04 — Assinatura Falcon 512

O sistema deve assinar cada QID Hash com Falcon 512 e preservar metadados de verificação.

### QID-05 — Comparação Sazonal

O motor deve comparar observações contra janela sazonal equivalente, preferencialmente year-over-year.

### QID-06 — Máscara de Nuvem e Sombra

O pipeline deve descartar ou rebaixar confiança de cenas contaminadas por nuvem, sombra ou baixa qualidade atmosférica.

### QID-07 — Buffer Interno de Borda

O motor deve aplicar buffer interno para reduzir interferência de pixels mistos nas bordas.

### QID-08 — Tiers de Anomalia

O sistema deve classificar desvios por níveis, com alerta silencioso para 5% a 10% e auditoria pendente para desvios acima de 15%.

### QID-09 — Persistência Append-Only

Versões de QID devem ser append-only. Correções devem gerar nova versão, nunca alterar o histórico.

### QID-10 — Trilha Auditável

Cada QID deve permitir auditoria retrospectiva do estado ambiental, dos índices usados, do delta calculado e da assinatura.

## 16. Requisitos Não Funcionais

- O cálculo deve ser determinístico para a mesma entrada.
- O pipeline deve preservar rastreabilidade de fonte, data, cena e método.
- O processamento deve falhar fechado quando não houver qualidade mínima de imagem.
- Dados públicos devem ser minimizados.
- Metadados sensíveis devem permanecer internos.
- A modelagem deve suportar auditoria histórica completa.
- A arquitetura deve permitir validação externa futura do QID Hash e assinatura.

## 17. Critérios de Aceite

- Dado um projeto sem histórico, o sistema gera Genesis Hash e primeira versão de QID.
- Dado um novo ciclo Sentinel-2 válido, o sistema gera novo QID sem alterar versões anteriores.
- Dado um ciclo com nuvem ou sombra acima do limite, o sistema não gera anomalia crítica automaticamente.
- Dado um desvio de 5% a 10%, o sistema registra alerta silencioso e aguarda próxima medição.
- Dado um desvio acima de 15% persistente ou confirmado, o sistema cria pendência de auditoria.
- Dado um evento crítico confirmado e não saneado, o score de risco incorpora o sinal correspondente.
- Dado um evento saneado, novo recálculo remove o peso do sinal no score.
- Dado um QID publicado, o verificador consegue validar o hash composto e a assinatura.

## 18. Métricas de Sucesso

- Redução de falsos positivos em períodos sazonais.
- Menor volume de bloqueios indevidos por nuvem, sombra ou pixel misto.
- Percentual de QIDs verificáveis por hash e assinatura.
- Tempo médio entre detecção de Nível 2 e revisão humana.
- Percentual de projetos com série histórica completa desde o Genesis Hash.
- Taxa de divergência entre alerta satelital e auditoria de campo.

## 19. Dependências

- Pipeline Sentinel-2 com produtos Level-2A / BoA.
- Cálculo e persistência de NDVI, NDMI e RGB normalizado.
- Máscara de nuvem e sombra confiável.
- Implementação de SHA-3 para hash composto.
- Implementação ou biblioteca aprovada para Falcon 512.
- Tabela versionada para QID.
- Integração com motor de risco e eventos de auditoria.
- Política de exposição pública do selo.

## 20. Riscos e Pontos de Atenção

- Falcon 512 precisa ser validado quanto a disponibilidade de biblioteca, performance e maturidade operacional.
- Thresholds de 5%, 10% e 15% precisam ser calibrados por bioma, região e metodologia.
- Buffer interno pode reduzir demais a área analisável em polígonos estreitos.
- Year-over-year exige histórico suficiente; projetos novos precisam de fallback.
- Imagens de alta resolução ou drone podem ter custo e disponibilidade variáveis.
- Hashes de raster exigem normalização rigorosa para evitar mudança por diferença irrelevante de processamento.

## 21. Questões Abertas

- Qual deve ser a largura padrão do buffer interno por bioma e resolução de cena?
- Qual janela mínima de histórico habilita comparação year-over-year confiável?
- O QID deve ser registrado apenas no banco, em smart contract, ou em ambos?
- Quais metadados do QID podem ser públicos sem expor informação sensível?
- Falcon 512 será obrigatório no MVP dessa evolução ou encapsulado atrás de uma interface de assinatura pós-quântica?
- Como a auditoria humana confirma ou descarta uma anomalia QID no fluxo operacional?

## 22. Roadmap Sugerido

### Etapa 1 — Fundação QID

- Criar modelo versionado append-only.
- Gerar Genesis Hash.
- Gerar QID Hash multi-índice.
- Persistir metadados mínimos de cena e processamento.

### Etapa 2 — Qualidade Analítica

- Implementar comparação sazonal.
- Aplicar filtros de nuvem, sombra e qualidade atmosférica.
- Aplicar buffer interno de borda.
- Classificar confiança da observação.

### Etapa 3 — Integração com Selo

- Mapear tiers de QID para sinais de risco.
- Exibir explicação pública minimizada.
- Exibir detalhes técnicos no painel interno.
- Integrar eventos saneados ao recálculo do score.

### Etapa 4 — Assinatura e Verificação

- Assinar QID Hash com Falcon 512.
- Criar verificador de assinatura.
- Publicar prova verificável do selo.
- Documentar processo de auditoria externa.
