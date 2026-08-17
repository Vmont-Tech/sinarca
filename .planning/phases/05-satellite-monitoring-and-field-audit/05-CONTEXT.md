# Phase 05: satellite-monitoring-and-field-audit - Contexto

**Coletado:** 2026-08-16
**Status:** Pronto para planejamento

Esta discussão foi conduzida por mim atuando como especialista de domínio do Sinarca (mesmo padrão autorizado nas Phases 04.1/04.2: "toda iteração humana será realizada por você como especialista no Sinarca"), fundamentando cada decisão na Bible (`.planning/docs/bible/15_Geofance_sentinel_requisitos.md`), no roadmap/requirements já fechados, no código atual e em pesquisa externa realizada nesta sessão sobre a Copernicus Data Space Ecosystem (CDSE). Não houve perguntas bloqueantes ao usuário.

<domain>
## Limite da Fase

A Phase 05 tem duas trilhas que evoluem em paralelo e se encontram no `Evidence`/`ProjectEvent` da Phase 04.2:

1. **Auditoria de campo real** — substitui o rascunho local (`AuditorReview.tsx`, evidências `local://`, assinatura texto livre) por upload real de evidências, assinatura verificável, releitura de QTAG/NFC quando o hardware permitir, e laudo persistido/visível conforme regra de visibilidade.
2. **Monitoramento satelital Copernicus** — `SatelliteProvider`/`CopernicusProvider` sobre a `active_boundary` da Phase 04.1 (AOI), reconstrução histórica de 5 anos, observações mensais NDVI/NDMI/NBR via Statistical API, detecção de anomalia (nunca rotulada `DEFORESTATION` automaticamente), `ProjectEvent` com ciclo `DETECTED → ANALYZED → CONFIRMED/DISMISSED`, bloqueio automático via o Auto Hold já existente (Phase 04.2), monitoramento contínuo via scheduler in-process.

Esta fase NÃO entrega: checkout de compra, certificado de aposentadoria, consoles admin gerais, estimativa automática de toneladas de carbono a partir de NDVI, classificação jurídica de desmatamento, emissão automática de créditos, fila distribuída (Celery/Redis), ou verificação contra registros externos (ONR/SIGEF/CAR — Phase 05.1).

</domain>

<decisions>
## Decisões de Implementação

### Auditoria de campo — evidências reais

- **D-01:** Evidências de auditoria (`AuditorReview.tsx`) passam a usar upload real multipart, reaproveitando o mesmo padrão de `UploadFile`/`storage_paths.py`/hash SHA-256 já usado em `upload_project_document` (Phase 3). `evidenceFiles` deixa de gerar `local://` — cada arquivo aceito vira um `Document`/`Evidence` real vinculado ao projeto e à auditoria, com `sha256_hash` calculado no upload (D-25 da Phase 04.2 já define que todo `Document` que alimenta um Claim gera `Evidence` automaticamente; auditoria segue o mesmo gancho).
- **D-02:** `PATCH /audit/verify/{project_id}` (`backend_app/modules/audit/routes.py`) para de aceitar `evidencias_url` como lista de strings soltas — passa a referenciar os `Document.id` dos uploads reais da mesma sessão de auditoria. Mantém compatibilidade de schema (campo pode continuar se chamando `evidencias_url` na resposta, mas a origem passa a ser real).
- **D-03:** Assinatura: sem hardware biométrico disponível (mesma realidade documentada na Phase 3 para SUN/Sentinel — "bloqueado por credenciais/hardware ausentes"), a assinatura verificável desta fase é um **stub determinístico verificável**: hash SHA-256 de `{auditor_id}|{project_id}|{laudo_texto}|{timestamp}|{lista_ordenada_de_evidence_ids}`, armazenado em `Audit.digital_signature` junto com o texto assinado, e exibido como "Assinatura verificável (stub SHA-256)" — nunca como assinatura biométrica real. Isso segue o mesmo princípio fail-closed dos adapters (`backend_app/adapters/stellar.py`): nunca simular sucesso de um mecanismo que não existe.
- **D-04:** Releitura de QTAG/NFC durante auditoria reaproveita o mesmo fluxo fail-closed já implementado no `fieldCapture.ts`/wizard de originação (Phase 3): sem leitor NFC disponível no navegador/dispositivo, bloqueia com erro explícito e libera fallback manual (usuário confirma manualmente que a tag foi localizada/está íntegra), nunca finge sucesso.
- **D-05:** Laudo e evidências aparecem no dossiê interno completo (com metadados) e no dossiê público minimizado (mesma regra de minimização de `PUBLIC_DOCUMENT_TYPES` da Phase 4 — apenas o essencial: existência de auditoria, data, conclusão, sem notas internas do auditor).
- **D-06:** Cliente de campo permanece web/PWA (não introduzir app nativo — já deferido desde a Phase 1 discussion, ver STATE.md "Deferred Items"). Captura de foto/vídeo usa `<input capture>`/MediaDevices API do navegador, sem SDK nativo novo.

