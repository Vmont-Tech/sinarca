# Phase 05: satellite-monitoring-and-field-audit - Research

**Researched:** 2026-08-16
**Domain:** (1) Integração HTTP assíncrona com Copernicus Data Space Ecosystem (STAC + Statistical + Process API) sobre FastAPI/SQLAlchemy async; (2) primeira infraestrutura assíncrona in-process (APScheduler) do backend; (3) evolução de upload/assinatura de auditoria de campo reaproveitando o padrão de `upload_project_document`; (4) novo sinal de Risk Engine (Phase 04.2) alimentado por anomalia satelital confirmada.
**Confidence:** HIGH para pontos de gancho de código (lidos diretamente no repositório) e para o padrão de migration/adapter/config a seguir; MEDIUM para a integração Copernicus em si (endpoints/quotas já confirmados em sessão anterior, mas nenhuma chamada real foi feita nesta sessão — sem credenciais); LOW para escolha exata de biblioteca de scheduler além de "APScheduler existe e é compatível" (ver Assumptions Log).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auditoria de campo — evidências reais**
- D-01: Evidências de auditoria (`AuditorReview.tsx`) passam a usar upload real multipart, reaproveitando o mesmo padrão de `UploadFile`/`storage_paths.py`/hash SHA-256 já usado em `upload_project_document` (Phase 3). `evidenceFiles` deixa de gerar `local://` — cada arquivo aceito vira um `Document`/`Evidence` real vinculado ao projeto e à auditoria, com `sha256_hash` calculado no upload (D-25 da Phase 04.2 já define que todo `Document` que alimenta um Claim gera `Evidence` automaticamente; auditoria segue o mesmo gancho).
- D-02: `PATCH /audit/verify/{project_id}` (`backend_app/modules/audit/routes.py`) para de aceitar `evidencias_url` como lista de strings soltas — passa a referenciar os `Document.id` dos uploads reais da mesma sessão de auditoria. Mantém compatibilidade de schema (campo pode continuar se chamando `evidencias_url` na resposta, mas a origem passa a ser real).
- D-03: Assinatura: sem hardware biométrico disponível, a assinatura verificável desta fase é um **stub determinístico verificável**: hash SHA-256 de `{auditor_id}|{project_id}|{laudo_texto}|{timestamp}|{lista_ordenada_de_evidence_ids}`, armazenado em `Audit.digital_signature` junto com o texto assinado, e exibido como "Assinatura verificável (stub SHA-256)" — nunca como assinatura biométrica real. Segue o princípio fail-closed dos adapters (`backend_app/adapters/stellar.py`): nunca simular sucesso de um mecanismo que não existe.
- D-04: Releitura de QTAG/NFC durante auditoria reaproveita o mesmo fluxo fail-closed já implementado no `fieldCapture.ts`/wizard de originação (Phase 3): sem leitor NFC disponível, bloqueia com erro explícito e libera fallback manual, nunca finge sucesso.
- D-05: Laudo e evidências aparecem no dossiê interno completo (com metadados) e no dossiê público minimizado (mesma regra de minimização de `PUBLIC_DOCUMENT_TYPES` da Phase 4).
- D-06: Cliente de campo permanece web/PWA (não introduzir app nativo). Captura de foto/vídeo usa `<input capture>`/MediaDevices API do navegador, sem SDK nativo novo.

**SatelliteProvider — abstração e Copernicus**
- D-07: `SatelliteProvider` é uma interface Python (Protocol/ABC) com `search_scenes()`, `get_statistics()`, `get_image()`, implementada por `CopernicusProvider` em `backend_app/adapters/copernicus.py` — mesmo diretório/padrão dos adapters blockchain, mesmo princípio fail-closed: sem `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET`, todo método levanta erro explícito. Substitui `deterministic_baseline()` (`backend_app/modules/projects/service.py:1889`) como fonte do baseline exibido ao usuário — a função pode continuar existindo apenas como fallback interno de teste/seed, nunca como resultado apresentado como observação real.
- D-08: Autenticação OAuth2 client credentials contra `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`. Token válido ~10 minutos — o adapter cacheia em memória e renova automaticamente antes de expirar, nunca por request.
- D-09: STAC search em `https://stac.dataspace.copernicus.eu/v1/` (coleção `sentinel-2-l2a`, filtro CQL2 por `eo:cloud_cover` e `s_intersects(geometry, AOI)`); Statistical API em `https://sh.dataspace.copernicus.eu/api/v1/statistics` para NDVI/NDMI/NBR agregados; Process API (`https://sh.dataspace.copernicus.eu/api/v1/process`) apenas quando uma anomalia relevante exige `before.png`/`after.png` (D-19).
- D-10: Cadastro/credenciais é responsabilidade operacional fora do código. O plano deve declarar `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` como pré-requisito de ambiente, documentado no mesmo padrão de `.planning/docs/providers/` já usado para Soroban/Etherfuse/Polygon — sem essas credenciais, monitoramento fica bloqueado com erro explícito.
- D-11: Quotas confirmadas (conta gratuita CDSE): 10.000 Processing Units/mês, 300 PU/min, 300 requests/min, **apenas 2 requests concorrentes**. O adapter usa um semáforo/lock interno limitando a 2 chamadas simultâneas ao Sentinel Hub, e o job de monitoramento processa projetos em série (ou pequenos lotes) respeitando esse limite.

**Reconstrução histórica e granularidade**
- D-12: Reconstrução histórica cobre 5 anos anteriores a `created_at`, configurável via `backend_app/core/config.py`. Granularidade mensal, melhor observação do mês por menor `cloudCoverage` (≈60 pontos em 5 anos).
- D-13: `maxCloudCoverage` default 20% (bloqueia observações acima disso), preferência documentada por <10% quando disponível.
- D-14: Reconstrução histórica roda de forma assíncrona via **APScheduler in-process** (nova dependência — não existe scheduler no projeto hoje). É a primeira infraestrutura assíncrona do backend. Ao criar o projeto, o backend enfileira o job (`HISTORICAL_RECONSTRUCTION` com estados `PENDING/PROCESSING/COMPLETED/FAILED` persistidos), responde a request HTTP imediatamente, sem bloquear a criação do projeto.
- D-15: Idempotência por `projectId + satellite + sceneId + processingVersion` — chave única em `satellite_observations`, mesmo princípio de idempotência já usado nas migrations do projeto (guard `pg_constraint`).

**Observações, anomalias e eventos**
- D-16: Tabelas `satellite_observations`, `satellite_anomalies`, `project_events`, `satellite_evidence` — todas operacionais internas sem policy de SELECT no RLS, leitura só via `/api/v1` org-scoped.
- D-17: Detecção de anomalia compara observações mensais consecutivas de NDVI; queda acima de threshold configurável (`SATELLITE_NDVI_DROP_THRESHOLD`) gera `SatelliteAnomaly` com `status = PENDING_ANALYSIS`. Nunca cria `ProjectEvent` do tipo `DEFORESTATION` automaticamente — tipos iniciais restritos a `VEGETATION_LOSS`, `VEGETATION_RECOVERY`, `POSSIBLE_FIRE`.
- D-18: Ciclo do evento: `DETECTED` (Anomaly Detector) → `ANALYZED` (Correlation Engine, sem intervenção humana ainda) → `CONFIRMED`/`DISMISSED` (exige ação humana). Não existe transição automática direta para `CONFIRMED`.
- D-19: Evidência visual (`before.png`/`after.png`) só é buscada via Process API quando anomalia chega a `ANALYZED` — vinculada a `SatelliteEvidence` com hash SHA-256.

**Bloqueio automático e recálculo de crédito**
- D-20: Reaproveita o Auto Hold da Phase 04.2 (`risk_score CRITICAL → integrity_status = ON_HOLD`) em vez de criar segundo mecanismo. `ProjectEvent CONFIRMED` de severidade `HIGH`/`CRITICAL` entra no Risk Engine como novo sinal (`SATELLITE_ANOMALY_CONFIRMED`, peso configurável igual aos demais sinais D-13/Phase 04.2).
- D-21: Notificação de incidente: sem provedor de push/e-mail transacional, a "notificação" é um registro persistido e visível (`ProjectEvent` gera entrada em `audit_events`/timeline visível, mesmo padrão de `_append_timeline`).
- D-22: Desbloqueio auditável reaproveita `record_decision` — anomalia `CONFIRMED` que causou Auto Hold só é revertida por decisão humana explícita (novo evento `ANOMALY_REVIEW_CLEARED` ou equivalente), nunca por timeout.
- D-23: "Recálculo de créditos após incidente" (critério 9) **não** calcula toneladas de carbono a partir de NDVI. Anomalia `CONFIRMED` com `affected_area_ha` cria pendência estruturada análoga a `certification_pendencies`/`treasury_authorizations` (ex. `credit_adjustment_pendencies`), marca projeto `ON_HOLD` (D-20) como indisponível para venda/mint. Não altera `project.carbon_stock` automaticamente.

**Visualização**
- D-24: Dashboard "Satellite Monitoring" no projeto interno: última observação, cloud coverage, NDVI atual, status; gráfico de série temporal NDVI/NDMI/NBR; camadas de mapa ligáveis (Boundary/RGB/NDVI/NDMI/NBR/Anomalies/Events) sobre o componente `ProjectGeofencePreview`; comparação before/after com slider.
- D-25: Dossiê público (`MrcaDetails.tsx`) mostra versão minimizada: baseline Sentinel real, NDVI médio, pontos analisados, hash de referência (substitui campos hoje derivados de `deterministic_baseline()`), sem gráfico detalhado nem camadas de mapa completas.

