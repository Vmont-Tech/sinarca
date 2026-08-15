# PRD — Sinarca Satellite Historical Reconstruction & Monitoring

**Produto:** Sinarca  
**Feature:** Reconstrução Histórica e Monitoramento Satelital de Projetos  
**Status:** Draft para desenvolvimento  
**Prioridade:** Alta  
**Fonte primária:** Copernicus Sentinel-2 / Copernicus Data Space Ecosystem  
**Data:** Agosto de 2026

## 1. Visão geral

O Sinarca deve permitir que cada projeto possua um **perímetro geográfico próprio**, definido por um polígono com no mínimo 4 vértices e sem limite máximo de vértices.

A partir desse perímetro, o sistema deve utilizar dados históricos e atuais do **Sentinel-2** para reconstruir a evolução ambiental da área antes e depois da criação do projeto no Sinarca.

O objetivo não é apenas mostrar imagens de satélite, mas transformar essas observações em uma **linha do tempo auditável de evidências ambientais**.

O Copernicus permite consultar imagens por área e intervalo de tempo. A Statistical API também permite calcular estatísticas diretamente sobre uma Area of Interest, sem necessidade de baixar todas as imagens. ([Dataspace Documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub.html?utm_source=chatgpt.com))

---

# 2. Problema

Hoje um projeto pode informar:

- localização;
- área;
- limites da propriedade;
- documentação;
- condições ambientais;
- histórico de uso da terra.

Porém essas informações podem ser autodeclaradas ou provenientes de documentos que precisam ser validados.

O Sinarca precisa criar uma camada independente de evidência.

Exemplo:

```text
Proprietário declara:

Área: 186 ha
Vegetação preservada: 80 ha
Sem desmatamento recente
```

O sistema deve conseguir confrontar isso com:

```text
CAR / SIGEF / GPS
        +
Sentinel-2 histórico
        +
dados ambientais
```

e construir sua própria interpretação do território.

---

# 3. Objetivos

A feature deve permitir ao Sinarca:

1. reconstruir historicamente a evolução de cada projeto;
2. estabelecer um baseline ambiental anterior ao ingresso no Sinarca;
3. identificar mudanças relevantes na cobertura vegetal;
4. detectar possíveis eventos ambientais;
5. monitorar continuamente o território;
6. produzir evidências independentes para auditoria;
7. aumentar a confiança sobre informações fornecidas pelo proprietário;
8. alimentar futuramente motores de risco, carbono e elegibilidade.

---

# 4. Princípio fundamental

O satélite **não determina juridicamente o limite da propriedade**.

O Sinarca fornece o perímetro.

```text
CAR
SIGEF
GPS
levantamento
arquivo importado
        │
        ▼
   PROJECT BOUNDARY
        │
        ▼
     SENTINEL
```

O polígono do projeto torna-se uma **Area of Interest (AOI)** utilizada nas consultas ao Sentinel.

---

# 5. Project Boundary

Cada projeto deve possuir um ou mais limites territoriais associados.

## Regra de geometria

Mínimo:

```text
4 vértices
```

Máximo:

```text
sem limite lógico definido pelo produto
```

O limite técnico poderá existir para proteção da API e do banco, mas não deverá interferir em polígonos rurais legítimos.

GeoJSON deverá seguir:

```text
longitude, latitude
```

Exemplo:

```json
{
  "type": "Polygon",
  "coordinates": [[
    [-44.5186126, -19.9032263],
    [-44.5192076, -19.9066889],
    [-44.5179044, -19.9088465],
    [-44.5208790, -19.9137208],
    [-44.5186126, -19.9032263]
  ]]
}
```

O primeiro ponto deve ser repetido no final para fechar o `LinearRing`.

O ponto repetido não conta como um novo vértice.

---

# 6. Tipos de perímetro

O Sinarca deverá diferenciar a origem e confiabilidade da geometria.

### DECLARED

Perímetro informado pelo proprietário ou importado do CAR.

```text
DECLARED_BOUNDARY
```

### FIELD VERIFIED

Perímetro validado em campo.

```text
FIELD_VERIFIED_BOUNDARY
```

### CERTIFIED

Perímetro proveniente de fonte certificada, como SIGEF/INCRA.

```text
CERTIFIED_BOUNDARY
```

Exemplo:

```json
{
  "source": "CAR",
  "verificationStatus": "DECLARED",
  "areaHa": 186.5
}
```

---

# 7. Validações geográficas

Ao salvar um perímetro, o backend deverá validar:

