---
phase: 04-certification-workbench
plan: 02
subsystem: api
tags: [fastapi, sqlalchemy, pydantic, postgres, security, asvs]

# Dependency graph
requires:
  - phase: 04-certification-workbench/04-01
    provides: "Migration append-only de certifications, CertificationPendency e TreasuryAuthorization (modelos + tabelas), contrato de 9 testes de integração RED"
provides:
  - "ProjectsService.certification_dossier_status/suggested_credit_potential/assert_certification_dossier_complete/certification_history/certification_certificate"
  - "GET /api/v1/certifier/projects/{project_id}/review — dossiê técnico completo para a certificadora"
  - "Dossiê público minimizado: public_certification_item/public_document_item sem notas internas e sem documentos não públicos; campos certificate/certificationHistory"
  - "CertifierReviewResponse em schemas.py"
  - "pendency_item/treasury_authorization_item reutilizáveis por 04-04/04-05"
affects: [04-03, 04-04, 04-05, 04-06, 04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Serializadores públicos (public_*) sempre separados dos serializadores internos (certification_item/document_item) — nunca reaproveitar o mesmo helper para as duas superfícies."
    - "Evento de auditoria idempotente por ator: checar AuditEvent existente via metadata_[chave].astext antes de criar um novo (usado em CERTIFICATION_REVIEW_OPENED)."

key-files:
  created: []
  modified:
    - backend_app/modules/projects/service.py
    - backend_app/modules/projects/schemas.py
    - backend_app/modules/certifier/routes.py
    - tests/contract/test_api_v1_contract.py
    - tests/contract/test_backend_app_api_v1.py
    - tests/test_certifier_workbench.py

key-decisions:
  - "Dossiê incompleto usa HTTP 400 (não 409/422) para que src/services/api.ts propague o detail exato do 04-UI-SPEC.md."
  - "public_document_item mantém storagePath (referência lógica) mas nunca storageBucket/storageObjectPath/metadata; documentos públicos ficam restritos a PUBLIC_DOCUMENT_TYPES = {CERTIFICATION_CERTIFICATE}."
  - "3 testes de contrato pré-existentes que fixavam o vazamento de documentos internos no dossiê público (LEGAL_OWNERSHIP/FOREST_INVENTORY visíveis) foram atualizados para o novo contrato seguro — o comportamento antigo era o próprio defeito que CERT-05/D-20/D-22 exige corrigir."

patterns-established:
  - "certification_history(actions=..., include_metadata=...) é o ponto único de leitura de AuditEvent para timeline de certificação, usado tanto pelo dossiê público (include_metadata=False, ações públicas) quanto pelo endpoint de revisão interno."

requirements-completed: [CERT-01, CERT-05]

# Metrics
duration: 20min
completed: 2026-08-15
---

# Phase 04 Plan 02: Dossiê Técnico da Certificadora e Minimização do Dossiê Público Summary

**Endpoint `GET /certifier/projects/{id}/review` entrega baseline, QTAGs, documentos, dossiê mínimo e potencial sugerido para a certificadora; dossiê público deixa de vazar notas internas de certificação e documentos sensíveis (matrícula, CAR, inventário).**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-15T09:40:00-03:00 (aprox.)
- **Completed:** 2026-08-15T09:49:07-03:00
- **Tasks:** 3/3
- **Files modified:** 6 (3 do plano + 3 testes de contrato ajustados como deviation)

## Accomplishments
- `ProjectsService` ganha `certification_dossier_status` (baseline + 4 QTAGs ativas + documentos LEGAL_OWNERSHIP/CAR + FOREST_INVENTORY), `suggested_credit_potential` (mesma fórmula de `_credit_potential_from_baseline`, com fallback para `carbon_stock`), `assert_certification_dossier_complete` (400 com a cópia exata do `04-UI-SPEC.md`), `certification_history` e `certification_certificate`.
- Dossiê público (`GET /projects/{id}/public-dossier`, rota sem autenticação) passa a usar `public_certification_item`/`public_document_item`: nenhuma `notes` interna, documentos restritos a `CERTIFICATION_CERTIFICATE`; ganha `certificate` e `certificationHistory` (sem `metadata`/`beforeData`/`afterData`). Fecha o vazamento pré-existente descrito no threat model (T-04-04, ASVS V8).
- Novo endpoint `GET /api/v1/certifier/projects/{project_id}/review` (guard `require_role("certifier", "admin")`) devolve o dossiê técnico completo: `project`, `baseline`, `tags`, `documents` (visão interna completa), `dossier`, `calculation`, `certifications` (com `notes`), `pendencies`, `treasuryAuthorization`, `certificate`. Grava `CERTIFICATION_REVIEW_OPENED` uma única vez por ator (idempotência via `metadata_["actor_external_id"].astext`).
- `pendency_item`/`treasury_authorization_item` ficam expostos em `certifier/routes.py` para reuso direto pelos planos 04-04 (fila de pendências) e 04-05 (autorização de tesouraria).

## Task Commits

Each task was committed atomically:

1. **Task 1: Helpers de dossiê mínimo, cálculo sugerido e histórico canônico em ProjectsService** - `42c8426` (feat)
2. **Task 2: Separar serializadores público e interno e minimizar o dossiê público** - `5af7f83` (fix)
3. **Task 3: Endpoint GET /certifier/projects/{project_id}/review** - `e5519a5` (feat)

**Plan metadata:** (a ser adicionado no commit final desta execução)

## Files Created/Modified
- `backend_app/modules/projects/service.py` - Constantes de dossiê/histórico, `certification_dossier_status`, `suggested_credit_potential`, `assert_certification_dossier_complete`, `certification_history`, `certification_certificate`, `public_certification_item`, `public_document_item`; `get_public_dossier` reescrito para usar os serializadores públicos e incluir `certificate`/`certificationHistory`.
- `backend_app/modules/projects/schemas.py` - `ProjectPublicDossierResponse` ganha `certificate`/`certificationHistory`; nova `CertifierReviewResponse`.
- `backend_app/modules/certifier/routes.py` - Novo endpoint `GET /certifier/projects/{project_id}/review`, helpers `pendency_item`/`treasury_authorization_item`, evento de auditoria idempotente `CERTIFICATION_REVIEW_OPENED`.
- `tests/contract/test_api_v1_contract.py` - `test_public_dossier_contract_exposes_project_transparency_data` atualizado para o dossiê público minimizado.
- `tests/contract/test_backend_app_api_v1.py` - Duas asserções que fixavam o vazamento de `LEGAL_OWNERSHIP`/`FOREST_INVENTORY` no dossiê público corrigidas para o contrato seguro.
- `tests/test_certifier_workbench.py` - `upload_minimum_documents` corrigido para gerar sha256 distinto por tipo de documento (ver Deviations).

## Decisions Made
- `assert_certification_dossier_complete` usa HTTP 400 (não 409/422) porque o cliente frontend (`src/services/api.ts`) só propaga o `detail` do servidor em 400; em 401/403/409/422 ele sobrescreve a mensagem.
- `public_document_item` preserva `storagePath` (referência lógica textual) mas nunca `storageBucket`/`storageObjectPath`/`metadata` bruta — mesmo padrão de minimização já usado por `document_item` no dossiê público antigo, agora explícito na função pública.
- `certification_history` foi desenhado como ponto único de leitura de `AuditEvent` para qualquer timeline de certificação (público ou interno), parametrizado por `actions`/`actor_role`/`include_metadata`, para evitar duplicar a query em planos futuros (04-04 a 04-07 vão consumi-lo).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 3 testes de contrato fixavam o vazamento de documentos internos que este plano corrige**
- **Found during:** Task 2 (`uv run pytest tests/contract -q`)
- **Issue:** `test_public_dossier_contract_exposes_project_transparency_data`, `test_project_document_upload_persists_project_link_and_audit_event` e `test_project_drafts_save_upload_submit_and_link_documents` afirmavam que `LEGAL_OWNERSHIP`/`FOREST_INVENTORY` apareciam no dossiê público (com hash mascarado) — exatamente o comportamento inseguro que o threat model deste plano (T-04-04, ASVS V8) exige mitigar via `PUBLIC_DOCUMENT_TYPES`.
- **Fix:** Assertions reescritas para o novo contrato: dossiê público só expõe `CERTIFICATION_CERTIFICATE`; certificações públicas nunca têm `notes`; `documents`/`certificate`/`certificationHistory` passam a ser verificados como parte do contrato de transparência.
- **Files modified:** `tests/contract/test_api_v1_contract.py`, `tests/contract/test_backend_app_api_v1.py`
- **Verification:** `uv run pytest tests/contract -q` → 68 passed.
- **Committed in:** `5af7f83` (Task 2)

**2. [Rule 3 - Blocking] Helper de teste `upload_minimum_documents` (criado no plano 04-01) nunca produzia um dossiê completo**
- **Found during:** Task 3 (`uv run pytest tests/test_certifier_workbench.py::test_review_dossier_endpoint -x`)
- **Issue:** `upload_minimum_documents` enviava o mesmo `PDF_BYTES` para `LEGAL_OWNERSHIP` e `FOREST_INVENTORY`. Como `upload_project_document` deduplica por `(project_id, sha256_hash)` e devolve o documento já existente quando o hash bate, o segundo upload nunca criava um documento novo — `FOREST_INVENTORY` nunca era persistido e `certification_dossier_status` nunca ficava `complete=True`. Isso bloqueava `test_review_dossier_endpoint` e teria bloqueado qualquer teste futuro que dependa de `create_certifiable_project()`.
- **Fix:** Conteúdo do PDF de teste variado por `document_type` (`PDF_BYTES + f"% {document_type}\n".encode()`), garantindo sha256 distintos.
- **Files modified:** `tests/test_certifier_workbench.py`
- **Verification:** `uv run pytest tests/test_certifier_workbench.py::test_review_dossier_endpoint -x` → passed.
- **Committed in:** `e5519a5` (Task 3)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 — testes de contrato desatualizados que fixavam a própria vulnerabilidade sendo corrigida; 1 Rule 3 — bug pré-existente no helper de teste do plano 04-01 que bloqueava a verificação obrigatória da Task 3).
**Impact on plan:** Nenhum scope creep — ambas as mudanças eram cirúrgicas e diretamente necessárias para satisfazer os critérios de aceite explícitos deste plano (dossiê público minimizado sem regressão de contrato; endpoint de revisão retornando dossiê completo).