**Observabilidade de consumo Copernicus**
- D-26: Sem stack de métricas (Prometheus) no projeto hoje. Esta fase registra consumo (`copernicus_requests_total`, `copernicus_processing_units`, `copernicus_errors_total`, duração) como linhas estruturadas em tabela leve nova (`copernicus_api_usage`), não como métricas Prometheus.

### Claude's Discretion
- Nomes exatos de tabelas, colunas, endpoints e DTOs, desde que preserve os comportamentos acima, use `/api/v1`, gere `audit_events`/timeline e não reintroduza `mock://`/`local://` como evidência operacional.
- Estrutura interna do scheduler (biblioteca exata além de APScheduler, se necessário) e formato exato do evalscript Sentinel Hub para NDVI/NDMI/NBR, desde que a Statistical API seja a via preferencial (não baixar imagens completas) conforme D-09.

### Deferred Ideas (OUT OF SCOPE)
- Integração com registros externos (ONR/SIGEF/CAR) — Phase 05.1.
- Fila distribuída (Celery/Redis) para reconstrução histórica em escala — MVP usa APScheduler in-process (D-14).
- Batch Statistical API (centenas/milhares de projetos) — evolução futura além do MVP.
- App nativo avançado de captura de campo além do PWA — já deferido desde a Phase 1.
- Estimativa automática de toneladas de carbono a partir de NDVI, classificação jurídica de desmatamento, emissão automática de créditos — explicitamente fora de escopo da Bible.
- Canal de notificação por e-mail/push para incidentes — fase de comunicação/observabilidade futura.
- Ancoragem blockchain real do hash de evidência satelital/assinatura de auditoria — evolução futura, fora desta fase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SATM-01 | Auditoria aceita fotos, vídeos, geolocalização, observações e laudo com upload real em experiência de campo. | `upload_project_document` (routes.py:485-565) é o gancho exato a replicar para auditoria — ver "Código Existente" e "Don't Hand-Roll". Frontend: `<input capture>`/MediaDevices, sem SDK novo (D-06). |
| SATM-02 | Assinatura digital/biométrica ou stub verificável é registrada pelo backend. | Padrão stub determinístico SHA-256 já documentado em D-03; hook em `_get_or_create_audit`/`verify_project` (audit/routes.py:48-102). |
| SATM-03 | Laudo e evidências aparecem no projeto interno e no dossiê público conforme regra de visibilidade. | Reaproveita `public_document_item`/`PUBLIC_DOCUMENT_TYPES` (Phase 4) e o bloco `integrity` minimizado (Phase 04.2/D-16) como modelo de minimização para o novo bloco `satellite`/`audit` no dossiê público. |
| SATM-04 | Auditoria pode reler QTAGs/NFC para validar integridade física da demarcação. | `fieldCapture.ts` já implementa `detectFieldCapabilities`/`getNfcCaptureStatus` fail-closed (D-04) — reaproveitar tal como está, sem nova lib. |
| SATM-05 | `CopernicusProvider` reconstrói ≥5 anos de histórico NDVI mensal para a AOI e persiste `SatelliteObservation`. | `project_boundaries.active_boundary` (Phase 04.1) é a AOI; endpoints/quotas Copernicus já confirmados (D-08/D-09/D-11); ver "Standard Stack" para decisão httpx vs sentinelhub-py. |
| SATM-06 | Anomalias detectadas por queda de NDVI, nunca `DEFORESTATION` automaticamente, `ProjectEvent DETECTED→ANALYZED→CONFIRMED/DISMISSED`. | Ver "Arquitetura" — pipeline `SatelliteObservation → AnomalyDetector (puro) → SatelliteAnomaly → CorrelationEngine → ProjectEvent`, espelhando o padrão `risk_engine.py` (módulo puro, sem DB). |
| SATM-07 | Monitoramento exibe baseline Sentinel-2 real sem campos de `deterministic_baseline()`. | `deterministic_baseline()` (service.py:1889) e seu uso em `create_project` (service.py:818, 860-864) são o ponto exato a substituir/isolar como fallback de teste. |
| SATM-08 | Anomalias confirmadas bloqueiam projeto, notificam papéis, liberam desbloqueio após auditoria aprovada. | Hook exato: `IntegrityService.recalculate_risk_score` (integrity/service.py:707-852) — novo sinal `SATELLITE_ANOMALY_CONFIRMED_*` em `risk_engine.py`/`constants.py`. |
| SATM-09 | Recálculo de créditos após incidente ajusta disponibilidade e prepara ajuste de tokens. | Modelo `credit_adjustment_pendencies` análogo a `certification_pendencies` (migration 202608150001); `_block_credits`/`_unlock_credits` (audit/routes.py:116-127) já mexem em `EnvironmentalCredit.status`/`quantity_available` — reaproveitar padrão. |
| SATM-10 | Job de monitoramento roda periodicamente sem bloquear HTTP, respeita `maxCloudCoverage`, idempotente por `projectId+satellite+sceneId+processingVersion`. | `backend_app/main.py` não tem lifespan/startup hoje — ver "Arquitetura Patterns" para introdução do lifespan FastAPI + `AsyncIOScheduler`. |
</phase_requirements>

## Summary

A Phase 05 não substitui nada que já funciona bem — ela troca dois pontos fake por dois pontos reais dentro de um esqueleto que a Phase 3/04.1/04.2 já deixou pronto. (1) `AuditorReview.tsx`/`audit/routes.py` hoje persistem evidência como string `local://...` e assinatura como texto livre; a Phase 04.2 já resolveu exatamente esse problema para documentos de projeto (`upload_project_document` → hash SHA-256 real → `Document` → `Evidence` automático) — a auditoria só precisa consumir o mesmo pipeline, com um novo `document_type` (`AUDIT_EVIDENCE`) e uma FK entre `Audit` e os `Document`s da sessão de auditoria. (2) `deterministic_baseline()` (hash do nome do projeto) é hoje a única fonte de "baseline satelital" no sistema — a Phase 05 introduz um adapter Copernicus real seguindo estritamente o mesmo desenho fail-closed dos adapters blockchain (`stellar.py::assert_ready`), mas com uma diferença estrutural nova: é a **primeira integração assíncrona real** do backend (as chamadas HTTP existentes em `etherfuse.py`/`polygon.py` usam `urllib.request` síncrono; nenhum adapter atual faz I/O de rede assíncrono nem roda fora do ciclo request/response). Isso exige duas peças de infraestrutura que hoje não existem: um cliente HTTP assíncrono (httpx, promovido de dependência de teste para dependência de produção) e um scheduler in-process (`APScheduler`) acoplado ao lifespan do FastAPI (`backend_app/main.py` hoje não tem nenhum hook de lifespan/startup — é `create_app()` puro, sem side effects).

O ponto de maior risco de planejamento não é a integração Copernicus em si (os endpoints/quotas já foram confirmados em pesquisa externa anterior e são bem documentados), mas a **modelagem do pipeline anomalia → evento → sinal de risco → Auto Hold → pendência de crédito** de forma que reaproveite estritamente o Risk Engine puro da Phase 04.2 (`risk_engine.py` proíbe explicitamente importar ORM/driver de banco) sem reintroduzir lógica duplicada de bloqueio. A extensão correta é: `IntegrityService.recalculate_risk_score` (integrity/service.py:707) ganha uma quarta leitura (`project_events` `CONFIRMED` com severidade `HIGH`/`CRITICAL`), monta um novo tipo de snapshot, e `compute_signals()` (risk_engine.py) ganha um novo bloco de sinal — nada além disso muda no fluxo de Auto Hold, que já está pronto.