- mínimo de quatro vértices;
- fechamento correto do polígono;
- geometria válida;
- ausência de self-intersection;
- latitude entre -90 e 90;
- longitude entre -180 e 180;
- área superior a zero;
- área calculada pelo sistema;
- divergência entre área declarada e calculada.

Exemplo:

```text
Área declarada
186,5 ha

Área calculada
185,9 ha

Diferença
0,32%

✅ ACCEPTED
```

Outro exemplo:

```text
Área declarada
300 ha

Área calculada
186 ha

⚠ AREA_MISMATCH
```

---

# 8. Persistência geoespacial

Utilizar PostgreSQL + PostGIS.

Exemplo:

```sql
declared_boundary geometry(Polygon, 4326),
field_verified_boundary geometry(Polygon, 4326),
certified_boundary geometry(Polygon, 4326)
```

Opcionalmente:

```sql
active_boundary geometry(Polygon, 4326)
```

O `active_boundary` representa a geometria atualmente considerada pelo sistema.

Prioridade sugerida:

```text
CERTIFIED
    ↓
FIELD_VERIFIED
    ↓
DECLARED
```

---

# 9. Integração Copernicus

## Provider inicial

```text
Copernicus Data Space Ecosystem
```

Fonte:

```text
Sentinel-2
```

Produto preferencial:

```text
Sentinel-2 L2A
```

A integração deverá ser desacoplada:

```ts
interface SatelliteProvider {
  searchScenes();
  getStatistics();
  getImage();
}
```

Implementação inicial:

```text
CopernicusSentinelProvider
```

Isso permitirá adicionar posteriormente:

- Landsat;
- Planet;
- Sentinel-1;
- CBERS;
- outros provedores.

---

# 10. STAC

O STAC será utilizado principalmente para **descoberta das cenas disponíveis**.