### SatelliteProvider — abstração e Copernicus

- **D-07:** `SatelliteProvider` é uma interface Python (Protocol/ABC) com `search_scenes()`, `get_statistics()`, `get_image()`, implementada por `CopernicusProvider` em `backend_app/adapters/copernicus.py` — mesmo diretório/padrão dos adapters blockchain (`stellar.py`, `etherfuse.py`, `polygon.py`), mesmo princípio fail-closed: sem `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET`, todo método levanta erro explícito (nunca gera NDVI fake). Isso substitui `deterministic_baseline()` (`backend_app/modules/projects/service.py:1889`) como fonte do baseline exibido ao usuário — a função pode continuar existindo apenas como fallback interno de teste/seed, nunca como resultado apresentado como observação real.
- **D-08:** Autenticação: OAuth2 client credentials contra `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` (confirmado por pesquisa externa nesta sessão). Token tem validade de ~10 minutos — o adapter cacheia o token em memória e renova automaticamente antes de expirar, nunca por request.
- **D-09:** Endpoints usados: STAC search em `https://stac.dataspace.copernicus.eu/v1/` (coleção `sentinel-2-l2a`, filtro CQL2 por `eo:cloud_cover` e `s_intersects(geometry, AOI)`) para descoberta de cenas; Statistical API em `https://sh.dataspace.copernicus.eu/api/v1/statistics` para NDVI/NDMI/NBR agregados sobre a AOI sem baixar imagem completa; Process API (`https://sh.dataspace.copernicus.eu/api/v1/process`) apenas quando uma anomalia relevante exige `before.png`/`after.png` (D-19).
- **D-10:** Cadastro/credenciais: é responsabilidade operacional (fora do código) criar uma conta gratuita em dataspace.copernicus.eu e gerar client id/secret no painel do usuário. O plano deve declarar isso como pré-requisito de ambiente (`COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`), documentado no mesmo padrão de `.planning/docs/providers/` já usado para Soroban/Etherfuse/Polygon — sem essas credenciais, monitoramento fica bloqueado com erro explícito (mesmo tratamento dos outros providers em staging).
- **D-11:** Quotas confirmadas por pesquisa externa (conta gratuita CDSE): 10.000 Processing Units/mês, 300 PU/min, 300 requests/min, **apenas 2 requests concorrentes**. O adapter usa um semáforo/lock interno limitando a 2 chamadas simultâneas ao Sentinel Hub, e o job de monitoramento processa projetos em série (ou pequenos lotes) respeitando esse limite — nunca disparar N projetos em paralelo sem throttling.

### Reconstrução histórica e granularidade

- **D-12:** Reconstrução histórica cobre 5 anos anteriores à data de criação do projeto (`created_at`), configurável via `backend_app/core/config.py` (mesmo padrão de config já usado para thresholds em D-10/D-13 da Phase 04.2). Granularidade: composição mensal, melhor observação do mês por menor `cloudCoverage` (≈60 pontos em 5 anos), consistente com a Bible seção 14.
- **D-13:** `maxCloudCoverage` default 20% (bloqueia observações acima disso), com preferência documentada por <10% quando disponível — mesmo padrão de valor configurável de `BOUNDARY_AREA_DIVERGENCE_WARN_PCT` (Phase 04.1).
- **D-14:** Reconstrução histórica roda de forma assíncrona via **APScheduler in-process** (nova dependência — não existe scheduler no projeto hoje; confirmado por busca no código). É a primeira infraestrutura assíncrona do backend. Ao criar o projeto, o backend enfileira o job (`HISTORICAL_RECONSTRUCTION` com estados `PENDING/PROCESSING/COMPLETED/FAILED` persistidos), responde a request HTTP de criação de projeto imediatamente, e o projeto pode ficar em `UNDER_REVIEW`/aguardando enquanto processa — sem bloquear a criação do projeto em si (que já funciona hoje).
- **D-15:** Idempotência por `projectId + satellite + sceneId + processingVersion` — chave única em `satellite_observations`, mesmo princípio de idempotência já usado nas migrations do projeto (guard `pg_constraint`).

