---
phase: 04-certification-workbench
plan: 03
subsystem: api
tags: [fastapi, sqlalchemy, multipart-upload, security, append-only, asvs]

# Dependency graph
requires:
  - phase: 04-certification-workbench/04-01
    provides: "Certifications append-only, CertificationPendency e TreasuryAuthorization (modelos + tabelas)"
  - phase: 04-certification-workbench/04-02
    provides: "ProjectsService.certification_dossier_status/suggested_credit_potential/assert_certification_dossier_complete/certification_history/certification_certificate; dossiê público minimizado"
provides:
  - "CertifierService.record_decision — decisão append-only com gate de dossiê mínimo, categorias fechadas, certificado PDF real e commit único"
  - "PATCH /certifier/projects/{id}/decision multipart/form-data (contrato JSON legado removido)"
  - "GET /certifier/projects/{id}/history — timeline de eventos de certificação (D-21)"
  - "GET /projects/{id}/pendencies — pendências visíveis ao produtor"
  - "GET /audit/queue inclui CERTIFIED_AWAITING_TREASURY"
affects: [04-04, 04-05, 04-06, 04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "project.timeline é serializado tanto no dossiê público quanto na revisão interna (mesmo project_to_mrca); nunca gravar texto interno/confidencial (notes de certificador) nele — usar sempre copy fixa e pública, deixando o detalhe sensível apenas em certifications.notes/certification_pendencies.description (lidos só por endpoints com guard de papel)."
    - "Upload multipart validado ANTES de qualquer INSERT: extensão, tamanho e magic bytes do certificado são checados antes de criar a linha em certifications, para nunca deixar decisão parcial no banco."

key-files:
  created:
    - backend_app/modules/certifier/service.py
  modified:
    - backend_app/modules/certifier/routes.py
    - backend_app/modules/audit/routes.py
    - backend_app/modules/projects/routes.py
    - backend_app/modules/projects/service.py
    - tests/contract/test_backend_app_api_v1.py

key-decisions:
  - "project.timeline nunca recebe as notes internas do certificador (nem em APPROVE, nem em REJECT/REQUEST_CHANGES); usa sempre uma descrição pública fixa, porque timeline é compartilhado 1:1 entre o dossiê público e a revisão interna."
  - "GET /certifier/projects/{id}/history e GET /projects/{id}/pendencies foram criados como funcionalidade crítica ausente (Rule 2): sem eles a pendência criada pelo gate de dossiê incompleto (must_have do próprio plano) nunca seria visível para ninguém, e o histórico append-only não teria como ser auditado via API."
  - "GET /projects/{id}/pendencies reaproveita o guard `_assert_project_edit_permission` (produtor dono do projeto, certificador do projeto ou admin) em vez de abrir a leitura para qualquer papel autenticado."

requirements-completed: [CERT-02, CERT-03]

# Metrics
duration: 30min
completed: 2026-08-15
---

# Phase 04 Plan 03: Reescrita da Decisão da Certificadora (Multipart, Append-Only, Gate de Dossiê) Summary

**`PATCH /certifier/projects/{id}/decision` reescrito como endpoint multipart append-only, com gate server-side de dossiê mínimo, categorias estruturadas fechadas e certificado PDF real obrigatório na aprovação; `CertifierService` novo concentra toda a regra em `record_decision` com commit único.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-15T13:01:00Z
- **Tasks:** 3/3
- **Files modified:** 6 (1 criado: `certifier/service.py`; 5 modificados)

## Accomplishments

- `backend_app/modules/certifier/service.py` (novo) concentra toda a regra de decisão em `CertifierService.record_decision`: validação de campos estruturados (categoria fechada + descrição obrigatórias para REJECT/REQUEST_CHANGES), certificado PDF real obrigatório para APPROVE (extensão `.pdf`, `MAX_UPLOAD_BYTES`, `validate_magic_bytes`), gate de dossiê mínimo server-side (D-03/D-04, vale para APPROVE/REJECT, não para REQUEST_CHANGES) que cria uma `CertificationPendency` OPEN e faz commit isolado antes de bloquear a decisão, ajuste de potencial de crédito exigindo justificativa quando diverge do sugerido, `Certification` sempre inserida via `session.add` (nunca reaproveitada — append-only, D-09) e um único `session.commit()` no caminho feliz.
- `PATCH /certifier/projects/{project_id}/decision` deixou de aceitar `application/json` e passou a exigir `multipart/form-data` (`decision`, `methodology`, `credit_potential`, `credit_potential_adjustment_reason`, `notes`, `rejection_category`, `certificate`), delegando 100% da lógica para `CertifierService`. `CertifierDecisionRequest`, `_get_or_create_certification` e `_ensure_locked_credit` (agora método do service) foram removidos de `routes.py`.
- `GET /audit/queue` passa a incluir `CERTIFIED_AWAITING_TREASURY`, já que a aprovação da certificadora agora estaciona o projeto nesse status (D-17) em vez de `AWAITING_AUDIT` — sem essa mudança, o encadeamento certificação → auditoria → marketplace (usado pela suíte de contrato inteira) ficaria quebrado. `PRODUCER_PORTFOLIO_PROJECT_STATUSES` ganhou o mesmo status para o projeto não sumir do portfólio do produtor.
- Suíte de contrato (`tests/contract/test_backend_app_api_v1.py`) migrada: `certifier_approve()`/`upload_certification_minimum_documents()` substituem os 3 pontos de chamada JSON legados por multipart com certificado PDF real e dossiê mínimo pré-carregado.

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar CertifierService com a regra completa de decisão** - `6cfba75` (feat)
2. **Task 2: Trocar o endpoint de decisão para multipart e liberar a fila de auditoria** - `5b3e42b` (feat)
3. **Task 3: Migrar a suíte de contrato existente para o novo contrato de decisão** - `0187e38` (test)

**Plan metadata:** (a ser adicionado no commit final desta execução)

## Files Created/Modified

- `backend_app/modules/certifier/service.py` — `CertifierService` novo: `_validated_certificate`, `_persist_certificate`, `_create_pendency`, `_append_timeline`, `record_decision`, `_ensure_locked_credit` (migrada de `routes.py`).
- `backend_app/modules/certifier/routes.py` — `decide_project` reescrito como rota multipart (`Form`/`File`) que delega para `CertifierService`; novo `GET /certifier/projects/{id}/history`; código morto de upsert removido.
- `backend_app/modules/audit/routes.py` — `GET /audit/queue` inclui `CERTIFIED_AWAITING_TREASURY`.
- `backend_app/modules/projects/routes.py` — novo `GET /projects/{id}/pendencies` (produtor/certificador/admin, guard de propriedade via `_assert_project_edit_permission`), reaproveitando `pendency_item` de `certifier/routes.py`.
- `backend_app/modules/projects/service.py` — `PRODUCER_PORTFOLIO_PROJECT_STATUSES` ganha `CERTIFIED_AWAITING_TREASURY`.
- `tests/contract/test_backend_app_api_v1.py` — helpers `certifier_approve`/`upload_certification_minimum_documents`; 3 pontos de chamada migrados de JSON para multipart; asserção de status pós-aprovação atualizada para `CERTIFIED_AWAITING_TREASURY`.

## Decisions Made

- `project.timeline` nunca recebe as `notes` internas do certificador, em nenhuma das três decisões — usa sempre uma descrição pública fixa (ex.: "Certificação aprovada pela certificadora.", "Reprovação registrada pela certificadora. Uma pendência foi aberta para o produtor."). Motivo: `project.timeline` é serializado pelo mesmo `project_to_mrca()` tanto no dossiê público quanto na revisão interna da certificadora — não existe uma versão "pública" separada da timeline. Colocar `notes` ali reabriria exatamente o vazamento que o plano 04-02 fechou para `certifications.notes`/`documents`.
- `GET /certifier/projects/{id}/history` e `GET /projects/{id}/pendencies` foram adicionados como funcionalidade crítica ausente (ver Deviations) — nenhuma tarefa do plano os declarava explicitamente, mas os testes de aceite do próprio plano exigem ambos.
- `GET /projects/{id}/pendencies` usa o mesmo guard de permissão de edição de projeto (`_assert_project_edit_permission`: dono produtor, certificadora do projeto ou admin) em vez de abrir a leitura para qualquer papel autenticado, para não vazar descrições de pendência entre organizações.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `GET /certifier/projects/{id}/history` não existia**
- **Found during:** Task 1/2 (verificação `tests/test_certifier_workbench.py::test_decisions_are_append_only`)
- **Issue:** O teste de aceite explícito do plano (`test_decisions_are_append_only`, listado tanto na verificação da Task 1 quanto da Task 2) faz `GET /api/v1/certifier/projects/{id}/history` e espera a lista de eventos de auditoria. Esse endpoint nunca foi criado — `certification_history()` já existia em `ProjectsService` desde o plano 04-02, mas nunca foi exposto via rota própria (apenas embutido dentro de `certifier/projects/{id}/review` e do dossiê público).
- **Fix:** Adicionado `GET /certifier/projects/{project_id}/history` em `certifier/routes.py`, retornando `service.certification_history(project)` (todas as ações, com metadata — endpoint interno guardado por `require_role("certifier", "admin")`).
- **Files modified:** `backend_app/modules/certifier/routes.py`
- **Verification:** `uv run pytest tests/test_certifier_workbench.py::test_decisions_are_append_only -x` passa.
- **Committed in:** `5b3e42b` (Task 2)

**2. [Rule 2 - Missing critical functionality] `GET /projects/{id}/pendencies` não existia**
- **Found during:** Task 1/2 (verificação `tests/test_certifier_workbench.py::test_incomplete_dossier_blocks_decision_and_creates_pendency`)
- **Issue:** O gate de dossiê mínimo (must_have explícito do plano: "o sistema cria uma pendência para o produtor") cria uma `CertificationPendency`, mas nenhuma rota expunha essas pendências ao produtor. O teste de aceite exigido pelo plano (`test_incomplete_dossier_blocks_decision_and_creates_pendency`) confirma isso via `GET /api/v1/projects/{id}/pendencies` com autenticação de produtor — sem o endpoint, a pendência criada seria invisível para quem precisa resolvê-la.
- **Fix:** Adicionado `GET /projects/{project_id}/pendencies` em `projects/routes.py`, reaproveitando `pendency_item()` de `certifier/routes.py` e o guard `_assert_project_edit_permission` (produtor dono, certificador do projeto ou admin).
- **Files modified:** `backend_app/modules/projects/routes.py`
- **Verification:** `uv run pytest tests/test_certifier_workbench.py::test_incomplete_dossier_blocks_decision_and_creates_pendency -x` passa.
- **Committed in:** `5b3e42b` (Task 2)

**3. [Rule 1 - Bug] `project.timeline` vazava `notes` internas do certificador para o dossiê público**
- **Found during:** Task 1/2 (`uv run pytest tests/test_certifier_workbench.py -q`, `test_public_dossier_hides_internal_notes`)
- **Issue:** Seguindo a especificação literal do plano (`desc=notes` na timeline para as três decisões), a nota interna do certificador aparecia em `project.timeline`, que é serializado pelo mesmo `project_to_mrca()` tanto no dossiê público (`GET /projects/{id}/public-dossier`) quanto na revisão interna — reabrindo o vazamento que o plano 04-02 fechou para `certifications.notes`/documentos internos. O próprio 04-02-SUMMARY já sinalizava que esse teste ficaria verde "assim que 04-03 entregar o upload multipart", confirmando que o teste está em escopo desta plan.
- **Fix:** `_append_timeline` passou a usar sempre uma descrição pública fixa por decisão (nunca `notes`); o texto real do certificador continua acessível apenas via `certifications.notes` (revisão interna) e `certification_pendencies.description` (endpoints com guard de papel).
- **Files modified:** `backend_app/modules/certifier/service.py`
- **Verification:** `uv run pytest tests/test_certifier_workbench.py::test_public_dossier_hides_internal_notes -x` passa; `"NOTA INTERNA CONFIDENCIAL" not in public_response.text` confirmado.
- **Committed in:** `6cfba75` (Task 1)

---

**Total deviations:** 3 auto-fixed (2 Rule 2 — endpoints ausentes necessários para os próprios critérios de aceite do plano; 1 Rule 1 — vazamento de dado interno reintroduzido pela especificação literal do plano, corrigido antes do commit).
**Impact on plan:** Escopo estritamente necessário para satisfazer os critérios de aceite explícitos das Tasks 1 e 2 (mesmos 4 testes citados no `<verify>` do plano). Nenhuma das adições implementa fila de correção, tesouraria ou resposta do produtor a pendências — esses seguem explicitamente reservados para os planos 04-04/04-05, conforme o próprio 04-02-SUMMARY já documentava.

## Issues Encountered

- 3 testes de `tests/test_certifier_workbench.py` permanecem RED, fora do escopo desta plan por desenho: `test_approve_creates_treasury_authorization` e `test_approve_rolls_back_when_treasury_package_fails` dependem de `GET /treasury/authorizations` (plano 04-05); `test_correction_queue_split_and_producer_response` depende do filtro `?scope=main|corrections` em `GET /certifier/queue` e do endpoint de resposta do produtor à pendência (plano 04-04). Isso é uma melhora em relação ao baseline do plano 04-01/04-02 (2 de 9 passavam antes; agora 6 de 9 passam), não uma regressão.
- `Dockerfile.frontend` já estava modificado localmente (sem commit) antes desta execução, por mudança não relacionada a certificação. Isso faz `tests/contract/test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service` falhar. Não foi tocado nem revertido — está fora do escopo de arquivos deste plano; documentado em `.planning/phases/04-certification-workbench/deferred-items.md` para decisão do usuário.

## User Setup Required

None — nenhuma configuração de serviço externo é necessária.

## Next Phase Readiness

- `CertifierService.record_decision` está pronto para os planos 04-04 (fila de correção/resposta do produtor) e 04-05 (fila da tesouraria/mint) consumirem os eventos `CERTIFICATION_APPROVED`/`CERTIFICATION_CERTIFICATE_ATTACHED`/`CERTIFICATION_REJECTED`/`CERTIFICATION_CHANGES_REQUESTED` já gravados nesta plan.
- `GET /certifier/projects/{id}/history` e `GET /projects/{id}/pendencies` já existem para os planos futuros reaproveitarem em vez de recriar.
- `src/pages/Dashboard/CertifierReview.tsx` ainda chama a rota antiga com JSON (`apiPatch(..., { decision, notes, certifier_id: 'std-001' })`) — o frontend ficará quebrado contra o novo contrato multipart até um plano de UI (04-06/04-07) atualizá-lo; isso não bloqueia planos de backend subsequentes.
- Nenhum bloqueio conhecido para o plano 04-04.

---
*Phase: 04-certification-workbench*
*Completed: 2026-08-15*

## Self-Check: PASSED

All created/modified files confirmed present on disk; all 3 task commit hashes (`6cfba75`, `5b3e42b`, `0187e38`) confirmed in `git log`.
