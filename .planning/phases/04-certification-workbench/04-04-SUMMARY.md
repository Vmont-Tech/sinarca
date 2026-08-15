---
phase: 04-certification-workbench
plan: 04
subsystem: api
tags: [fastapi, sqlalchemy, atomic-transaction, audit-events, treasury]

# Dependency graph
requires:
  - phase: 04-certification-workbench/04-01
    provides: "TreasuryAuthorization (modelo + tabela treasury_authorizations)"
  - phase: 04-certification-workbench/04-03
    provides: "CertifierService.record_decision — decisão append-only com commit único no ramo APPROVE"
provides:
  - "Aprovação da certificadora cria TreasuryAuthorization PENDING dentro do mesmo commit da decisão (D-18/D-19)"
  - "Eventos de auditoria MINT_AUTHORIZED e TREASURY_QUEUE_CREATED gravados com entity_type=projects (D-21)"
  - "GET /api/v1/treasury/authorizations — fila somente leitura da tesouraria, sem execução de mint (D-15/D-16)"
affects: [04-05, 04-06, 04-07, 08-treasury-blockchain-and-interoperability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eventos que precisam aparecer na timeline de auditoria do projeto usam sempre entity_type=\"projects\"/entity_id=project.id, mesmo quando o assunto do evento é outra entidade (ex.: TREASURY_QUEUE_CREATED referencia treasury_authorizations só via metadata.authorization_id) — porque a leitura de histórico (certifier/history, dossiê público) filtra estritamente por entity_type==\"projects\"."
    - "Pacotes de fila somente-leitura carregam a trilha de auditoria relacionada em uma única query com .in_(entity_ids) e agrupamento em memória, evitando N+1 por item da fila."

key-files:
  created: []
  modified:
    - backend_app/modules/certifier/service.py
    - backend_app/modules/treasury/routes.py

key-decisions:
  - "GET /treasury/authorizations retorna uma lista JSON no nível raiz (não o envelope {success,total,authorizations} descrito no texto da action do plano), porque os testes de aceite já existentes (test_approve_creates_treasury_authorization e test_approve_rolls_back_when_treasury_package_fails, ambos citados como <read_first> e <verify> do próprio plano) fazem `for item in treasury_response.json()` esperando um array — o teste é a fonte de verdade sobre o contrato, não a prosa da action."
  - "TREASURY_QUEUE_CREATED usa entity_type=\"projects\"/entity_id=project.id (não entity_type=\"treasury_authorizations\"), seguindo a NOTA explícita do plano, para aparecer em GET /certifier/projects/{id}/history e no dossiê público, que filtram por entity_type==\"projects\"."

requirements-completed: [CERT-04]

# Metrics
duration: 20min
completed: 2026-08-15
---

# Phase 04 Plan 04: Preparação Atômica do Pacote de Tesouraria Summary

**Aprovação da certificadora agora cria, dentro do mesmo `commit()`, uma `TreasuryAuthorization` PENDING com os eventos `MINT_AUTHORIZED`/`TREASURY_QUEUE_CREATED`, e a tesouraria ganha `GET /treasury/authorizations` somente leitura para ler essa fila sem executar mint.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-15T13:30:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- `CertifierService.record_decision`, no ramo `APPROVE`, agora insere `TreasuryAuthorization(status="PENDING", ...)` logo após persistir o certificado e antes do commit único, com o pacote mínimo exigido pela D-18 (projeto, certificadora, potencial aprovado, metodologia, sha256 do certificado, `authorized_at` e metadata operacional). Nenhum `try/except` novo foi adicionado em volta dessa escrita — qualquer exceção sobe e reverte a transação inteira junto com a `Certification`/`Document` (D-19), confirmado pelo teste que simula falha de upload (502) e verifica que nenhuma linha órfã fica em `certifications`, `documents` ou `treasury_authorizations`.
- Dois eventos de auditoria que faltavam foram adicionados ao caminho de aprovação: `MINT_AUTHORIZED` e `TREASURY_QUEUE_CREATED`, ambos gravados com `entity_type="projects"` (não `"treasury_authorizations"`) para aparecerem na timeline consultada por `GET /certifier/projects/{id}/history` e pelo dossiê público — o vínculo com a linha de tesouraria fica em `metadata.authorization_id`.
- `GET /api/v1/treasury/authorizations` (novo) lê `TreasuryAuthorization` + `Project` + `Organization` com filtro opcional `?status=`, carrega a trilha de auditoria relacionada em uma única query (`entity_id IN (...)`) para evitar N+1, e serializa o pacote mínimo da D-18 (`projectId`, `projectName`, `certifierOrganization`, `methodology`, `approvedCreditPotential`, `certificate.sha256`, `status`, `authorizedAt`, `auditTrail`). Guard `require_role("admin", "certifier")`; nenhum `session.add`/`session.commit` e nenhum import de `adapters`/`blockchain` no arquivo — o endpoint é estritamente somente leitura.

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar o pacote de autorização de tesouraria dentro da transação de aprovação** - `16c994b` (feat)
2. **Task 2: Endpoint somente leitura GET /treasury/authorizations** - `0f2fbcd` (feat)

**Plan metadata:** (a ser adicionado no commit final desta execução)

## Files Created/Modified

- `backend_app/modules/certifier/service.py` — import de `TreasuryAuthorization`; INSERT do pacote de tesouraria dentro do ramo `APPROVE` de `record_decision`; eventos `MINT_AUTHORIZED`/`TREASURY_QUEUE_CREATED`; retorno de `record_decision` ganha `treasury_authorization_id`/`treasury_status`.
- `backend_app/modules/treasury/routes.py` — novo `GET /treasury/authorizations` (lista JSON, sem envelope), com filtro por status e trilha de auditoria agregada sem N+1.

## Decisions Made

- O endpoint `GET /treasury/authorizations` retorna a lista diretamente no corpo da resposta, e não `{"success": true, "total": n, "authorizations": [...]}` como o texto da `<action>` do plano descrevia. Os testes de aceite pré-existentes que o próprio plano cita como fonte de verificação (`test_approve_creates_treasury_authorization`, `test_approve_rolls_back_when_treasury_package_fails`) já faziam `for item in treasury_response.json()` esperando um array no nível raiz; seguir a prosa da action ao pé da letra teria quebrado ambos os testes. Nenhum critério de aceite do plano (`grep`s, checagem de rota) depende do envelope, então a mudança não afeta nenhuma verificação declarada.
- `TREASURY_QUEUE_CREATED` foi gravado com `entity_type="projects"`/`entity_id=project.id` (não `"treasury_authorizations"`), exatamente como a `NOTA` do próprio plano instruía, para o evento aparecer em `GET /certifier/projects/{id}/history` e no dossiê público.

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio de comportamento em relação ao objetivo do plano — apenas um ajuste de contrato de resposta (documentado acima em "Decisions Made") para alinhar com os testes de aceite pré-existentes que o próprio plano cita como `<verify>`. Não há Rule 1/2/3 aplicada nesta execução: nenhum bug foi corrigido, nenhuma funcionalidade crítica ausente foi descoberta e nenhum bloqueio surgiu.

None - plan executado conforme escopo, com o ajuste de contrato de resposta documentado acima.

## Issues Encountered

- Critério de aceite literal `grep -c "try:" backend_app/modules/certifier/service.py == 0` não passa (`try:` aparece 1 vez), mas essa ocorrência é pré-existente do plano 04-03 (`_optional_actor_profile_id`, que captura `HTTPException` para tratar perfil ausente — nada relacionado à escrita de `TreasuryAuthorization`). Esta execução não adicionou nenhum `try/except` novo em volta do INSERT do pacote de tesouraria ou dos eventos de auditoria, que é a garantia real exigida pela D-19; o teste automatizado `test_approve_rolls_back_when_treasury_package_fails` confirma o rollback atômico. Não alterado, por estar fora do escopo de arquivos/comportamento desta task.
- `tests/contract/test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service` continua falhando (pré-existente, `Dockerfile.frontend` modificado localmente antes desta execução — já documentado em `deferred-items.md` pelo plano 04-03). Não tocado.
- `tests/test_certifier_workbench.py::test_correction_queue_split_and_producer_response` continua RED, como o próprio 04-03-SUMMARY já previa — depende de `?scope=main|corrections` em `GET /certifier/queue` e da resposta do produtor à pendência, escopo do plano 04-05, não desta plan.

## User Setup Required

None — nenhuma configuração de serviço externo é necessária.

## Next Phase Readiness

- `GET /treasury/authorizations` e os eventos `MINT_AUTHORIZED`/`TREASURY_QUEUE_CREATED` estão prontos para a Phase 08 (treasury-blockchain-and-interoperability) consumir na execução real do mint — nenhum adapter foi chamado nesta plan, conforme D-15/D-16.
- Nenhum bloqueio conhecido para o plano 04-05 (fila por escopo, histórico filtrado por tipo/ator, resposta do produtor à pendência).

---
*Phase: 04-certification-workbench*
*Completed: 2026-08-15*

## Self-Check: PASSED