**Primary recommendation:** Implementar `CopernicusProvider` com `httpx.AsyncClient` puro (não adotar `sentinelhub-py` — ver rationale em Standard Stack), introduzir lifespan FastAPI + `AsyncIOScheduler` (APScheduler) em `backend_app/main.py`, e tratar toda a modelagem de dados (observations/anomalies/events/evidence/pendências) como tabelas operacionais internas seguindo à risca o padrão `text + check constraint` + RLS sem SELECT policy já estabelecido desde a Phase 04.2.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Upload de evidência de auditoria (foto/vídeo/laudo) | Browser/Client (`<input capture>`/MediaDevices, `FormData`) | API/Backend (validação, hash, Storage) | Mesmo padrão de `AddProject`/upload de documentos — captura no navegador, persistência real no backend |
| Assinatura verificável (stub) | API/Backend (`Audit.digital_signature`) | — | Hash SHA-256 determinístico calculado no servidor a partir de dados já persistidos (nunca confiar em assinatura calculada no cliente) |
| Releitura QTAG/NFC | Browser/Client (`fieldCapture.ts`, Web NFC API) | API/Backend (registra resultado/fallback manual como parte do laudo) | Web NFC só existe no navegador; fail-closed já implementado no cliente (Phase 3) |
| Autenticação/consulta Copernicus (STAC/Statistical/Process) | API/Backend (`CopernicusProvider`, `backend_app/adapters/copernicus.py`) | — | Credenciais client_id/secret nunca devem chegar ao browser; toda chamada HTTP externa fica no backend |
| Reconstrução histórica (5 anos, mensal) | API/Backend (scheduler in-process, `HistoricalReconstructionService`) | Database/Storage (`satellite_observations`) | Assíncrono, idempotente, não pode bloquear o request HTTP de criação de projeto (D-14) |
| Monitoramento contínuo (job periódico) | API/Backend (`APScheduler` job registrado no lifespan) | Database/Storage | Mesmo raciocínio — precisa rodar fora do ciclo request/response |
| Detecção de anomalia (comparação NDVI) | API/Backend (módulo puro, análogo a `risk_engine.py`) | — | Regra de negócio determinística e testável sem banco, mesma disciplina da Phase 04.2 |
| Correlação/classificação de evento | API/Backend (`CorrelationEngine`) | Database/Storage (histórico de observações/QTAGs para correlacionar) | Precisa ler contexto persistido (histórico, QTAGs), mas a decisão em si é lógica de aplicação |
| Confirmação/dismiss de evento (ação humana) | API/Backend (endpoint de decisão) | Browser/Client (UI de revisão) | Mesmo padrão de `record_decision`/`audit/verify` — decisão humana persistida, nunca automática |
| Sinal de risco `SATELLITE_ANOMALY_CONFIRMED` | API/Backend (`risk_engine.py` + `IntegrityService.recalculate_risk_score`) | — | Reaproveita o Risk Engine puro já existente; não é um mecanismo de bloqueio novo |
| Pendência de recálculo de crédito | API/Backend (`credit_adjustment_pendencies`) | Database/Storage | Mesmo padrão de `certification_pendencies`/`treasury_authorizations` |
| Dashboard "Satellite Monitoring" / camadas de mapa | Browser/Client (extensão de `ProjectGeofencePreview`) | API/Backend (endpoints de série temporal/imagem) | Renderização e interação ficam no cliente; dados vêm sempre de `/api/v1` |
| Observabilidade de consumo Copernicus | API/Backend (`copernicus_api_usage`, registrado a cada chamada do adapter) | Database/Storage | Sem Prometheus nesta fase (D-26); tabela leve consultável via API interna |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | `>=0.28.1` [VERIFIED: já pinado em `pyproject.toml` `[dependency-groups] dev`, uv.lock] | Cliente HTTP assíncrono para OAuth2 token + STAC + Statistical + Process API do Copernicus | Já é dependência do projeto (hoje só em `dev`, usado pelos testes de API). Suporta `AsyncClient`, cache de conexão, timeout e é o único cliente HTTP assíncrono já presente no lockfile — promovê-lo para dependência de produção evita introduzir um segundo cliente HTTP |
| APScheduler | `3.11.3` [VERIFIED: PyPI, `pip index`/PyPI JSON consultado nesta sessão, `requires_python >=3.8`] | Scheduler in-process para `HISTORICAL_RECONSTRUCTION` (disparo único por projeto) e `SatelliteMonitoringJob` (job periódico) | Única infraestrutura de agendamento citada no roadmap (D-14); `AsyncIOScheduler` roda dentro do mesmo event loop do Uvicorn/FastAPI, sem exigir Redis/Celery — consistente com "MVP usa APScheduler in-process" (Deferred: fila distribuída fica para quando o volume justificar) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | Nenhuma outra dependência nova é necessária. NDVI/NDMI/NBR são calculados pelo próprio Sentinel Hub (evalscript na Statistical API) — o backend só faz parsing de JSON, não processamento de raster | Evitar `numpy`/`rasterio`/`GDAL` no backend: a Statistical API já devolve estatísticas agregadas prontas (mean/min/max por índice), então não há necessidade de baixar/processar imagens no servidor exceto para `before.png`/`after.png` (Process API), que são apenas bytes de imagem PNG armazenados como blob, sem processamento adicional |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `httpx.AsyncClient` + implementação própria de OAuth2/STAC/Statistical | `sentinelhub-py` (SDK oficial, `sh_client_id`/`sh_client_secret`/`sh_base_url`) | `sentinelhub-py` 3.11.5 [VERIFIED: PyPI JSON consultado nesta sessão] declara `requires_python >=3.8` (compatível) mas traz `numpy`, `shapely`, `pyproj`, `pillow`, `tifffile`, `requests`, `requests-oauthlib`, `dataclasses-json`, `utm`, `aenum` como dependências de produção — **nenhuma delas existe hoje no `pyproject.toml`/`uv.lock`** (verificado: grep vazio para `shapely`/`numpy`/`pyproj`). Além disso, `sentinelhub-py` é **síncrona** (usa `requests` internamente), o que exigiria `asyncio.to_thread`/executor para não bloquear o event loop dentro do job APScheduler — anulando a vantagem de usar uma lib "pronta". O projeto já tem um precedente estabelecido de **não** usar SDKs oficiais para providers externos (`etherfuse.py`/`polygon.py` usam `urllib.request` cru, não SDKs), e o próprio D-08/D-09/D-11 já especificam exatamente os 3 endpoints/fluxo necessários — a superfície de API a implementar é pequena (token OAuth2 + 1 POST STAC + 1 POST Statistical + 1 POST Process, todos JSON). **Recomendação: NÃO adotar `sentinelhub-py`.** Usar `httpx.AsyncClient` com um adapter fino, mantendo o padrão fail-closed/`assert_ready()` já usado pelos outros adapters |
| APScheduler `AsyncIOScheduler` | `BackgroundTasks` do FastAPI | `BackgroundTasks` só executa uma vez por request e não sobrevive a restart nem agenda execução periódica (`daily`/`a cada 5 dias`, Bible seção 26-27) — não serve para `SatelliteMonitoringJob`. Mantido apenas como mecanismo complementar possível para dar um "kick" imediato após `create_project`, mas o agendamento recorrente precisa do APScheduler |
| Tabela `copernicus_api_usage` (linhas estruturadas) | Prometheus + `prometheus-fastapi-instrumentator` | Rejeitado por D-26 — Phase 9 (observabilidade) ainda não existe; introduzir Prometheus nesta fase seria escopo cruzado não solicitado |

**Installation:**
```bash
uv add httpx apscheduler
```
(mover `httpx` de `[dependency-groups] dev` para `[project] dependencies`, e adicionar `apscheduler>=3.11,<4` — a v3.x é a API estável usada em produção com FastAPI/asyncio; a v4 ainda está em beta/alpha e não deve ser adotada)

**Version verification:**
```bash
# httpx já pinado, apenas confirmar
grep httpx pyproject.toml uv.lock
# APScheduler — nenhuma versão pinada ainda
curl -s https://pypi.org/pypi/APScheduler/json | python3 -c "import json,sys; print(json.load(sys.stdin)['info']['version'])"
```
Verificado nesta sessão: `httpx==0.28.1` já no lockfile (grupo dev); `APScheduler==3.11.3` é a versão estável mais recente no PyPI (consultado 2026-08-16), `requires_python >=3.8` — compatível com Python 3.11 pinado no projeto.

## Architecture Patterns

### System Architecture Diagram