### Observações, anomalias e eventos

- **D-16:** Tabelas seguem o "Dados sugeridos" da Bible (seção 40): `satellite_observations`, `satellite_anomalies`, `project_events`, `satellite_evidence` — todas tabelas operacionais internas sem policy de SELECT no RLS, mesmo padrão de `claims`/`evidence`/`conflicts` da Phase 04.2 (leitura só via `/api/v1` org-scoped).
- **D-17:** Detecção de anomalia compara observações mensais consecutivas de NDVI; queda acima de um threshold configurável (`SATELLITE_NDVI_DROP_THRESHOLD`, mesmo padrão de config) gera `SatelliteAnomaly` com `status = PENDING_ANALYSIS`. Nunca cria `ProjectEvent` do tipo `DEFORESTATION` automaticamente — os tipos iniciais de `ProjectEvent` ficam restritos a `VEGETATION_LOSS`, `VEGETATION_RECOVERY`, `POSSIBLE_FIRE` (via NBR), conforme a Bible seção 21 e o roadmap.
- **D-18:** Ciclo do evento: `DETECTED` (criado pelo Anomaly Detector) → `ANALYZED` (Correlation Engine cruza com histórico e QTAGs, sem intervenção humana ainda) → `CONFIRMED`/`DISMISSED` (exige ação humana — auditor ou certificadora, mesmo padrão de decisão auditável já usado em `record_decision`/`audit/verify`). Não existe transição automática direta para `CONFIRMED`.
- **D-19:** Evidência visual (`before.png`/`after.png`) só é buscada via Process API quando uma anomalia chega a `ANALYZED` (para não gastar PU em toda observação) — vinculada a `SatelliteEvidence` com hash SHA-256, reaproveitando o mesmo padrão de hashing de `documents.sha256_hash`.

### Bloqueio automático e recálculo de crédito

- **D-20:** Reaproveita o Auto Hold já construído na Phase 04.2 (D-06: `risk_score` `CRITICAL` → `integrity_status = ON_HOLD`) em vez de criar um segundo mecanismo de bloqueio. Um `ProjectEvent` `CONFIRMED` de severidade `HIGH`/`CRITICAL` entra no Risk Engine como um novo sinal de risco (`SATELLITE_ANOMALY_CONFIRMED`, peso configurável igual aos demais sinais de D-13/Phase 04.2) — se isso levar o score a `CRITICAL`, o Auto Hold existente dispara sem precisar de lógica nova de bloqueio. Anomalias `CONFIRMED` de severidade menor não bloqueiam sozinhas, mas ficam registradas e visíveis.
- **D-21:** Notificação de incidente: sem provedor de push/e-mail transacional integrado ainda nesta fase (fora do escopo dos requisitos originais), a "notificação" desta fase é um registro persistido e visível — `ProjectEvent` gera entrada em `audit_events`/timeline visível para produtor, certificadora e auditor nas telas que já consultam timeline hoje (mesmo padrão de `_append_timeline`). Isso satisfaz a regra de aceite "notificações de incidente devem ter registro persistido ou bloqueio explícito" sem inventar um canal de e-mail/push nesta fase.
- **D-22:** Desbloqueio auditável: reaproveita o fluxo de decisão da certificadora/auditor já existente (mesmo padrão de `record_decision`) — uma anomalia `CONFIRMED` que causou Auto Hold só é revertida por uma decisão humana explícita e auditável (novo evento `ANOMALY_REVIEW_CLEARED` ou equivalente), nunca por timeout ou nova observação satisfatória sozinha.
- **D-23:** "Recálculo de créditos após incidente" (critério de sucesso 9) **não** calcula toneladas de carbono a partir de NDVI (explicitamente fora de escopo na Bible). Uma anomalia `CONFIRMED` com `affected_area_ha` cria uma pendência estruturada análoga a `certification_pendencies`/`treasury_authorizations` (Phase 4) — ex. `credit_adjustment_pendencies` — sinalizando que o produtor/certificadora deve revisar manualmente o volume de créditos afetado; e marca o projeto (via `integrity_status = ON_HOLD`, D-20) como indisponível para novas vendas/mint enquanto pendente. Não altera `project.carbon_stock` automaticamente.