## Issues Encountered
- `test_certifier_workbench.py::test_public_dossier_hides_internal_notes` continua RED após este plano: ele cria uma certificação via `PATCH /certifier/projects/{id}/decision` enviando `multipart/form-data` com um arquivo `certificate`, mas essa rota ainda usa o corpo JSON legado (`CertifierDecisionRequest`) herdado da Phase 1 e só será reescrita no plano 04-03 (confirmado explicitamente no texto da Task 3: "a rota de decisão é reescrita no plano 04-03"). O comportamento que a Task 2 implementa (minimização do dossiê público) foi validado diretamente contra o projeto seedado `PRC-2024-002`, que já tem uma certificação real com `notes`: `GET /api/v1/projects/PRC-2024-002/public-dossier` confirma zero ocorrências de `"notes"` no corpo, `certifications[0]` sem a chave `notes`, e os campos `certificate`/`certificationHistory` presentes. O teste de integração ficará verde assim que 04-03 entregar o upload multipart de certificado na rota de decisão.
- `test_certifier_workbench.py` ainda tem 7 outros testes RED (`test_decision_requires_structured_fields`, `test_approve_requires_real_pdf`, `test_approve_creates_treasury_authorization`, `test_decisions_are_append_only`, `test_incomplete_dossier_blocks_decision_and_creates_pendency`, `test_correction_queue_split_and_producer_response`, `test_approve_rolls_back_when_treasury_package_fails`) — todos dependem da reescrita da rota de decisão e/ou de `backend_app.modules.certifier.service` (ainda não criado), ambos fora do escopo deste plano por design (Wave 2 de 04-01, decisão explícita em 04-01-SUMMARY.md e no texto da Task 3 deste plano).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `certification_dossier_status`, `suggested_credit_potential`, `assert_certification_dossier_complete`, `certification_history` e `certification_certificate` estão prontos para o plano 04-03 (`PATCH /certifier/projects/{id}/decision` reescrito com upload de certificado real e bloqueio por dossiê incompleto).
- `pendency_item`/`treasury_authorization_item` já existem em `certifier/routes.py` para os planos 04-04 (fila de pendências) e 04-05 (fila da tesouraria) reutilizarem sem duplicar serialização.
- Nenhum bloqueio conhecido para o plano 04-03. O único item pendente (rota de decisão ainda legada) já está documentado como escopo explícito de 04-03.

---
*Phase: 04-certification-workbench*
*Completed: 2026-08-15*

## Self-Check: PASSED