O catálogo STAC do Copernicus padroniza a descoberta e gerenciamento de dados de observação da Terra. ([Dataspace Documentation](https://documentation.dataspace.copernicus.eu/APIs/STAC.html?utm_source=chatgpt.com))

Consulta conceitual:

```text
AOI = polygon do projeto

Data:
2021-01-01 → 2026-08-01

Collection:
Sentinel-2

Cloud:
< 20%
```

Resultado:

```text
Scene 1
2021-01-07

Scene 2
2021-01-12

Scene 3
2021-01-17

...
```

---

# 11. Statistical API

Para métricas ambientais, o Sinarca deverá priorizar a Statistical API.

Ela permite calcular estatísticas sobre imagens de satélite para uma determinada AOI e intervalo temporal sem baixar os arquivos completos. ([Dataspace Documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html?utm_source=chatgpt.com))

Fluxo:

```text
Project Polygon
      ↓
Statistical API
      ↓
Sentinel-2
      ↓
NDVI / NDMI / NBR
      ↓
JSON
      ↓
Sinarca DB
```

Isso reduz:

- tráfego;
- storage;
- processamento;
- complexidade operacional.

---

# 12. Índices iniciais

## NDVI

Normalized Difference Vegetation Index.

Objetivo:

```text
vigor / densidade da vegetação
```

Uso:

- monitoramento de cobertura vegetal;
- degradação;
- regeneração;
- mudanças significativas.

---

## NDMI

Normalized Difference Moisture Index.

Objetivo:

```text
umidade da vegetação
```

Uso:

- estresse hídrico;
- secas;
- alteração da condição vegetal.

---

## NBR

Normalized Burn Ratio.

Objetivo:

```text
identificar mudanças relacionadas a queimadas
```

Uso:

- cicatrizes de fogo;
- perda brusca de vegetação;
- comparação pré e pós-evento.

---

# 13. Reconstrução histórica

Quando um projeto for cadastrado, o Sinarca deverá executar:

```text
HISTORICAL_RECONSTRUCTION
```

O período deverá ser configurável.

MVP:

```text
5 anos anteriores
```

Exemplo:

Projeto criado:

```text
14/08/2026
```

Período analisado:

```text
14/08/2021
até
14/08/2026
```

Posteriormente poderemos ampliar para:

```text
2017 → atual
```

ou utilizar todo o histórico disponível da missão.

---

# 14. Granularidade temporal

Não devemos necessariamente salvar uma observação para cada passagem do satélite.

MVP:

```text
composição mensal
```

Para cada mês:

```text
melhor observação disponível
ou
estatística agregada
```

Critérios:

- menor cobertura de nuvem;
- maior quantidade de pixels válidos;
- boa cobertura da AOI.

Resultado:

```text
12 observações/ano
```

Em cinco anos:

```text
~60 pontos históricos por projeto
```

---

# 15. Satellite Observation

Criar entidade:

```text
SatelliteObservation
```

Exemplo:

```json
{
  "projectId": "proj_123",
  "provider": "COPERNICUS",
  "satellite": "SENTINEL_2",
  "product": "L2A",

  "observedAt": "2026-07-21T13:52:00Z",

  "cloudCoverage": 4.8,

  "metrics": {
    "ndvi": {
      "mean": 0.72,
      "min": 0.14,
      "max": 0.91
    },
    "ndmi": {
      "mean": 0.43
    },
    "nbr": {
      "mean": 0.67
    }
  }
}
```

---

# 16. Baseline ambiental

Após reconstruir o histórico, o Sinarca deverá gerar um:

```text
ENVIRONMENTAL_BASELINE
```

Baseline deverá considerar:

- estado da vegetação;
- estabilidade temporal;
- área vegetada;
- alterações anteriores;
- possíveis queimadas;
- tendência do NDVI;
- tendência do NDMI;
- tendência do NBR.

Exemplo:

```json
{
  "period": {
    "from": "2021-08-01",
    "to": "2026-08-01"
  },

  "vegetation": {
    "averageNdvi": 0.71,
    "trend": "STABLE"
  },

  "historicalEvents": 2
}
```

---

# 17. Linha do tempo ambiental

O projeto deverá possuir uma timeline.

Exemplo:

```text
2022
│
├── Vegetação estável
│
2023
│
├── ⚠ perda de vegetação detectada
│       2,1 ha
│
2024
│
├── 🌱 regeneração parcial
│
2025
│
├── 🔥 possível ocorrência de fogo
│
2026
│
└── ✅ condição atual estável
```

---

# 18. Detecção de anomalias

O sistema deverá comparar observações consecutivas.

Exemplo:

```text
NDVI

0.74
0.73
0.72
0.71
0.43
```

A queda deverá gerar:

```text
SATELLITE_ANOMALY
```

Não deverá gerar automaticamente:

```text
DEFORESTATION
```

A interpretação precisa ser separada da observação.

---

# 19. Satellite Anomaly

Criar entidade:

```text
SatelliteAnomaly
```

Exemplo:

```json
{
  "type": "VEGETATION_CHANGE",

  "detectedAt": "2026-08-11",

  "severity": "MEDIUM",

  "metrics": {
    "ndviBefore": 0.72,
    "ndviAfter": 0.43
  },

  "status": "PENDING_ANALYSIS"
}
```

---

# 20. Event Engine

Uma anomalia deverá passar por um mecanismo de classificação.

Fluxo:

```text
SATELLITE OBSERVATION
        ↓
ANOMALY DETECTOR
        ↓
SATELLITE ANOMALY
        ↓
CORRELATION ENGINE
        ↓
PROJECT EVENT
```

---

# 21. Tipos iniciais de eventos

```text
VEGETATION_LOSS
VEGETATION_RECOVERY
POSSIBLE_FIRE
MOISTURE_STRESS
LAND_COVER_CHANGE
```

Posteriormente:

```text
DEFORESTATION
FLOOD
DROUGHT
AGRICULTURAL_ACTIVITY
FOREST_DEGRADATION
```

---

# 22. Evidência versus conclusão

Regra fundamental:

```text
SATELLITE SIGNAL != CONFIRMED EVENT
```

Uma queda de NDVI pode representar:

- desmatamento;
- colheita;
- seca;
- mudança sazonal;
- solo exposto;
- sombra;
- nuvem;
- incêndio;
- alteração agrícola.

Por isso eventos deverão possuir:

```text
DETECTED
ANALYZED
CONFIRMED
DISMISSED
```

---

# 23. Evidência visual

Quando uma anomalia relevante for detectada, o sistema deverá recuperar imagens.

A Processing API do Sentinel Hub consegue retornar imagens derivadas dos dados Sentinel, inclusive combinações de bandas e índices como NDVI. ([Dataspace Documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html?utm_source=chatgpt.com))

Guardar:

```text
before.png
after.png
```

Exemplo:

```text
ANTES             DEPOIS

🌳🌳🌳🌳          🌳░░░🌳
🌳🌳🌳🌳    →     🌳░░░🌳
🌳🌳🌳🌳          🌳🌳🌳🌳
```

---

# 24. Satellite Evidence

Criar:

```text
SatelliteEvidence
```

Campos:

```text
id
projectId
eventId

satellite
sceneId

capturedAt

geometry

assetType

storageUrl

sha256

provider

metadata
```

---

# 25. Integridade da evidência

Toda evidência considerada relevante deverá possuir hash.

Exemplo:

```text
SHA-256
```

Fluxo:

```text
Satellite image
      ↓
SHA-256
      ↓
Evidence record
      ↓
Audit trail
```

Posteriormente esse hash poderá ser ancorado na infraestrutura blockchain utilizada pelo Sinarca.

---

# 26. Monitoramento contínuo

Após a reconstrução histórica:

```text
PROJECT_STATUS = MONITORING
```

O sistema passa a consultar novas observações periodicamente.

MVP:

```text
a cada 5 dias
```

Porém o job deverá respeitar a existência de nova cena válida.

O Sentinel Hub permite consultar arquivos completos para uma AOI e intervalo temporal por API. ([Dataspace Documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub.html?utm_source=chatgpt.com))

---

# 27. Scheduler

Exemplo:

```text
SatelliteMonitoringJob

daily
```

O job:

```text
1. encontra projetos ativos
2. busca novas cenas
3. verifica cloud coverage
4. calcula índices
5. cria SatelliteObservation
6. roda anomaly detector
7. cria eventos quando necessário
```

Mesmo que o scheduler execute diariamente, poderá não existir uma nova observação em todos os dias.

---

# 28. Controle de nuvens

O pipeline deverá descartar ou penalizar imagens com alta cobertura de nuvens.

Configuração MVP:

```text
maxCloudCoverage = 20%
```

Preferência:

```text
< 10%
```

Também devemos usar máscara de pixels inválidos/nuvem sempre que possível.

---

# 29. Project Satellite Dashboard

Adicionar uma seção:

```text
Satellite Monitoring
```

---

# 30. Current Condition

Mostrar:

```text
Última observação

12 Aug 2026
Sentinel-2

Cloud coverage
3.8%

NDVI
0.72

Status
STABLE
```

---

# 31. Timeline

Gráfico:

```text
NDVI

0.8 ┤               ╭────╮
0.7 ┤──────╮    ╭───╯    ╰───
0.6 ┤      ╰────╯
0.5 ┤
0.4 ┤
    └──────────────────────────
     2022  2023  2024  2025  2026
```

Filtros:

```text
NDVI
NDMI
NBR
```

---

# 32. Map layers

No mapa do projeto:

```text
Project Boundary
Satellite RGB
NDVI
NDMI
NBR
Anomalies
Events
```

Permitir ligar/desligar layers.

---

# 33. Before / After

Para eventos:

```text
[ BEFORE ]  |  [ AFTER ]
```

Slider visual.

---

# 34. Event detail

Exemplo:

```text
Vegetation Change

Detected
17 Aug 2024

Affected Area
2.31 ha

NDVI
0.73 → 0.38

Confidence
87%

Evidence
Sentinel-2
```

---

# 35. Área afetada

O sistema deverá tentar calcular a geometria da alteração.

Exemplo:

```text
Project
186 ha

Detected anomaly
2.3 ha

Affected
1.24%
```

Armazenar:

```text
affected_geometry
```

PostGIS:

```sql
geometry(Polygon, 4326)
```

---

# 36. Funções PostGIS importantes

### Point in project

```sql
ST_Contains(project_boundary, point)
```

### Project area

```sql
ST_Area(project_boundary::geography)
```

### Event intersection

```sql
ST_Intersection(
  project_boundary,
  event_geometry
)
```

### Overlapping projects

```sql
ST_Intersects(
  project_a.boundary,
  project_b.boundary
)
```

---

# 37. Integração com antifraude do Sinarca

Essa feature deve também alimentar o mecanismo de prevenção contra fraude.

Exemplo:

```text
Novo projeto
     ↓
Boundary
     ↓
ST_Intersects()
     ↓
outros projetos Sinarca
```

Se houver interseção:

```text
⚠ PROJECT_BOUNDARY_OVERLAP
```

Calcular:

```text
overlapHa
overlapPercentage
```

---

# 38. Validação histórica no onboarding

Durante o cadastro:

```text
PROJECT CREATED
       ↓
BOUNDARY VALIDATED
       ↓
HISTORICAL RECONSTRUCTION
       ↓
BASELINE GENERATED
       ↓
RISK ANALYSIS
       ↓
PROJECT REVIEW
```

O projeto poderá permanecer:

```text
UNDER_REVIEW
```

até o processamento terminar.

---

# 39. Indicadores do onboarding

Exemplo:

```text
Boundary
✅ Valid

Area
✅ 186.4 ha

Historical imagery
✅ 59 observations

Vegetation stability
✅ Stable

Potential fire
⚠ 1 occurrence

Boundary overlap
✅ None

Satellite baseline
✅ Generated
```

---

# 40. Dados sugeridos

## project_boundaries

```text
id
project_id

type

geometry

source

verification_status

calculated_area_ha
declared_area_ha

created_at
verified_at
```

---

## satellite_observations

```text
id
project_id

provider
satellite
product

scene_id

observed_at

cloud_coverage

ndvi_mean
ndvi_min
ndvi_max

ndmi_mean

nbr_mean

valid_pixel_percentage

created_at
```

---

## satellite_anomalies

```text
id
project_id

type

geometry

affected_area_ha

severity
confidence

status

detected_at

observation_before_id
observation_after_id
```

---

## project_events

```text
id
project_id

type

source

geometry

affected_area_ha

status

confidence

occurred_at

confirmed_at
confirmed_by
```

---

## satellite_evidence

```text
id
project_id
event_id

provider
satellite
scene_id

captured_at

asset_type

storage_path

sha256

metadata

created_at
```

---

# 41. Serviços backend

Criar:

```text
SatelliteProvider
```

Responsável pela abstração.

---

Criar:

```text
CopernicusProvider
```

Responsável por:

```text
STAC
Statistical API
Processing API
```

---

Criar:

```text
HistoricalReconstructionService
```

Responsável pela reconstrução.

---

Criar:

```text
SatelliteMonitoringService
```

Responsável pelo monitoramento contínuo.

---

Criar:

```text
SatelliteAnomalyService
```

Responsável pela comparação temporal.

---

Criar:

```text
SatelliteEvidenceService
```

Responsável por persistir evidências relevantes.

---

# 42. APIs internas

### Reconstrução

```http
POST /projects/:id/satellite/reconstruct
```

---

### Observações

```http
GET /projects/:id/satellite/observations
```

Filtros:

```text
from
to
metric
```

---

### Eventos

```http
GET /projects/:id/environmental-events
```

---

### Imagem

```http
GET /projects/:id/satellite/image
```

Parâmetros:

```text
date
layer
```

Layers:

```text
RGB
NDVI
NDMI
NBR
```

---

# 43. Processamento assíncrono

A reconstrução histórica não deverá bloquear uma requisição HTTP.

Usar:

```text
Queue
```

Exemplo:

```text
HistoricalReconstructionRequested
            ↓
           Queue
            ↓
HistoricalReconstructionWorker
```

Estados:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

---

# 44. Idempotência

O processamento deverá ser idempotente.

Chave sugerida:

```text
projectId
+
satellite
+
sceneId
+
processingVersion
```

Evitar registros duplicados.

---

# 45. Cache

Dados históricos não mudam com frequência.

Utilizar cache para:

```text
STAC results
scene metadata
statistics
rendered images
```

Isso reduzirá consumo da API.

---

# 46. Custos e quota

O Copernicus utiliza Processing Units para determinadas operações Sentinel Hub.

O sistema deverá possuir observabilidade de consumo:

```text
copernicus_requests_total

copernicus_processing_units

copernicus_errors_total

satellite_processing_duration

historical_reconstruction_duration
```

Batch processing possui modelo próprio e pode ser mais eficiente para grande volume. ([Dataspace Documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/ProcessingUnit.html?utm_source=chatgpt.com))

---

# 47. Escala futura

Para dezenas de projetos:

```text
Statistical API
```

Para centenas/milhares:

```text
Batch Statistical API
```

A Batch Statistical API foi feita para calcular estatísticas sobre múltiplos polígonos e agregações maiores. ([Dataspace Documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/BatchStatistical.html?utm_source=chatgpt.com))

---

# 48. Estratégia MVP

## Fase 1 — Boundary

Implementar:

- GeoJSON Polygon;
- mínimo 4 vértices;
- PostGIS;
- cálculo de área;
- validação geométrica;
- detecção de overlap.

---

## Fase 2 — Copernicus integration

Implementar:

- autenticação CDSE;
- SatelliteProvider;
- STAC search;
- Sentinel-2 L2A.

---

## Fase 3 — Historical Reconstruction

Implementar:

```text
últimos 5 anos
```

Gerar:

```text
NDVI mensal
```

Nesse ponto já será possível mostrar evolução histórica.

---

## Fase 4 — Environmental Indicators

Adicionar:

```text
NDMI
NBR
```

---

## Fase 5 — Visualization

Implementar:

- timeline;
- gráfico NDVI;
- RGB atual;
- mapa NDVI;
- comparação before/after.

---

## Fase 6 — Anomaly Detection

Implementar inicialmente:

```text
mudança significativa de NDVI
```

Threshold configurável.

---

## Fase 7 — Environmental Events

Adicionar:

```text
VEGETATION_LOSS
VEGETATION_RECOVERY
POSSIBLE_FIRE
```

---

# 49. Fora do escopo inicial

Não implementar no primeiro MVP:

- estimativa automática de toneladas de carbono usando apenas NDVI;
- classificação jurídica automática de desmatamento;
- reconhecimento automático de proprietário;
- certificação fundiária;
- substituição de auditoria humana;
- emissão automática de créditos baseada apenas em satélite;
- machine learning complexo.

Esses itens dependem de metodologias e fontes adicionais.

---

# 50. Critérios de aceite do MVP

Um projeto deverá permitir:

- cadastrar polígono com 4 ou mais vértices;
- validar geometria;
- calcular hectares;
- armazenar no PostGIS;
- consultar Sentinel-2 para o polígono;
- recuperar pelo menos 5 anos de histórico;
- calcular NDVI mensal;
- persistir observações;
- apresentar gráfico temporal;
- apresentar imagem Sentinel atual;
- comparar duas datas;
- detectar mudança significativa no NDVI;
- registrar uma anomalia;
- mostrar todas as informações na página do projeto.

---

# 51. Cenário de aceite

Para uma propriedade de aproximadamente:

```text
186 ha
```

o usuário cadastra o perímetro.

O Sinarca deverá:

```text
1. Validar o Polygon

2. Calcular:
   186.x ha

3. Buscar Sentinel-2:
   2021 → 2026

4. Selecionar observações válidas

5. Gerar:
   ~60 pontos NDVI

6. Construir baseline

7. Exibir gráfico histórico

8. Identificar alterações significativas

9. Permitir before/after

10. Colocar projeto em monitoramento
```

---

# 52. Arquitetura resumida

```text
                 SINARCA
                    │
             PROJECT BOUNDARY
                    │
                 PostGIS
                    │
                    ▼
          Historical Reconstruction
                    │
             SatelliteProvider
                    │
                    ▼
        Copernicus Data Space
          │        │        │
         STAC    Stats    Process
          │        │        │
          └────────┼────────┘
                   │
                   ▼
          SatelliteObservation
                   │
                   ▼
            Anomaly Detector
                   │
                   ▼
           SatelliteAnomaly
                   │
                   ▼
             ProjectEvent
                   │
          ┌────────┴────────┐
          ▼                 ▼
       Evidence          Timeline
          │
          ▼
       SHA-256
```

---

# 53. Evolução posterior

Depois do MVP, essa arquitetura pode evoluir para um **Environmental Intelligence Engine** do Sinarca.

Ele poderá combinar:

```text
Sentinel-2
Sentinel-1 SAR
MapBiomas
PRODES
DETER
CAR
SIGEF
ANM
IBAMA
INPE
dados climáticos
dados de campo
NFC-DNA
```

Resultado:

```text
                 SINARCA
                    │
                    ▼
          ENVIRONMENTAL DIGITAL TWIN
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Histórico    Presente     Alertas
        │           │           │
        └───────────┼───────────┘
                    ▼
              Audit Trail
                    │
                    ▼
             Carbon Project
```

A combinação entre **perímetro + histórico + monitoramento + evidências de campo** é muito mais defensável do que confiar exclusivamente em documentos enviados pelo interessado.

---

# 54. Definição de sucesso

A feature será considerada bem-sucedida quando o Sinarca conseguir responder automaticamente, para qualquer projeto:

> **Onde exatamente está o projeto?**

> **Qual é sua área real calculada?**

> **Como essa área estava antes de entrar no Sinarca?**

> **Como ela mudou ao longo dos últimos anos?**

> **O que mudou desde a última observação?**

> **Existe alguma alteração ambiental que merece investigação?**

> **Qual evidência sustenta essa conclusão?**

Esse é o salto de um simples cadastro de projetos para um sistema de **proveniência territorial e monitoramento ambiental verificável**.