### Visualização

- **D-24:** Dashboard "Satellite Monitoring" no projeto (interno) mostra: última observação, cloud coverage, NDVI atual, status; gráfico de série temporal NDVI/NDMI/NBR com filtro por índice; camadas de mapa ligáveis (Boundary/RGB/NDVI/NDMI/NBR/Anomalies/Events) sobre o mesmo componente de mapa já usado para `ProjectGeofencePreview` (Phase 04.1); comparação before/after com slider para eventos.
- **D-25:** Dossiê público (`MrcaDetails.tsx`) mostra uma versão minimizada: baseline Sentinel real, NDVI médio, pontos analisados, hash de referência (substitui os campos hoje derivados de `deterministic_baseline()`), e a mesma trilha do vocabulário de `integrity_status` já exibido desde a Phase 04.2 (D-16) — sem gráfico detalhado nem camadas de mapa completas no dossiê público.

### Observabilidade de consumo Copernicus

- **D-26:** Sem stack de métricas (Prometheus) no projeto hoje — Phase 9 (admin-operations-and-observability) ainda não foi construída. Esta fase registra consumo (`copernicus_requests_total`, `copernicus_processing_units`, `copernicus_errors_total`, duração) como linhas estruturadas em uma tabela leve nova (ex. `copernicus_api_usage`) a cada chamada ao adapter, não como métricas Prometheus — dado consultável por API interna e reaproveitável quando a Phase 9 existir.

### Discrição do agente

- O agente decide nomes exatos de tabelas, colunas, endpoints e DTOs, desde que preserve os comportamentos acima, use `/api/v1`, gere `audit_events`/timeline e não reintroduza `mock://`/`local://` como evidência operacional.
- O agente decide a estrutura interna do scheduler (biblioteca exata além de APScheduler, se necessário) e o formato exato do evalscript Sentinel Hub para NDVI/NDMI/NBR, desde que a Statistical API seja a via preferencial (não baixar imagens completas) conforme D-09.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Origem e requisitos

- `.planning/docs/bible/15_Geofance_sentinel_requisitos.md` — PRD completo de reconstrução histórica e monitoramento satelital; seções 5-8 (Project Boundary, já parcialmente entregue na Phase 04.1), 9-14 (integração Copernicus/STAC/Statistical API/reconstrução histórica), 15-25 (observações, baseline, anomalias, eventos, evidência), 26-30 (monitoramento contínuo, scheduler, dashboard), 40-48 (schema sugerido, serviços, APIs, idempotência, cache, custos/quota, estratégia MVP por fases) são as mais relevantes.
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seções 5 e 6 — baseline obrigatório de cobertura de fluxo/tela para esta fase (regra de aceite herdada do roadmap).
- `.planning/REQUIREMENTS.md` — requisitos rastreáveis da Phase 5 (ex. `SATM-*`, verificar numeração exata no arquivo).
- `.planning/ROADMAP.md` — Phase 5, dependências (Phase 04.2) e os 10 critérios de sucesso.
- `.planning/STATE.md` — decisão de 2026-08-14: Sinarca não tem PostGIS/geometry/observação satelital real hoje; `deterministic_baseline()` gera baseline por hash do nome do projeto, não por satélite.

### Contexto das fases anteriores

