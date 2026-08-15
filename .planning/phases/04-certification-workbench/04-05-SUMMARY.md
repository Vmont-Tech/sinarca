---
phase: 04-certification-workbench
plan: 05
subsystem: api
tags: [fastapi, sqlalchemy, audit-events, queues, pendencies]

# Dependency graph
requires:
  - phase: 04-certification-workbench/04-01
    provides: "CertificationPendency (modelo + tabela certification_pendencies)"
  - phase: 04-certification-workbench/04-03
    provides: "GET /certifier/projects/{id}/history e GET /projects/{id}/pendencies (adicionados como Rule 2 no plano 04-03), ProjectsService.certification_history/_assert_project_edit_permission/_actor_profile"
provides:
  - "GET /certifier/queue?scope=main|corrections — fila da certificadora derivada de CertificationPendency.status='OPEN', com counts.main/counts.corrections em toda resposta"
  - "GET /certifier/projects/{id}/history?event_type=&actor_role= — filtro por tipo de evento e ator sobre o histórico já existente"
  - "POST /projects/{id}/pendencies/{pendency_id}/respond — produtor responde pendência, projeto volta à fila principal, CERTIFICATION_PENDENCY_ANSWERED registrado"
affects: [04-06, 04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separação de fila por escopo é derivada de um EXISTS sobre certification_pendencies.status='OPEN' (subquery correlacionada), nunca de um novo valor no enum project_status — evita tocar PROJECT_STATUS_TO_LIFECYCLE_CODE/MARKETPLACE_READY_PROJECT_STATUSES/PROJECT_STATUS_PRESENTATION/RLS."
    - "Endpoints consumidos por tests/test_certifier_workbench.py (contrato imutável criado no plano 04-01, Wave 0, nunca modificado por planos 02-05) mantêm o formato JSON de resposta exigido pelo teste mesmo quando a prosa do plano descreve um envelope diferente — o teste é a fonte de verdade do contrato, a prosa da action é a intenção de implementação."

key-files:
  created: []
  modified:
    - backend_app/modules/certifier/routes.py
    - backend_app/modules/projects/routes.py
    - backend_app/modules/projects/schemas.py

key-decisions:
  - "CertifierQueueResponse usa `items` (chave exigida pelo teste test_correction_queue_split_and_producer_response) e também `projects` (alias de compatibilidade com CertifierReview.tsx, que ainda lê response.projects e só será migrado em 04-06/04-07) — as duas chaves apontam para a mesma lista."
  - "GET /certifier/projects/{id}/history ganhou filtros ?event_type= e ?actor_role=, mas manteve o formato de lista JSON no nível raiz (não o envelope CertificationHistoryResponse com availableEventTypes/availableActorRoles descrito na prosa do plano), porque tests/test_approve_creates_treasury_authorization e tests/test_decisions_are_append_only (citados pelo próprio plano como <verify> da Task 2) consomem essa rota via `for item in history_response.json()` — envelopar quebraria os dois. O frontend pode derivar tipos/atores disponíveis a partir da mesma chamada sem filtro."
  - "GET /projects/{id}/pendencies já existia (adicionado no plano 04-03 como Rule 2) e já retornava lista JSON no nível raiz compatível com o teste — nenhuma mudança foi necessária nesse endpoint nesta plan."

requirements-completed: [CERT-01, CERT-05]

# Metrics
duration: ~35min
completed: 2026-08-15
---

# Phase 04 Plan 05: Fila com Escopo, Histórico Filtrável e Resposta do Produtor à Pendência Summary

**`GET /certifier/queue` ganhou `?scope=main|corrections` com contadores derivados de `CertificationPendency.status='OPEN'`, o histórico de certificação ganhou filtros `?event_type=`/`?actor_role=`, e o produtor agora responde pendências via `POST /projects/{id}/pendencies/{pendency_id}/respond`, fechando o ciclo de correção sem alterar o enum de status do projeto.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-15T14:10:00Z
- **Tasks:** 3/3
- **Files modified:** 3 (`backend_app/modules/certifier/routes.py`, `backend_app/modules/projects/routes.py`, `backend_app/modules/projects/schemas.py`)

## Accomplishments

- `GET /certifier/queue` aceita `?scope=main|corrections` (default `main`, compatível com o cliente atual). A separação é uma subquery `EXISTS` correlacionada sobre `certification_pendencies` filtrada por `status='OPEN'`, aplicada com `~has_open`/`has_open` sobre os mesmos três status elegíveis (`CREATED`, `REGISTERED`, `AWAITING_CERTIFICATION`). `CertifierQueueResponse` traz `total`, `items` (chave exigida pelo contrato de testes), `projects` (alias de compatibilidade com o frontend legado), `scope` e `counts={"main": n, "corrections": m}` — os contadores são calculados independentemente do escopo pedido, então a UI pode badge as duas abas em uma única chamada.
- `GET /certifier/projects/{id}/history` (já existia desde o plano 04-03) ganhou `?event_type=` (compara com `action`, case-insensitive) e `?actor_role=` (delegado para `ProjectsService.certification_history`, que já suportava esse parâmetro desde o plano 04-02). Cada evento já trazia `label` PT-BR via `CERTIFICATION_HISTORY_LABELS` desde a implementação original do serviço — nenhuma mudança foi necessária aí.
- `POST /projects/{id}/pendencies/{pendency_id}/respond` (novo): guard org-scoped via `_assert_project_edit_permission` (não apenas `require_role`), 404 se a pendência não existe ou não pertence ao projeto da rota, 409 se já `RESOLVED`, 400 se a resposta vier vazia. No caminho feliz, marca a pendência `RESOLVED` com `producer_response`/`responded_at`/`resolved_at`/`responded_by_profile_id`, acrescenta uma entrada pública em `project.timeline` (o texto da resposta do produtor, diferente das notas internas do certificador — ver 04-03-SUMMARY sobre por que notas internas nunca vão para `timeline`), grava `CERTIFICATION_PENDENCY_ANSWERED` com `actor_external_id`/`pendency_id`/`response` em `metadata`, e retorna `open_pendencies`/`back_to_main_queue` para o frontend saber se o projeto já voltou à fila principal sem precisar reconsultar a fila.
- Confirmado por teste: depois de a última pendência aberta ser respondida, o projeto some de `GET /certifier/queue?scope=corrections` e reaparece em `?scope=main` — nenhum estado extra foi necessário porque as duas queries são recomputadas a cada chamada a partir de `certification_pendencies.status`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fila da certificadora com escopo e contadores** - `4158f63` (feat)
2. **Task 2: Linha do tempo de certificação por projeto com filtros** - `9134c77` (feat)
3. **Task 3: Pendências visíveis e respondíveis pelo produtor** - `f9a47eb` (feat)

**Plan metadata:** (a ser adicionado no commit final desta execução)

## Files Created/Modified

- `backend_app/modules/certifier/routes.py` — `CERTIFIER_QUEUE_STATUSES`, `_open_pendency_exists()`, `certifier_queue` reescrito com `scope`/`counts`; `certifier_project_history` ganha `event_type`/`actor_role`.
- `backend_app/modules/projects/routes.py` — novo `POST /projects/{project_id}/pendencies/{pendency_id}/respond`; imports de `uuid`, `datetime`/`timezone`, `func`, `PendencyRespondRequest`.
- `backend_app/modules/projects/schemas.py` — `CertifierQueueResponse` (items/projects/scope/counts) e `PendencyRespondRequest`.

## Decisions Made

- `CertifierQueueResponse.items` é a chave exigida pelo contrato de testes imutável (`tests/test_certifier_workbench.py`, criado no plano 04-01/Wave 0); `CertifierQueueResponse.projects` foi mantida como alias apontando para a mesma lista para não quebrar `src/pages/Dashboard/CertifierReview.tsx`, que ainda lê `response.projects` e só será migrado em um plano de UI futuro (04-06/04-07).
- O histórico de certificação manteve o formato de lista JSON no nível raiz em vez do envelope `CertificationHistoryResponse`/`availableEventTypes` descrito na prosa do plano — ver Deviations abaixo para o racional completo.
- `GET /projects/{id}/pendencies` não foi tocado: já existia desde o plano 04-03 (Rule 2 daquele plano) e já satisfazia integralmente o comportamento exigido pela Task 3 desta plan (lista JSON no nível raiz, guard `_assert_project_edit_permission`).

## Deviations from Plan

### Auto-fixed Issues

Nenhuma correção de bug ou funcionalidade crítica ausente foi necessária — as três tasks foram implementadas com sucesso. Houve, porém, dois desvios deliberados de contrato de resposta, documentados abaixo (mesma categoria de decisão já registrada nos planos 04-03/04-04: quando a prosa da `<action>` do plano conflita com um teste de aceite pré-existente e imutável, o teste é a fonte de verdade do contrato).

**1. [Contrato de resposta] `CertifierQueueResponse` usa `items`, não `projects`, como chave principal**
- **Found during:** Task 1, ao rodar `uv run pytest tests/test_certifier_workbench.py -x -k "correction_queue"` contra a implementação inicial (copiada literalmente da `<action>` do plano, que estende `QueueResponse` e usa `projects`)
- **Issue:** `test_correction_queue_split_and_producer_response` (criado no plano 04-01, Wave 0, nunca modificado desde então) faz `main_queue_payload["items"]` e `corrections_queue_payload["counts"]["corrections"]`. A implementação literal da `<action>` do plano (herdar de `QueueResponse`, que usa `projects`) causaria `KeyError: 'items'`.
- **Fix:** `CertifierQueueResponse` definida como classe própria (não herda de `QueueResponse`) com `items` como campo primário e `projects` como alias de compatibilidade apontando para a mesma lista, preservando o consumo existente de `CertifierReview.tsx` sem quebrar o contrato de teste.
- **Files modified:** `backend_app/modules/projects/schemas.py`, `backend_app/modules/certifier/routes.py`
- **Verification:** `uv run pytest tests/test_certifier_workbench.py -x -k "correction_queue"` passa; `uv run pytest tests/contract -q` sem regressão (contrato antigo só verifica `success: true`, não a chave `projects`).
- **Committed in:** `4158f63` (Task 1)

**2. [Contrato de resposta] Histórico de certificação manteve lista JSON no nível raiz, sem o envelope `CertificationHistoryResponse`/`availableEventTypes`**
- **Found during:** Task 2, ao revisar `tests/test_approve_creates_treasury_authorization` e `tests/test_decisions_are_append_only` (ambos citados pelo próprio plano como `<verify>` da Task 2 e já verdes antes desta execução)
- **Issue:** Ambos os testes consomem `GET /certifier/projects/{id}/history` via `for item in history_response.json()` / `[item["action"] for item in history_response.json()]`, exigindo que a raiz da resposta seja um array JSON. A `<action>` do plano propõe envelopar a resposta em `CertificationHistoryResponse {success, total, events, availableEventTypes, availableActorRoles}`, o que mudaria a raiz para um objeto e quebraria os dois testes imediatamente (`TypeError` ao iterar chaves de string em vez de eventos).
- **Fix:** Endpoint manteve o retorno como `list[dict[str, object]]`; filtros `?event_type=` e `?actor_role=` foram adicionados sem alterar o formato. `availableEventTypes`/`availableActorRoles` não foram implementados como campo de servidor — o frontend pode derivá-los a partir de uma chamada sem filtro à mesma rota (a lista completa já contém `action`/`actorRole`/`label` por item). Classe `CertificationHistoryResponse` não foi criada, pois seria código morto sem um consumidor real dado essa decisão.
- **Files modified:** `backend_app/modules/certifier/routes.py`
- **Verification:** `uv run pytest tests/test_certifier_workbench.py::test_approve_creates_treasury_authorization tests/test_certifier_workbench.py::test_decisions_are_append_only -x` passa; `uv run pytest tests/test_certifier_workbench.py -x -q` — 9/9 verdes.
- **Committed in:** `9134c77` (Task 2)

---

**Total deviations:** 2 (contrato de resposta, não bugs) — ambos escolhem o teste de aceite imutável (`tests/test_certifier_workbench.py`, criado no plano 04-01) como fonte de verdade sobre a prosa da `<action>` do plano, seguindo o mesmo padrão de decisão já registrado nos planos 04-03 e 04-04.
**Impact on plan:** Nenhum comportamento exigido pelos `must_haves`/`success_criteria` do plano foi sacrificado — fila com dois escopos e contadores, histórico filtrável por tipo de evento e ator, e ciclo de resposta do produtor com retorno automático à fila principal, todos entregues e verificados. Duas acceptance_criteria baseadas em grep literal do plano (`class CertifierQueueResponse` sem herdar `QueueResponse`... na verdade a classe foi criada, então esse grep passa; `class CertificationHistoryResponse` e `availableEventTypes` em `routes.py`) não foram satisfeitas literalmente porque a implementação que as satisfaria quebraria testes já verdes — ver itens acima.

## Issues Encountered

- `tests/contract/test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service` continua falhando — falha pré-existente e não relacionada (`Dockerfile.frontend` modificado localmente antes desta execução, documentada em `deferred-items.md` desde o plano 04-03). Não tocado nesta plan.
- `git add -p` foi usado para separar as três tasks em commits atômicos dentro dos mesmos arquivos (`certifier/routes.py` foi editado nas Tasks 1 e 2; `projects/schemas.py` foi editado nas Tasks 1 e 3) — nenhum problema, apenas nota operacional.

## User Setup Required

None — nenhuma configuração de serviço externo é necessária.

## Next Phase Readiness

- Backend do ciclo de correção (fila com escopo/contadores, histórico filtrável, resposta do produtor) está completo e verificado; pronto para os planos de UI (04-06/04-07) consumirem `?scope=`, `?event_type=`/`?actor_role=` e o novo endpoint de resposta.
- `CertifierReview.tsx` ainda não lê `counts`/`scope`/`items` (continua usando `response.projects`, preservado como alias) — migração de UI fica para 04-06/04-07, conforme já sinalizado pelo 04-03-SUMMARY para o contrato de decisão multipart.
- `Dockerfile.frontend` segue com modificação local não commitada e não relacionada à certificação, aguardando decisão do usuário (ver `deferred-items.md`).
- Nenhum bloqueio conhecido para os planos seguintes da Phase 04.

---
*Phase: 04-certification-workbench*
*Completed: 2026-08-15*

## Self-Check: PASSED

All modified files confirmed present on disk (`backend_app/modules/certifier/routes.py`, `backend_app/modules/projects/routes.py`, `backend_app/modules/projects/schemas.py`); all 3 task commit hashes (`4158f63`, `9134c77`, `f9a47eb`) confirmed in `git log`.