```
                    POST /projects (create_project, Phase 3/04.1/04.2)
                                │
                                ▼
                  ProjectsService.create_project()
                                │
              ┌─────────────────┼──────────────────────────┐
              ▼                 ▼                            ▼
      Project row         persist_project_boundary      create_origination_claims
      (existing)          (existing, 04.1, AOI)          (existing, 04.2)
                                │
                                ▼
              NEW: enqueue_historical_reconstruction(project.id)
              (job HISTORICAL_RECONSTRUCTION, status PENDING,
               persistido antes do commit responder ao HTTP)
                                │
                     resposta HTTP volta imediatamente
                                │
     ============ fora do ciclo request/response (APScheduler) ============
                                │
                                ▼
              HistoricalReconstructionWorker (job PROCESSING)
                                │
                                ▼
                      CopernicusProvider.search_scenes()
                      (STAC, AOI = active_boundary, 5 anos, mensal)
                                │
                                ▼
                      CopernicusProvider.get_statistics()
                      (Statistical API: NDVI/NDMI/NBR por mês,
                       semáforo de 2 chamadas concorrentes, D-11)
                                │
                                ▼
                      idempotência: upsert por
                      (project_id, satellite, scene_id, processing_version)
                                │
                                ▼
                      SatelliteObservation (persistido, ~60 pontos/5 anos)
                                │
                                ▼
              job HISTORICAL_RECONSTRUCTION → COMPLETED (ou FAILED com motivo)
                                │
                                ▼
              baseline real substitui deterministic_baseline() na exibição
              (D-07) — Evidence(source_type=SATELLITE) alimenta Phase 04.2


     ============ SatelliteMonitoringJob (periódico, ex. diário) ============
                                │
                                ▼
                  encontra projetos em monitoramento ativo
                                │
                                ▼
              CopernicusProvider.search_scenes() (cenas novas desde
              última observação, maxCloudCoverage config)
                                │
                                ▼
                  nova SatelliteObservation persistida (mesma idempotência)
                                │
                                ▼
                      AnomalyDetector (módulo PURO, sem DB —
                      mesmo desenho de risk_engine.py)
                      compara NDVI consecutivo, threshold configurável
                                │
                        queda > threshold?
                                │ sim
                                ▼
                  SatelliteAnomaly (status=PENDING_ANALYSIS)
                                │
                                ▼
                      CorrelationEngine (cruza com histórico/QTAGs,
                      sem intervenção humana)
                                │
                                ▼
                  ProjectEvent (status=DETECTED → ANALYZED)
                  tipo ∈ {VEGETATION_LOSS, VEGETATION_RECOVERY, POSSIBLE_FIRE}
                  (NUNCA DEFORESTATION automático)
                                │
                  se ANALYZED e relevante: busca before/after
                  via Process API → SatelliteEvidence (hash SHA-256)
                                │
              ============ ação humana obrigatória ============
                                │
                                ▼
              PATCH /projects/{id}/events/{event_id}/decision
              (auditor/certificadora) → CONFIRMED ou DISMISSED
              (mesmo padrão de record_decision/audit/verify)
                                │
                    CONFIRMED, severidade HIGH/CRITICAL
                                │
                                ▼
              IntegrityService.recalculate_risk_score(project)
              (integrity/service.py:707 — Phase 04.2, ESTENDIDO)
              lê project_events CONFIRMED além de Claim/Evidence/Conflict
                                │
                                ▼
              risk_engine.compute_signals() ganha sinal
              SATELLITE_ANOMALY_CONFIRMED_{HIGH|CRITICAL}
                                │
                        score >= CRITICAL bound?
                                │ sim
                                ▼
              Auto Hold JÁ EXISTENTE dispara:
              project.integrity_status = ON_HOLD
              (nenhuma lógica de bloqueio nova)
                                │
                                ▼
              NEW: credit_adjustment_pendencies (affected_area_ha,
              status PENDING) — análogo a certification_pendencies
                                │
                                ▼
              ProjectEvent + INTEGRITY_AUTO_HOLD → audit_events/timeline
              (notificação = registro persistido, D-21)


              ============ desbloqueio auditável (D-22) ============
                                │
              PATCH /projects/{id}/events/{event_id}/clear
              (decisão humana explícita, evento ANOMALY_REVIEW_CLEARED)
                                │
                                ▼
              IntegrityService.recalculate_risk_score(project) de novo
              (mesmo recompute puro — nunca "desfaz" manualmente o score)
```

### Recommended Project Structure

```
backend_app/
├── adapters/
│   └── copernicus.py            # NOVO — CopernicusProvider (fail-closed, D-07/D-08)
├── modules/
│   ├── satellite/                # NOVO módulo, mesmo padrão de modules/integrity/
│   │   ├── __init__.py
│   │   ├── constants.py          # vocabulário: status de job, tipos de evento, severidades
│   │   ├── anomaly_detector.py   # PURO — sem import de DB/ORM (mesmo desenho de risk_engine.py)
│   │   ├── historical_reconstruction.py  # HistoricalReconstructionService
│   │   ├── monitoring.py         # SatelliteMonitoringService (chamado pelo job periódico)
│   │   ├── evidence.py           # SatelliteEvidenceService (before/after, hash)
│   │   ├── scheduler.py          # NOVO — registro dos jobs APScheduler (chamado do lifespan)
│   │   ├── service.py            # orquestração, leitura/escrita ORM
│   │   ├── schemas.py            # Pydantic DTOs de request/response
│   │   └── routes.py             # /projects/{id}/satellite/*, /projects/{id}/environmental-events
│   ├── audit/
│   │   └── routes.py             # EVOLUI — upload real + assinatura stub (D-01..D-04)
│   ├── integrity/
│   │   ├── risk_engine.py        # EVOLUI — novo sinal SATELLITE_ANOMALY_CONFIRMED_*
│   │   ├── constants.py          # EVOLUI — novo(s) código(s) em RISK_SIGNAL_CODES
│   │   └── service.py            # EVOLUI — recalculate_risk_score lê project_events CONFIRMED
│   └── projects/
│       └── service.py            # EVOLUI — create_project enfileira HISTORICAL_RECONSTRUCTION
├── main.py                       # EVOLUI — introduz lifespan (startup registra scheduler)
└── core/
    └── config.py                 # EVOLUI — COPERNICUS_*, SATELLITE_*, thresholds novos

src/
├── services/
│   ├── fieldCapture.ts           # REAPROVEITADO tal como está (D-04)
│   └── satelliteMonitoring.ts    # NOVO — fetch de observações/eventos/imagem
└── pages/Dashboard/
    ├── AuditorReview.tsx         # EVOLUI — upload real, assinatura stub, releitura QTAG
    └── MrcaDetails.tsx           # EVOLUI — bloco satellite minimizado (D-25)
```

### Pattern 1: Adapter fail-closed para Copernicus (mesmo desenho de `stellar.py`)

**What:** `CopernicusAdapterConfig.from_env()` + `assert_ready()` levanta erro explícito se `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` ausentes, exatamente como `StellarAdapterConfig`.
**When to use:** Todo método público de `CopernicusProvider` (search_scenes/get_statistics/get_image) chama `assert_ready()` antes de qualquer request.
**Example:**
```python
# Fonte: backend_app/adapters/stellar.py:36-49 (padrão existente a replicar)
@dataclass(frozen=True)
class CopernicusAdapterConfig:
    client_id: str | None = None
    client_secret: str | None = None
    base_url: str = "https://sh.dataspace.copernicus.eu"
    stac_url: str = "https://stac.dataspace.copernicus.eu/v1"
    token_url: str = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

    @classmethod
    def from_env(cls) -> "CopernicusAdapterConfig":
        return cls(
            client_id=os.getenv("COPERNICUS_CLIENT_ID"),
            client_secret=os.getenv("COPERNICUS_CLIENT_SECRET"),
        )

    def assert_ready(self) -> None:
        missing = []
        if not self.client_id:
            missing.append("COPERNICUS_CLIENT_ID")
        if not self.client_secret:
            missing.append("COPERNICUS_CLIENT_SECRET")
        if missing:
            raise RuntimeError(f"Configuração Copernicus incompleta: {', '.join(missing)}")
```

### Pattern 2: Token OAuth2 cacheado (nunca por request)

**What:** Um único `httpx.AsyncClient` de longa duração no adapter, com `asyncio.Lock` protegendo a renovação do token e um campo `_token_expires_at` checado antes de cada chamada.
**When to use:** Toda chamada a STAC/Statistical/Process precisa de `Authorization: Bearer <token>`; o token dura ~10 min (D-08).
**Example:**
```python
# Conceitual — nenhum código de terceiros citado, fluxo confirmado em D-08
class CopernicusProvider:
    def __init__(self, config: CopernicusAdapterConfig | None = None) -> None:
        self.config = config or CopernicusAdapterConfig.from_env()
        self._client = httpx.AsyncClient(timeout=30.0)
        self._token: str | None = None
        self._token_expires_at: datetime | None = None
        self._token_lock = asyncio.Lock()
        self._concurrency = asyncio.Semaphore(2)  # D-11: 2 requests concorrentes no free tier

    async def _get_token(self) -> str:
        self.config.assert_ready()
        async with self._token_lock:
            if self._token and self._token_expires_at and datetime.now(timezone.utc) < self._token_expires_at:
                return self._token
            resp = await self._client.post(
                self.config.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.config.client_id,
                    "client_secret": self.config.client_secret,
                },
            )
            resp.raise_for_status()
            body = resp.json()
            self._token = body["access_token"]
            # margem de segurança: renova 30s antes de expirar de fato
            self._token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=body["expires_in"] - 30)
            return self._token
```

### Pattern 3: Lifespan FastAPI + APScheduler (infraestrutura nova, hoje inexistente)

**What:** `backend_app/main.py` hoje é `create_app()` puro sem nenhum hook de startup/shutdown [VERIFIED: lido nesta sessão, 37 linhas, sem `@app.on_event`/`lifespan=`]. É preciso introduzir um `asynccontextmanager` de lifespan que inicia o `AsyncIOScheduler` no startup e o encerra (`scheduler.shutdown()`) no shutdown, para não deixar jobs zumbis em testes/reload.
**When to use:** Registro do job periódico `SatelliteMonitoringJob` e do disparo assíncrono de `HISTORICAL_RECONSTRUCTION`.
**Example:**
```python
# Fonte: backend_app/main.py atual (create_app) — padrão FastAPI oficial de lifespan
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    register_satellite_jobs(scheduler, settings)  # novo módulo satellite/scheduler.py
    scheduler.start()
    app.state.scheduler = scheduler
    yield
    scheduler.shutdown(wait=False)

def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()
    application = FastAPI(..., lifespan=lifespan)
    ...
```
**Cuidado com testes:** `tests/conftest.py` hoje não usa `lifespan="off"` nem mocka scheduler — o plano deve prever que os testes de contrato (`test_api_integration.py` etc.) rodem sem exigir credenciais Copernicus reais nem iniciar jobs reais contra a rede (ex.: usar `TestClient` sem lifespan ativo para testes que não precisam do scheduler, ou usar `httpx.MockTransport`/`respx` para as chamadas Copernicus).

### Pattern 4: Extensão do Risk Engine puro (Phase 04.2) com sinal satelital