- `.planning/phases/04.2-integrity-layer-foundation/04.2-CONTEXT.md` — Auto Hold (D-06), Risk Engine com sinais explicáveis (D-13/D-15), `Evidence`/`Claim` reaproveitados por esta fase (D-01, D-20, D-23).
- `.planning/phases/04.1-geospatial-foundation/04.1-CONTEXT.md` — `project_boundaries`/`active_boundary` como AOI desta fase; `ProjectGeofencePreview` como base de mapa a estender (D-24).
- `.planning/phases/04-certification-workbench/04-CONTEXT.md` — padrão de pendência estruturada (`certification_pendencies`) reaproveitado em D-23; padrão de upload obrigatório com hash real (D-11/D-14 da Phase 04) reaproveitado em D-01.
- `.planning/phases/03-project-origination-and-documents/03-CONTEXT.md` — fluxo fail-closed de NFC/SUN/geolocalização em campo (D-04 desta fase segue o mesmo princípio); upload multipart de documentos (D-01).

### Pesquisa externa Copernicus Data Space Ecosystem (realizada nesta sessão, 2026-08-16)

- Token endpoint OAuth2 client credentials: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` (token válido ~10 min).
- STAC API: `https://stac.dataspace.copernicus.eu/v1/`, coleção `sentinel-2-l2a`, filtro CQL2 por nuvem/geometria/data.
- Sentinel Hub base URL: `https://sh.dataspace.copernicus.eu`; Process API em `/api/v1/process`; Statistical API em `/api/v1/statistics`.
- Quotas conta gratuita: 10.000 PU/mês, 300 PU/min, 300 requests/min, **2 requests concorrentes**, 12 TB/mês de transferência.
- Custo em PU: Statistical API custa no mínimo 0,01 PU por request; Catalog/STAC custa no mínimo 0,01 PU (até 1 PU) por consulta de área+tempo; excedente reduz para modo "slow lane", não bloqueia.
- SDK Python oficial: `sentinelhub-py`, configurável com `sh_client_id`/`sh_client_secret`/`sh_base_url` apontando para CDSE — avaliar na pesquisa técnica (`05-RESEARCH.md`) se usar a lib ou chamadas HTTP diretas (o projeto já depende de `httpx`, sem dependências HTTP adicionais óbvias além de `sentinelhub-py` ou `apscheduler`).
- Fontes: [documentation.dataspace.copernicus.eu/APIs/SentinelHub.html](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub.html), [.../Overview/ProcessingUnit.html](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/ProcessingUnit.html), [.../Statistical.html](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html), [.../STAC.html](https://documentation.dataspace.copernicus.eu/APIs/STAC.html), [.../Quotas.html](https://documentation.dataspace.copernicus.eu/Quotas.html).

### Mapas de codebase

- `.planning/codebase/STACK.md` — stack real (FastAPI, SQLAlchemy async, Supabase Postgres/PostGIS, React/Vite).
- `.planning/codebase/ARCHITECTURE.md` — fronteiras frontend/backend e fluxo de auditoria/certificação.
- `.planning/codebase/CONVENTIONS.md` — convenções de rotas `/api/v1`, PT-BR na documentação, `audit_events`.

### Código-fonte operacional

- `backend_app/modules/projects/service.py:1889` (`deterministic_baseline`) — a ser substituído como fonte de baseline exibido (D-07).
- `backend_app/modules/projects/service.py:818-870` (`create_project`) — ponto de gancho para disparar `HISTORICAL_RECONSTRUCTION` assíncrono (D-14).
- `backend_app/adapters/stellar.py` — padrão de referência fail-closed (`assert_ready`, erro explícito sem credenciais) a replicar em `backend_app/adapters/copernicus.py` (D-07/D-08/D-10).
- `backend_app/modules/audit/routes.py` (`audit_queue`, `audit_verify`) — endpoints existentes a evoluir para upload real e assinatura verificável (D-01/D-02/D-03).
- `src/pages/Dashboard/AuditorReview.tsx` — UI de auditoria já existente (evidências, checks, assinatura texto livre) a evoluir, não recriar do zero.
- `src/services/fieldCapture.ts` — padrão fail-closed de NFC/geolocalização em campo (Phase 3) a reaproveitar (D-04).
- `backend_app/modules/storage_paths.py`, `backend_app/modules/projects/routes.py:485` (`upload_project_document`) — padrão de upload multipart real com hash a reaproveitar (D-01).
- `backend_app/modules/integrity/risk_engine.py`, `backend_app/modules/integrity/service.py` — Risk Engine/Auto Hold da Phase 04.2 a estender com o novo sinal `SATELLITE_ANOMALY_CONFIRMED` (D-20).
- `backend_app/modules/projects/service.py:1071` (`detect_boundary_overlaps`)/`ProjectGeofencePreview` — base de mapa e geometria a estender com camadas de satélite (D-24).
- `pyproject.toml` — dependências atuais (`httpx`, `sqlalchemy[asyncio]`, `asyncpg`, sem scheduler); confirma que APScheduler (D-14) e o cliente Copernicus (`sentinelhub-py` ou `httpx` puro) são dependências novas.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Upload multipart real com hash SHA-256 (`upload_project_document`, `storage_paths.py`) — base de D-01.
- Padrão fail-closed dos adapters blockchain (`stellar.py::assert_ready`) — modelo direto para `copernicus.py` (D-07/D-08).
- `fieldCapture.ts` (Phase 3) — fail-closed de NFC/geolocalização já implementado, reaproveitar para releitura de QTAG em auditoria (D-04).
- Auto Hold + Risk Engine explicável (`backend_app/modules/integrity/`) — mecanismo de bloqueio já pronto, não recriar (D-20).
- `certification_pendencies`/`treasury_authorizations` — padrão de pendência estruturada a replicar para recálculo de crédito (D-23).
- `_append_timeline`/`audit_events` — trilha auditável já estabelecida, reaproveitar para notificação de incidente (D-21) e desbloqueio (D-22).

### Established Patterns
- Configuração de thresholds via `backend_app/core/config.py` (env), nunca tabela dinâmica — mesmo padrão de D-10/D-13 da Phase 04.2, reaplicado em D-12/D-13/D-17 desta fase.
- Migrations idempotentes com guard `pg_constraint`/`information_schema` — mesmo padrão a seguir para `satellite_observations`/idempotência (D-15).
- Tabelas operacionais internas com RLS habilitado e sem policy de SELECT, leitura só via `/api/v1` org-scoped — mesmo padrão de `claims`/`evidence`/`conflicts` (D-16).

### Integration Points
- `create_project` (Phase 3) passa a disparar `HISTORICAL_RECONSTRUCTION` assíncrono via APScheduler em vez de `deterministic_baseline()` síncrono.
- Risk Engine (Phase 04.2) ganha um sinal novo alimentado pelo Anomaly/Correlation Engine desta fase (D-20).
- `MrcaDetails.tsx` (dossiê público) e `AuditorReview.tsx`/`ProjectGeofencePreview` (interno) ganham novas seções/camadas sem substituir o que já existe.

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência visual específica foi trazida além do que a Bible já descreve (gráfico de linha do tempo NDVI, camadas de mapa ligáveis, slider before/after). A composição visual exata fica a critério do agente/`ui-ux-pro-max` (fase tem UI — `gsd-ui-phase` deve ser invocado antes de fechar UI-SPEC/PLAN.md, conforme `PROJECT-PREFERENCES.md`).

</specifics>

<deferred>
## Deferred Ideas

- Integração com registros externos (ONR/SIGEF/CAR) — Phase 05.1.
- Fila distribuída (Celery/Redis) para reconstrução histórica em escala — reservado para quando o volume justificar; MVP usa APScheduler in-process (D-14).
- Batch Statistical API (para centenas/milhares de projetos) — evolução futura além do MVP desta fase.
- App nativo avançado de captura de campo além do PWA — já deferido desde a Phase 1 discussion (ver STATE.md "Deferred Items").
- Estimativa automática de toneladas de carbono a partir de NDVI, classificação jurídica de desmatamento, emissão automática de créditos — explicitamente fora de escopo da Bible; recálculo de crédito desta fase fica limitado a uma pendência de revisão manual (D-23).
- Canal de notificação por e-mail/push para incidentes — esta fase usa apenas registro persistido/timeline (D-21); canal ativo fica para fase de comunicação/observabilidade futura.
- Ancoragem blockchain real do hash de evidência satelital/assinatura de auditoria — evolução futura mencionada na Bible seção 25, fora desta fase.

### Reviewed Todos (not folded)
None — nenhum todo pendente cruzou com o escopo desta fase.

</deferred>

---

*Phase: 05-satellite-monitoring-and-field-audit*
*Context gathered: 2026-08-16*