**What:** `risk_engine.py` é hoje um módulo explicitamente puro ("proibido importar o driver assíncrono de banco ou qualquer modelo do ORM", comentário no topo do arquivo). `compute_signals()` recebe `Sequence[ClaimSnapshot]` e `Sequence[ConflictSnapshot]`. A Phase 05 precisa de um terceiro snapshot (`ProjectEventSnapshot` ou similar) sem quebrar essa disciplina.
**When to use:** Toda vez que `IntegrityService.recalculate_risk_score` é chamado após uma decisão `CONFIRMED`/`DISMISSED`/`ANOMALY_REVIEW_CLEARED`.
**Example:**
```python
# Fonte: backend_app/modules/integrity/risk_engine.py:55-59 (assinatura atual a estender)
def compute_signals(
    claims: Sequence[ClaimSnapshot],
    conflicts: Sequence[ConflictSnapshot],
    satellite_events: Sequence[ProjectEventSnapshot] = (),  # NOVO parâmetro, default vazio
    settings: Settings | None = None,
) -> list[RiskSignalDTO]:
    ...
    confirmed_critical = [e for e in satellite_events if e.status == "CONFIRMED" and e.severity == "CRITICAL"]
    confirmed_high = [e for e in satellite_events if e.status == "CONFIRMED" and e.severity == "HIGH"]
    if confirmed_critical:
        signals.append(RiskSignalDTO(
            code="SATELLITE_ANOMALY_CONFIRMED_CRITICAL",
            weight=float(config.integrity_risk_weight_satellite_anomaly_critical),
            reason=f"+{weight:.0f} Anomalia satelital confirmada de severidade crítica",
            public_safe=True,
            metadata={"count": len(confirmed_critical)},
        ))
    # análogo para confirmed_high com peso menor
```
E em `integrity/service.py:707` (`recalculate_risk_score`), adicionar uma quarta query (`select(ProjectEvent).where(ProjectEvent.project_id == project.id, ProjectEvent.status == "CONFIRMED")`) ao lado das já existentes de `Claim`/`Evidence`/`Conflict`, montar os snapshots e repassar para `compute_signals`.

### Anti-Patterns to Avoid

- **Adotar `sentinelhub-py` "porque é o SDK oficial":** contradiz o padrão do repo (adapters usam clientes HTTP crus, não SDKs de terceiro) e introduz 8+ dependências de produção novas para uma superfície de API pequena. Ver "Alternatives Considered".
- **Chamar `deterministic_baseline()` e depois "esconder" o resultado:** D-07 exige que a função só sobreviva como fallback interno de teste/seed — se o plano mantiver `create_project` chamando-a incondicionalmente e só trocando o rótulo de exibição, viola SATM-07 (Bible seção 40/49 e a regra "sem nenhum campo derivado de deterministic_baseline()").
- **Criar um segundo mecanismo de bloqueio para anomalia confirmada:** D-20 é explícito — o Auto Hold já existe (`integrity_status = ON_HOLD` quando `risk_class == CRITICAL`). A Phase 05 só adiciona um sinal, nunca uma segunda gravação direta de `ON_HOLD`.
- **Rodar N projetos em paralelo contra o Sentinel Hub sem throttling:** viola D-11 (2 requests concorrentes no free tier) e pode gerar erro 429/quota estourada silenciosamente. O semáforo deve estar no adapter, não espalhado pelos call sites.
- **Misturar `pg_constraint` novo com `ENUM` do Postgres:** toda tabela desde `certification_workbench` (Phase 4) usa `text + check (... in (...))` — nunca `CREATE TYPE`. As nomeações de status/tipo desta fase (`SatelliteAnomaly.status`, `ProjectEvent.type`, job status) devem seguir esse padrão, não os 6 enums legados de `initial_schema.sql`.
- **Persistir imagem completa (GeoTIFF) no banco/records de observação mensal:** D-09 é explícito — Statistical API é a via preferencial exatamente para evitar isso; Process API (`before.png`/`after.png`) só roda quando uma anomalia chega a `ANALYZED` (D-19), nunca por observação de rotina.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upload multipart + hash + Storage para evidência de auditoria | Um segundo pipeline de upload próprio dentro de `audit/routes.py` | Reaproveitar `_validated_upload_payload`, `project_document_location`/`storage_paths.py`, `upload_storage_object` e `IntegrityService.create_evidence_for_document` — os mesmos usados por `upload_project_document` (routes.py:485-565) | O pipeline já valida tipo/tamanho/magic bytes, calcula SHA-256, deduplica por hash e já gera `Evidence` automaticamente (D-25 da Phase 04.2). Duplicar essa lógica em `audit/routes.py` criaria dois caminhos de verdade divergentes para o mesmo conceito de "documento com hash" |
| Renovação de token OAuth2 | Reimplementar cache de token manualmente em cada chamada, ou pior, buscar token a cada request | Um único `httpx.AsyncClient` de vida longa no adapter com `asyncio.Lock` + timestamp de expiração (Pattern 2 acima) | Buscar token por request violaria D-08 explicitamente e desperdiçaria quota/latência; implementar do zero sem lock gera race condition quando o scheduler dispara chamadas concorrentes |
| Cálculo de NDVI/NDMI/NBR a partir de bandas raster | Baixar imagens Sentinel-2 completas e calcular índices em Python (numpy/rasterio) | Statistical API do Sentinel Hub com evalscript (D-09) — o cálculo acontece no lado do Copernicus, o backend só recebe o JSON de estatísticas agregadas | Processar raster no backend exigiria GDAL/rasterio (peso de imagem Docker, tempo de build, memória), contradiz D-09 e a "Fase 4 — Environmental Indicators" da Bible que já assume Statistical API |
| Scheduler periódico | Loop `while True: sleep(...)` em uma thread própria, ou cron externo no host | `APScheduler` `AsyncIOScheduler` registrado no lifespan do FastAPI | APScheduler já resolve persistência de próxima execução, evita jobs duplicados por múltiplos workers (se necessário, com jobstore), e integra nativamente ao event loop asyncio já usado pelo Uvicorn |
| Detecção de idempotência de observação satelital | `SELECT ... WHERE ... FOR UPDATE` manual com lock de aplicação | Constraint `UNIQUE (project_id, satellite, scene_id, processing_version)` + `ON CONFLICT DO NOTHING`/upsert (D-15) | Mesmo padrão já usado em `evidence_document_method_idx`/`conflicts_project_related_type_idx` (migration 202608170001) — deixar o Postgres garantir unicidade é mais robusto que lock de aplicação distribuído |

**Key insight:** A Phase 05 tem uma tentação grande de "reinventar" porque é a primeira integração com um provedor de dados geoespaciais reais — mas o repositório já resolveu, em fases anteriores, exatamente os três problemas estruturais que essa fase precisa (upload+hash real, adapter fail-closed para provedor externo, tabela operacional interna idempotente com RLS). O trabalho novo de verdade é: (a) o cliente HTTP assíncrono com OAuth2 cacheado, (b) o scheduler, e (c) a lógica de negócio específica de anomalia/evento — tudo o resto é composição do que já existe.

## Common Pitfalls

### Pitfall 1: Tratar `httpx` como já disponível em produção
**What goes wrong:** `httpx` está hoje em `[dependency-groups] dev`, não em `[project] dependencies`. Se o adapter for escrito assumindo que `import httpx` funciona em produção sem mover a dependência, o build/deploy de produção (`Dockerfile.api`, que provavelmente instala só `uv sync --no-dev` ou equivalente) vai falhar silenciosamente ou quebrar em runtime.
**Why it happens:** `httpx` já é usado nos testes (`TestClient`/`AsyncClient`), então é fácil assumir que "já está instalado".
**How to avoid:** Mover `httpx` para `[project] dependencies` no `pyproject.toml` explicitamente como parte do primeiro plano desta fase, e verificar `Dockerfile.api`/`Dockerfile` para confirmar que o comando de instalação usado em produção não exclui dependências de produção incorretamente.
**Warning signs:** `ModuleNotFoundError: No module named 'httpx'` em produção mas não em `uv run pytest` local.

### Pitfall 2: Scheduler duplicado em múltiplos workers/reloads
**What goes wrong:** Se a API rodar com múltiplos workers Uvicorn (`--workers N`) ou com `--reload` em desenvolvimento, cada processo inicia seu próprio `AsyncIOScheduler` no lifespan — o mesmo job (`SatelliteMonitoringJob`) dispara N vezes simultaneamente, estourando o limite de 2 requests concorrentes (D-11) e gerando `SatelliteObservation` duplicadas (mitigado pela constraint única, mas ainda desperdiça quota).
**Why it happens:** APScheduler in-process, por definição, não tem coordenação entre processos sem um jobstore compartilhado (ex. `SQLAlchemyJobStore`).
**How to avoid:** Documentar explicitamente no plano que o deploy de produção (Dokploy, conforme `docker-compose.dokploy.yml`) deve rodar com um único worker de API, ou usar `SQLAlchemyJobStore` do APScheduler apontando para o mesmo Postgres, com `replace_existing=True` e `misfire_grace_time` configurado — mas isso é decisão de escopo que o plano precisa tomar explicitamente (Assumptions Log A2).
**Warning signs:** `copernicus_api_usage` mostrando N chamadas simultâneas para o mesmo `project_id`+`scene_id` na mesma janela de tempo; erros 429 do Sentinel Hub sem carga real correspondente.

### Pitfall 3: Confundir `AsyncIOScheduler` com execução bloqueante dentro do job
**What goes wrong:** Um job registrado no `AsyncIOScheduler` roda na mesma thread/event loop do FastAPI. Se o `CopernicusProvider` (ou qualquer parte do pipeline de reconstrução/monitoramento) fizer uma chamada síncrona bloqueante (ex. `requests.get` em vez de `httpx.AsyncClient`, ou uma query SQLAlchemy síncrona), todo o servidor HTTP trava durante a execução do job — exatamente o problema que D-14/SATM-10 pedem para evitar.
**Why it happens:** É fácil, ao portar lógica de exemplos síncronos de documentação Copernicus/Sentinel Hub (que costumam usar `requests`), esquecer de reescrever para `httpx.AsyncClient`.
**How to avoid:** Todo I/O dentro dos jobs (HTTP para Copernicus, queries ao Postgres) deve usar as versões assíncronas já padrão no projeto (`httpx.AsyncClient`, `AsyncSession` do SQLAlchemy). Nenhuma chamada `requests.*` ou SQLAlchemy síncrono deve entrar no código novo.
**Warning signs:** Requests HTTP normais da API ficando lentos/travando exatamente durante a janela do job periódico.

### Pitfall 4: Vazar `evidencias_url` como lista de strings arbitrárias no contrato público
**What goes wrong:** D-02 exige que `evidencias_url` passe a referenciar `Document.id` reais, mas mantendo o nome do campo por compatibilidade. Se o plano simplesmente trocar o tipo do campo sem cuidar da serialização, o frontend (`AuditorReview.tsx`) e o dossiê público podem acabar expondo UUIDs internos de `Document` sem uma URL de download real, ou pior, vazando `storage_object_path` interno no dossiê público minimizado (violando o mesmo anti-padrão já documentado em ARCHITECTURE.md: "Misturar dossiê público e interno").
**Why it happens:** O campo já existe e "funciona" — a tentação é só trocar a origem do dado sem revisar a resposta serializada de ponta a ponta (interna vs pública).
**How to avoid:** Seguir explicitamente o padrão `document_item` (interno, completo) vs `public_document_item` (público, minimizado) já estabelecido na Phase 4 para os documentos de certificação — replicar essa dualidade para evidências de auditoria.
**Warning signs:** Teste de contrato do dossiê público passando UUID interno de storage sem passar por um serializador de minimização dedicado.

### Pitfall 5: Assumir que `project_events` correlaciona diretamente sem revisão dos tipos existentes
**What goes wrong:** O ciclo `DETECTED → ANALYZED → CONFIRMED/DISMISSED` (D-18) e o vocabulário `VEGETATION_LOSS/VEGETATION_RECOVERY/POSSIBLE_FIRE` (D-17) são novos — não existe hoje nenhuma tabela `project_events` ou enum equivalente no schema atual [VERIFIED: grep no repositório não encontrou `project_events`/`ProjectEvent` fora de `.planning/`]. Um plano ingênuo pode tentar reaproveitar `audit_events` (que já existe, mas é a trilha de auditoria genérica de toda a aplicação, não um domínio de eventos ambientais com estado próprio) em vez de criar a tabela nova `project_events` explicitamente pedida pela Bible/D-16.
**Why it happens:** O nome "events" já existe no sistema (`audit_events`), e é tentador reaproveitá-lo por semelhança de nome.
**How to avoid:** `project_events` é uma tabela de domínio nova (com `status`, `type`, `geometry`, `confirmed_by`, etc. — ver seção 40 da Bible), distinta de `audit_events` (log de auditoria genérico write-once). Cada transição de `ProjectEvent` (`DETECTED`→`ANALYZED`→`CONFIRMED`/`DISMISSED`) deve, adicionalmente, gerar uma entrada em `audit_events` (trilha), mas as duas tabelas não são a mesma coisa.
**Warning signs:** Planejador tentando adicionar colunas de domínio ambiental (`ndvi_before`, `affected_area_ha`, `confidence`) diretamente em `audit_events`.

## Code Examples

### Verificação de dependências novas via PyPI (reprodutível)

```bash
# Fonte: consulta direta ao índice PyPI nesta sessão (2026-08-16)
curl -s https://pypi.org/pypi/APScheduler/json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['info']['version'], d['info']['requires_python'])"
# -> 3.11.3 >=3.8

curl -s https://pypi.org/pypi/sentinelhub/json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['info']['version'], d['info']['requires_python'])"
# -> 3.11.5 >=3.8 (rejeitado — ver Alternatives Considered)
```

### Migration idempotente (padrão exato a seguir, extraído da Phase 04.2)

```sql
-- Fonte: supabase/migrations/202608170001_integrity_claims_evidence_conflicts.sql
-- Padrão a replicar para satellite_observations/satellite_anomalies/project_events/
-- satellite_evidence/copernicus_api_usage/credit_adjustment_pendencies

create table if not exists satellite_observations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  provider text not null default 'COPERNICUS',
  satellite text not null default 'SENTINEL_2',
  product text not null default 'L2A',
  scene_id text not null,
  processing_version text not null default 'v1',
  observed_at timestamptz not null,
  cloud_coverage numeric(5, 2),
  ndvi_mean numeric(6, 4),
  ndvi_min numeric(6, 4),
  ndvi_max numeric(6, 4),
  ndmi_mean numeric(6, 4),
  nbr_mean numeric(6, 4),
  valid_pixel_percentage numeric(5, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- D-15: idempotencia exata pedida pelo CONTEXT.md
create unique index if not exists satellite_observations_idempotency_idx
  on satellite_observations (project_id, satellite, scene_id, processing_version);
create index if not exists satellite_observations_project_observed_idx
  on satellite_observations (project_id, observed_at desc);

alter table satellite_observations enable row level security;
revoke insert, update, delete on satellite_observations from anon, authenticated;
-- D-16: sem policy de select — leitura só via /api/v1 org-scoped.
```

### Extensão de `RISK_SIGNAL_CODES` (constants.py) sem quebrar o CHECK existente

```python
# Fonte: backend_app/modules/integrity/constants.py:106-115 (a estender)
RISK_SIGNAL_CODES: tuple[str, ...] = (
    "OVERLAP_CRITICAL",
    "OVERLAP_HIGH",
    "OVERLAP_MEDIUM",
    "OVERLAP_LOW",
    "DOUBLE_CLAIM",
    "LAND_CLAIM_UNVERIFIED",
    "CLAIM_EVIDENCE_PENDING",
    "POSSESSION_WITHOUT_TITLE",
    # NOVO — Phase 05 / D-20
    "SATELLITE_ANOMALY_CONFIRMED_CRITICAL",
    "SATELLITE_ANOMALY_CONFIRMED_HIGH",
)
```
Isso exige uma migration adicional para atualizar o `CHECK` de `risk_signals.code` (se existir um `check (code in (...))` — verificar em `202608170002_integrity_risk_assessments.sql`, não lido integralmente nesta sessão; o plano deve confirmar se `code` tem CHECK constraint ou é `text` livre antes de decidir se precisa de `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `deterministic_baseline()` — hash SHA-256 do nome do projeto simulando NDVI/vegetação | `CopernicusProvider` real via Statistical API sobre `active_boundary` | Esta fase (05) | SATM-07 exige que nenhum campo exibido derive de `deterministic_baseline()`; a função só sobrevive como fallback de teste/seed interno |
| `evidenceFiles` com `localUrl: local://auditoria/...` (nunca persistido de verdade) | Upload multipart real → `Document`/`Evidence` com hash SHA-256 | Esta fase (05) | SATM-01/SATM-02; mesmo padrão de "não simular sucesso de provedor" já em vigor para blockchain (`ARCHITECTURE.md` anti-padrão "Simular sucesso de provedores externos") |
| Nenhuma infraestrutura assíncrona no backend (tudo síncrono no ciclo request/response) | Lifespan FastAPI + APScheduler in-process | Esta fase (05), primeira vez no projeto | Introduz um novo tipo de bug possível (jobs bloqueantes, scheduler duplicado — ver Pitfalls 2/3), exige atenção extra em testes e deploy |

**Deprecated/outdated:** Nenhum — esta é a primeira vez que o domínio de monitoramento satelital é implementado de verdade no Sinarca (a Phase 3 já documentava `sentinel_status: BLOCKED_MISSING_PROVIDER_CREDENTIALS` como estado esperado até esta fase).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `APScheduler` `AsyncIOScheduler` (v3.x) é compatível e suficiente para os dois casos de uso (disparo único pós-criação de projeto + job periódico), sem precisar de `SQLAlchemyJobStore` no MVP. | Standard Stack / Pattern 3 | Se o deploy Dokploy rodar múltiplos workers de API (não confirmado nesta sessão — `docker-compose.dokploy.yml` não foi lido em profundidade), o scheduler in-process duplicaria jobs (Pitfall 2). O plano deve confirmar o número de workers de produção antes de decidir se precisa de jobstore compartilhado |
| A2 | `sentinelhub-py` deve ser rejeitado em favor de `httpx` puro. | Standard Stack / Alternatives Considered | Se a equipe descobrir, ao implementar, que o parsing exato do evalscript/resposta da Statistical API é mais complexo do que o esperado (formatos de resposta menos documentados que STAC), `sentinelhub-py` poderia economizar tempo de implementação às custas do peso de dependências — decisão reversível, mas deve ser revisitada se a implementação `httpx` pura se mostrar muito mais lenta que o esperado |
| A3 | `risk_signals.code` na migration `202608170002_integrity_risk_assessments.sql` usa `text` livre ou `check (code in (...))` — não foi lida integralmente nesta sessão, apenas inferida por analogia ao padrão de `constants.py`. | Code Examples | Se houver CHECK constraint fechado, o plano precisa incluir uma migration adicional para adicionar os dois novos códigos de sinal ao CHECK; se não descoberto a tempo, a persistência do novo `RiskSignal` falhará em runtime com erro de constraint violation |
| A4 | Nenhum provedor de push/e-mail existe hoje no projeto (confirmado por D-21, não re-verificado via grep nesta sessão) — a "notificação" desta fase é só timeline/audit_events. | User Constraints (D-21) | Baixo risco — decisão já travada em CONTEXT.md, apenas herdada aqui |
| A5 | O deploy de produção (`Dockerfile.api`) instala dependências via `uv sync` respeitando `[project] dependencies` (não `--all-groups` incluindo dev) — não foi lido `Dockerfile.api` nesta sessão para confirmar o comando exato de instalação. | Common Pitfalls / Pitfall 1 | Se o Dockerfile de produção já instalar `--all-groups`/`--dev`, mover `httpx` para dependências de produção seria redundante mas inofensivo; se não, é obrigatório para não quebrar produção |

**Se esta tabela estivesse vazia:** não está — 5 itens precisam de confirmação leve antes/durante o planejamento (nenhum bloqueia o início do planejamento, mas A1/A3/A5 devem ser confirmados no primeiro plano de execução via leitura direta dos arquivos citados).

## Open Questions

1. **`risk_signals.code` tem CHECK constraint fechado?**
   - What we know: `constants.py` define `RISK_SIGNAL_CODES` como tupla canônica e o comentário do arquivo diz "Estas tuplas sao a fonte unica de verdade: os check constraints das migrations 202608170001 e 202608170002 espelham exatamente estas listas."
   - What's unclear: a migration `202608170002_integrity_risk_assessments.sql` (tabela `risk_signals`) não foi lida integralmente nesta sessão — só `202608170001` (claims/evidence/conflicts) foi lida na íntegra.
   - Recommendation: primeiro plano de execução deve ler `202608170002_integrity_risk_assessments.sql` por completo antes de escrever a migration que adiciona `SATELLITE_ANOMALY_CONFIRMED_*` ao vocabulário, e criar o `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT` correspondente se necessário.

2. **Quantos workers de API roda o deploy de produção (Dokploy)?**
   - What we know: `docker-compose.dokploy.yml` define o contrato de produção com API/web/Postgres externo (citado em `ARCHITECTURE.md`), mas o número de workers Uvicorn não foi confirmado nesta sessão.
   - What's unclear: se `--workers > 1`, o scheduler in-process duplica jobs (Pitfall 2).
   - Recommendation: o plano deve ler `Dockerfile.api`/`docker-compose.dokploy.yml` e, se `--workers > 1` ou não especificado (Uvicorn default é 1 worker sem `--workers`), documentar explicitamente a restrição de single-worker para esta fase, ou introduzir `SQLAlchemyJobStore` desde já.

3. **`Audit` precisa de uma coluna nova para vincular `Document`s da mesma sessão de auditoria, ou basta `evidence_urls` (JSONB) guardando uma lista de `Document.id` como string?**
   - What we know: `Audit.evidence_urls` já é `JSONB` (`mapped_column(JSONB, ..., server_default=text("'[]'::jsonb"))`) — tecnicamente já suporta guardar uma lista de UUIDs como strings sem migration.
   - What's unclear: se o time quer uma FK real (tabela de junção `audit_evidence`) para integridade referencial, em vez de UUIDs soltos em JSONB — mais robusto, mas exige migration nova e não é estritamente exigido por D-02 ("mantém compatibilidade de schema").
   - Recommendation: começar com JSONB de `Document.id`s (menor mudança, compatível com D-02), documentando explicitamente que integridade referencial é garantida na aplicação (Document deve existir e pertencer ao mesmo `project_id` da Audit antes de aceitar o ID), não pelo banco. Se o volume/necessidade de auditoria cruzada crescer, uma tabela de junção pode ser adicionada depois sem quebrar o contrato de API.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` | `CopernicusProvider` (D-08, D-10) | ✗ [VERIFIED: não encontrado em `.env`/env atual, confirmado pelo próprio CONTEXT.md D-10 como pré-requisito operacional fora do código] | — | Adapter falha fechado com erro explícito (`assert_ready()`), mesmo tratamento dos outros providers em staging (Stellar/Etherfuse/Polygon) — monitoramento fica bloqueado até credenciais existirem, mas o código deve estar pronto para funcionar assim que as credenciais forem configuradas |
| httpx (produção) | `CopernicusProvider` (todas as chamadas HTTP) | Parcial — presente no lockfile como dependência de **dev**, não de produção [VERIFIED: `pyproject.toml`/`uv.lock` lidos nesta sessão] | `0.28.1` | Mover para `[project] dependencies` — sem fallback necessário, é apenas uma mudança de configuração, não uma dependência ausente do ecossistema |
| APScheduler | Scheduler in-process (D-14) | ✗ — nenhuma referência no código, apenas no roadmap [VERIFIED: grep no repo, único hit é `.planning/ROADMAP.md`] | `3.11.3` (PyPI, verificado nesta sessão) | Nenhum fallback necessário — é uma dependência nova a adicionar, sem bloqueio técnico conhecido |
| PostGIS / `project_boundaries.active_boundary` | AOI para todas as chamadas Copernicus (D-09) | ✓ [VERIFIED: Phase 04.1 já entregue, `202608150002_enable_postgis.sql`/`202608150003_project_boundaries.sql` aplicados] | PostGIS 3.3.7 | — |
| Supabase Storage (buckets `projects`) | Upload real de evidência de auditoria (D-01) | ✓ [VERIFIED: já usado por `upload_project_document`, `storage_paths.py`] | — | — |

**Missing dependencies com no fallback:**
- `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` — bloqueiam toda a trilha de satélite em staging/produção até serem provisionados; o código deve ser escrito para funcionar assim que existirem, seguindo o mesmo tratamento fail-closed documentado em `.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md` para os outros providers.

**Missing dependencies com fallback:**
- `httpx` em produção — resolvido apenas movendo de grupo no `pyproject.toml`, sem risco técnico.
- `APScheduler` — dependência nova sem conflito conhecido com o restante do manifesto (Python `>=3.8` requerido, projeto pinado em `3.11`).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest `>=9.0.3` [VERIFIED: `pyproject.toml` `[dependency-groups] dev`] |
| Config file | nenhum `pytest.ini`/`pyproject.toml [tool.pytest]` encontrado — configuração mínima via `tests/conftest.py` (define `DATABASE_URL` default e um fixture `autouse` que limpa env de Storage/Supabase entre testes) |
| Quick run command | `uv run pytest -q tests/test_risk_engine.py` (ou o(s) novo(s) arquivo(s) de teste desta fase) |
| Full suite command | `uv run pytest -q` |

Os testes existentes (`tests/test_api_integration.py`, `tests/test_project_boundaries.py`, `tests/test_project_conflicts.py`, `tests/test_risk_engine.py`) rodam contra Postgres local real via `DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres` (Supabase local Docker) — não há mocking de banco. `tests/test_risk_engine.py` já testa `compute_signals`/`score_from_signals` como funções puras (sem sessão de banco), confirmando que o padrão de teste unitário puro (sem I/O) é o esperado para o novo `anomaly_detector.py`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SATM-01 | Upload real de evidência de auditoria gera `Document`/`Evidence`, não `local://` | integration | `uv run pytest -q tests/test_audit_field_evidence.py -x` | ❌ Wave 0 |
| SATM-02 | Assinatura stub SHA-256 é determinística e reproduzível a partir dos mesmos inputs | unit | `uv run pytest -q tests/test_audit_field_evidence.py::test_signature_stub_deterministic -x` | ❌ Wave 0 |
| SATM-03 | Laudo/evidência aparecem no dossiê público minimizado sem notas internas | integration | `uv run pytest -q tests/test_api_integration.py -k dossier -x` (estender arquivo existente) | ✅ (arquivo existe, teste novo) |
| SATM-04 | Fluxo fail-closed de NFC já coberto no frontend (Phase 3) — sem novo teste de backend necessário | manual-only | — (comportamento client-side, `fieldCapture.ts` já testado/usado desde Phase 3) | — |
| SATM-05 | `CopernicusProvider.search_scenes`/`get_statistics` idempotentes, reconstrução persiste ~60 pontos/5 anos | unit + integration | `uv run pytest -q tests/adapters/test_copernicus.py -x` (mock via `httpx.MockTransport`/`respx`, sem credenciais reais) | ❌ Wave 0 |
| SATM-06 | `AnomalyDetector` puro nunca gera `DEFORESTATION`, sempre restrito ao vocabulário permitido | unit | `uv run pytest -q tests/modules/satellite/test_anomaly_detector.py -x` | ❌ Wave 0 |
| SATM-07 | Nenhum campo de baseline exibido vem de `deterministic_baseline()` quando `CopernicusProvider` está configurado | integration | `uv run pytest -q tests/test_project_boundaries.py -k baseline -x` (estender) | ✅ (arquivo existe, teste novo) |
| SATM-08 | `ProjectEvent CONFIRMED HIGH/CRITICAL` dispara Auto Hold via novo sinal | unit + integration | `uv run pytest -q tests/test_risk_engine.py -k satellite -x` (estender arquivo existente) | ✅ (arquivo existe, teste novo) |
| SATM-09 | `credit_adjustment_pendencies` criada e créditos ajustados após incidente confirmado | integration | `uv run pytest -q tests/test_satellite_incident_recalc.py -x` | ❌ Wave 0 |
| SATM-10 | Job de monitoramento respeita `maxCloudCoverage`, é idempotente, não bloqueia request HTTP | unit + integration | `uv run pytest -q tests/modules/satellite/test_monitoring_job.py -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest -q <arquivo tocado>`
- **Per wave merge:** `uv run pytest -q`
- **Phase gate:** Suite completa verde antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/adapters/test_copernicus.py` — cobre SATM-05, mocka `httpx.AsyncClient` (via `respx` ou `httpx.MockTransport`, nenhum dos dois presente no lockfile hoje — avaliar adicionar `respx` como dev-dependency ou usar `httpx.MockTransport` puro, que não exige dependência nova)
- [ ] `tests/modules/satellite/test_anomaly_detector.py` — cobre SATM-06, função pura sem banco
- [ ] `tests/modules/satellite/test_monitoring_job.py` — cobre SATM-10, idempotência e respeito a `maxCloudCoverage`
- [ ] `tests/test_audit_field_evidence.py` — cobre SATM-01/SATM-02
- [ ] `tests/test_satellite_incident_recalc.py` — cobre SATM-09
- [ ] Diretório `tests/modules/satellite/` não existe ainda — criar junto com o módulo `backend_app/modules/satellite/`
- [ ] Diretório `tests/adapters/` já existe (`ls tests/adapters` retornou resultado) — confirmar convenção de nomeação antes de adicionar `test_copernicus.py`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não diretamente (Copernicus usa OAuth2 client-credentials machine-to-machine, não autentica usuário final) | — |
| V3 Session Management | não aplicável a esta fase | — |
| V4 Access Control | sim | Rotas novas (`/projects/{id}/satellite/*`, `/projects/{id}/environmental-events`) devem usar `require_role`/`_assert_project_edit_permission` org-scoped, mesmo padrão de `boundary-overlaps` (Phase 04.1, guardado porque "revela existência e proximidade geométrica de projetos de terceiros") — dados de anomalia/evento também são sensíveis e não devem vazar para outros produtores/certificadoras |
| V5 Input Validation | sim | Upload de evidência de auditoria: reaproveitar exatamente `_validated_upload_payload` (tipo/extensão/tamanho/magic bytes) já usado em `upload_project_document`; parâmetros de AOI (geometria) já validados pela Phase 04.1 (`ST_IsValid`, autointerseção) |
| V6 Cryptography | sim | `sha256_hash` para evidência (já padrão do projeto), `digital_signature` stub SHA-256 (D-03) — **nunca** usar hash como substituto de assinatura criptográfica real (a UI deve rotular explicitamente como "stub", não "assinatura digital verificada", conforme D-03) |
| V10 Malicious/Untrusted Data (SSRF) | sim (novo nesta fase) | `CopernicusProvider` faz requests HTTP de saída para hosts fixos e conhecidos (`identity.dataspace.copernicus.eu`, `stac.dataspace.copernicus.eu`, `sh.dataspace.copernicus.eu`) — nunca aceitar URL/host configurável vindo de input de usuário/request; base URLs devem ser constantes de código ou config de ambiente, nunca parâmetro de rota |

### Known Threat Patterns for FastAPI + integração HTTP externa assíncrona

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Vazamento de `COPERNICUS_CLIENT_SECRET` em log/erro | Information Disclosure | Nunca logar o corpo da resposta de erro do token endpoint nem o payload da request de token; seguir o padrão já usado (adapters não logam segredos, `Settings` não expõe segredos em `__repr__`) |
| Token OAuth2 cacheado sem expiração respeitada, gerando 401 em cascata sob carga | Denial of Service (auto-infligido) | Margem de segurança na expiração (renovar 30s antes, Pattern 2), `asyncio.Lock` para evitar N renovações simultâneas |
| Job de monitoramento duplicado por múltiplos workers estourando quota (D-11) | Denial of Service / Resource Exhaustion | Ver Pitfall 2 — single-worker documentado ou `SQLAlchemyJobStore` |
| Upload de evidência de auditoria com arquivo malicioso disfarçado (extensão trocada) | Tampering | Reaproveitar validação de magic bytes já existente em `_validated_upload_payload`, sem criar caminho de upload alternativo sem essa validação |
| IDOR em `Audit`/`ProjectEvent` de outro projeto via manipulação de `project_id`/`event_id` na URL | Elevation of Privilege | Mesmo guard `_assert_project_edit_permission` org-scoped já usado em todas as rotas de projeto sensíveis; todo endpoint novo desta fase deve reaproveitá-lo, não reinventar checagem de permissão |
| Falsificação de decisão `CONFIRMED`/`DISMISSED` de evento por ator sem papel de auditor/certificadora | Spoofing / Elevation of Privilege | `require_role("auditor", "admin")` (ou certificadora conforme regra de negócio final) na rota de decisão, mesmo padrão de `verify_project` (audit/routes.py:48-52) |

## Sources

### Primary (HIGH confidence)
- Leitura direta do repositório nesta sessão: `backend_app/main.py`, `backend_app/adapters/stellar.py`, `backend_app/modules/audit/routes.py`, `backend_app/modules/storage_paths.py`, `backend_app/modules/projects/routes.py` (upload_project_document, linhas 485-565), `backend_app/modules/projects/service.py` (create_project linhas 802-900+, deterministic_baseline linha 1889), `backend_app/modules/integrity/risk_engine.py`, `backend_app/modules/integrity/service.py` (recalculate_risk_score linhas 707-852), `backend_app/modules/integrity/constants.py`, `backend_app/core/config.py`, `pyproject.toml`, `uv.lock`, `supabase/migrations/202608170001_integrity_claims_evidence_conflicts.sql`, `supabase/migrations/202608150001_certification_workbench.sql`, `tests/conftest.py`, `src/services/fieldCapture.ts`, `src/pages/Dashboard/AuditorReview.tsx` (padrão `local://`, linhas 45-291).
- PyPI JSON API consultado diretamente nesta sessão para `APScheduler` (3.11.3, `requires_python >=3.8`) e `sentinelhub` (3.11.5, deps de produção listadas).
- `.planning/phases/05-satellite-monitoring-and-field-audit/05-CONTEXT.md` — decisões travadas (D-01..D-26), já fundamentadas em pesquisa externa Copernicus de sessão anterior.
- `.planning/docs/bible/15_Geofance_sentinel_requisitos.md` — PRD completo, seções 5-54.

### Secondary (MEDIUM confidence)
- `.planning/codebase/STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md` — análise datada de 2026-05-27, anterior às Phases 4/04.1/04.2; cruzado com leitura direta do código atual nesta sessão para os pontos citados.
- Endpoints/quotas Copernicus (D-08/D-09/D-11 do CONTEXT.md) — não re-verificados nesta sessão (instrução explícita do orquestrador para não re-pesquisar), tratados como MEDIUM por terem sido "confirmados por pesquisa externa" em sessão anterior sem re-checagem direta aqui.

### Tertiary (LOW confidence)
- Comportamento exato de deploy de produção (número de workers Uvicorn, comando exato de instalação de dependências no `Dockerfile.api`) — não lido nesta sessão, sinalizado em Open Questions/Assumptions Log.
- Conteúdo completo de `supabase/migrations/202608170002_integrity_risk_assessments.sql` (schema de `risk_signals`) — não lido integralmente, apenas inferido por analogia.

## Metadata

**Confidence breakdown:**
- Standard stack (httpx/APScheduler vs sentinelhub-py): HIGH — verificado via PyPI e grep direto no repositório nesta sessão.
- Ganchos de código (create_project, upload_project_document, risk_engine, audit/routes.py, storage_paths.py, main.py sem lifespan): HIGH — lidos diretamente nesta sessão.
- Integração Copernicus (endpoints/OAuth2/quotas): MEDIUM — herdada de pesquisa externa de sessão anterior, não re-verificada nesta sessão por instrução explícita.
- Modelagem exata de `risk_signals` CHECK constraint: LOW — não lida integralmente, sinalizada como Open Question.
- Deploy/produção (workers, Dockerfile.api): LOW — não lida nesta sessão, sinalizada como Assumption/Open Question.

**Research date:** 2026-08-16
**Valid until:** 30 dias para os ganchos de código (estável, só muda se outra fase tocar os mesmos arquivos antes do planejamento desta fase avançar); 14 dias para versões de pacote (httpx/APScheduler/sentinelhub-py — ecossistema Python de baixa volatilidade, mas releases podem mudar recomendação de versão pinada); Copernicus endpoints/quotas devem ser re-confirmados no momento da implementação real (credenciais ainda não provisionadas nesta sessão).
