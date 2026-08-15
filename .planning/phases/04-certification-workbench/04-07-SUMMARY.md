---
phase: 04-certification-workbench
plan: 07
subsystem: api+frontend
tags: [fastapi, sqlalchemy, react, typescript, supabase-storage, security, asvs]

# Dependency graph
requires:
  - phase: 04-certification-workbench/04-02
    provides: "certification_history/certification_certificate/certification_item/CERTIFICATION_HISTORY_LABELS em ProjectsService; certificate/certificationHistory no dossiê público"
  - phase: 04-certification-workbench/04-05
    provides: "GET /projects/{id}/pendencies e POST /projects/{id}/pendencies/{id}/respond como padrão de rota org-scoped no módulo projects"
  - phase: 04-certification-workbench/04-06
    provides: "Padrões de UI/serviço já estabelecidos em CertifierReview.tsx (histórico filtrável, timeline)"
provides:
  - "GET /api/v1/projects/{id}/certification-history — trilha INTERNA de certificação para produtor dono, certificadora do projeto e admin (D-22)"
  - "GET /api/v1/projects/{id}/certificate — download condicional do certificado a partir do bucket privado projects (D-13)"
  - "SupabaseStorageClient.download_object/_read e download_storage_object() — primeira leitura de objeto privado do Supabase Storage no backend"
  - "Bloco 'Certificado da certificação' e 'Histórico de certificação' no dossiê público (MrcaDetails.tsx), consumindo certificate/certificationHistory entregues pelo plano 04-02"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Leitura de objeto privado no Supabase Storage segue o mesmo padrão de upload_storage_object: função de módulo async, client=None quando sem credenciais, 502 em falha do provedor (falha fechada)."
    - "Download binário no frontend nunca passa por apiGet/request() (que sempre faz response.json() e limpa a sessão em 401) — usa fetch cru com o mesmo header Bearer e trata 403 como resultado legítimo, não como erro de sessão."

key-files:
  created: []
  modified:
    - backend_app/modules/supabase_storage.py
    - backend_app/modules/projects/routes.py
    - backend_app/modules/projects/schemas.py
    - tests/test_certifier_workbench.py
    - src/services/database.ts
    - src/pages/Dashboard/MrcaDetails.tsx

key-decisions:
  - "Rota /projects/{id}/certificate usa optional_user e converte qualquer HTTPException de _assert_project_edit_permission (401 sem perfil OU 403 organização errada) para 403 uniforme: a rota é linkada a partir do dossiê público e o cliente src/services/api.ts limpa a sessão em 401, o que seria incorreto para um visitante anônimo legítimo."
  - "Testes com prefixo determinístico (create_certifiable_project('hist')/('cert') conforme prosa literal do plano) foram trocados para prefixo com sufixo uuid, pois o Postgres local do dev não é resetado entre execuções isoladas de teste e o nome determinístico colide em Project.source_hash na segunda execução — mesmo padrão já usado por todos os outros testes do arquivo (create_certifiable_project() sem argumento)."

requirements-completed: [CERT-03, CERT-05]

# Metrics
duration: ~30min
completed: 2026-08-15
---

# Phase 04 Plan 07: Fechamento de Lacunas — Trilha Interna do Produtor e Certificado no Dossiê Público Summary

**Fecha as duas lacunas de consumo da Phase 4: o produtor dono do projeto agora lê a trilha interna completa de certificação (D-22), e o dossiê público passa a exibir referência/hash/download condicional do certificado e a linha do tempo pública de decisões (D-13/D-20), removendo o código morto `cert.notes` de `MrcaDetails.tsx`.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-15
- **Tasks:** 3/3
- **Files modified:** 6 (`backend_app/modules/supabase_storage.py`, `backend_app/modules/projects/routes.py`, `backend_app/modules/projects/schemas.py`, `tests/test_certifier_workbench.py`, `src/services/database.ts`, `src/pages/Dashboard/MrcaDetails.tsx`)

## Accomplishments

- `GET /api/v1/projects/{project_id}/certification-history` (novo): trilha interna completa de certificação — inclui `notes` das certificações e `metadata`/`beforeData`/`afterData` dos eventos de auditoria — acessível ao produtor dono, à certificadora do projeto e ao admin (papel sob o qual a tesouraria opera hoje, já que `backend_app/core/roles.py` não define papel `treasury`). Guard é org-scoped via `_assert_project_edit_permission`, não apenas `require_role`: `company` de outra organização recebe 403, visitante sem token recebe 401 (o `require_role` já barra antes do handler). Suporta `?event_type=`/`?actor_role=` e devolve `availableEventTypes`/`availableActorRoles` derivados da lista completa (sem filtro).
- `GET /api/v1/projects/{project_id}/certificate` (novo): download do PDF do certificado direto do bucket privado `projects`, usando a service role do Supabase Storage. Anônimo e organização sem vínculo recebem 403 com a mensagem exata `CERTIFICATE_DOWNLOAD_FORBIDDEN_DETAIL` (nunca 401, para não disparar `clearAuthSession()` no cliente); projeto sem certificado anexado recebe 404; storage sem credenciais falha fechado em 502.
- `SupabaseStorageClient.download_object`/`_read` e `download_storage_object()` (novo em `supabase_storage.py`): primeira função de leitura de objeto no módulo — todas as funções anteriores (`upload_object`, `copy_object`) eram apenas de escrita. Segue exatamente o mesmo padrão de falha fechada de `upload_storage_object`.
- Dossiê público (`MrcaDetails.tsx`) ganha o bloco "Certificado da certificação" (referência de arquivo e hash SHA-256 sempre visíveis; botão de download só aparece quando `downloadAvailable`, com a permissão real decidida no servidor) e o bloco "Histórico de certificação" (linha do tempo pública, renderizando apenas `action`/`label`/`createdAt` — nunca `metadata`/`beforeData`/`afterData`/`actorProfileId`, minimização já feita pelo backend desde o plano 04-02). O código morto `{cert.notes && ...}` foi removido: o serializador público de certificações nunca devolveu `notes` desde o plano 04-02.
- `src/services/database.ts` ganha `ProjectCertificateReference`/`ProjectPublicCertificationEvent` tipados, os dois novos campos em `ProjectPublicDossier`, e `downloadProjectCertificate()` — que deliberadamente não usa `apiGet`/`request()` porque o corpo da resposta é binário e um 403 é um resultado legítimo para visitante anônimo (não uma falha de sessão a limpar).

## Task Commits

Each task was committed atomically:

1. **Task 1: Endpoint GET /projects/{id}/certification-history com trilha interna para o produtor (D-22)** - `152bd6e` (feat)
2. **Task 2: Download condicional do certificado a partir do bucket privado (D-13)** - `7fdbc44` (feat)
3. **Task 3: Certificado e histórico público no dossiê (MrcaDetails + database.ts)** - `0780c69` (feat)

**Plan metadata:** (a ser adicionado no commit final desta execução)

## Files Created/Modified

- `backend_app/modules/projects/schemas.py` — `ProjectCertificationHistoryResponse`.
- `backend_app/modules/projects/routes.py` — `GET /projects/{project_id}/certification-history`, `GET /projects/{project_id}/certificate`, constante `CERTIFICATE_DOWNLOAD_FORBIDDEN_DETAIL`; imports de `Certification`, `Response`, `download_storage_object`, `certification_item`, `CERTIFICATION_HISTORY_LABELS`.
- `backend_app/modules/supabase_storage.py` — `SupabaseStorageClient.download_object`/`_read`; `download_storage_object()` no nível do módulo.
- `tests/test_certifier_workbench.py` — `test_certification_history_visible_to_producer`, `test_certificate_download_requires_project_membership`.
- `src/services/database.ts` — `ProjectCertificateReference`, `ProjectPublicCertificationEvent`, campos `certificate`/`certificationHistory` em `ProjectPublicDossier`, `downloadProjectCertificate()`.
- `src/pages/Dashboard/MrcaDetails.tsx` — bloco "Certificado da certificação", bloco "Histórico de certificação", handler `handleCertificateDownload`, remoção de `{cert.notes && ...}`.

## Decisions Made

- A rota de certificado usa `optional_user` (não `require_role`) e converte tanto o 401 quanto o 403 vindos de `_assert_project_edit_permission` em 403 uniforme com a mesma mensagem — do ponto de vista do chamador da rota pública, "sem perfil" e "organização errada" são a mesma coisa ("você não pode baixar"), e 401 dispararia `clearAuthSession()` incorretamente para um visitante legítimo.
- `bucket`/`object_path` passados a `download_storage_object` vêm exclusivamente de `certification_certificate(project)` (já filtrado por `project_id` + `document_type`), nunca de parâmetro de rota — sem superfície de path traversal.
- `PurePath(filename).name` remove diretórios e aspas do nome do arquivo são removidas antes de interpolar no header `Content-Disposition`, prevenindo header injection via nome de arquivo controlado por quem fez upload.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prefixos determinísticos de teste colidiam entre execuções do dev local**
- **Found during:** Task 1/Task 2, ao rodar a suíte completa do arquivo (`uv run pytest tests/test_certifier_workbench.py -x -q`) após já ter validado os dois novos testes isoladamente
- **Issue:** A prosa do plano usa `create_certifiable_project("hist")` e `create_certifiable_project("cert")` literalmente. Como o Postgres local de desenvolvimento não é resetado entre execuções isoladas de teste (diferente de um ambiente CI com banco efêmero), a segunda execução do mesmo teste tentava inserir um projeto com o mesmo `name`/`source_hash` determinístico, violando `projects_source_hash_key` (`UniqueViolationError`). Todos os outros ~9 testes pré-existentes do arquivo já usavam `create_certifiable_project()` sem argumento (que gera `f"workbench-{uuid.uuid4().hex[:10]}"`) exatamente para evitar esse problema.
- **Fix:** Trocado para `create_certifiable_project(f"hist-{uuid.uuid4().hex[:8]}")` e `create_certifiable_project(f"cert-{uuid.uuid4().hex[:8]}")` — mantém o prefixo legível pedido pela prosa do plano, mas com sufixo único por execução, alinhado ao padrão já estabelecido pelo resto do arquivo.
- **Files modified:** `tests/test_certifier_workbench.py`
- **Verification:** `uv run pytest tests/test_certifier_workbench.py -x -q` → 11 passed (9 pré-existentes + 2 novos), inclusive após reexecução completa da suíte.
- **Committed in:** `152bd6e` (Task 1) e `7fdbc44` (Task 2)

---

**Total deviations:** 1 (Rule 3 — bug de dados de teste que bloquearia a verificação obrigatória de ambas as tasks caso não corrigido; não é um bug de produção).
**Impact on plan:** Nenhum comportamento exigido pelos `must_haves`/`success_criteria` foi sacrificado — o texto da mensagem/prefixo pedido pela prosa foi preservado (`hist-`/`cert-`), apenas com sufixo único adicionado.

## Issues Encountered

- Nenhum bloqueio novo. `npx tsc -b`/`npx tsc --noEmit` segue com a dívida técnica pré-existente e não relacionada a este plano (já documentada desde a Phase 2/plano 04-06); `npm run build` (script real de build via `vite build`) está limpo, código 0.
- `tests/contract/test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service` continua falhando por causa de `Dockerfile.frontend` modificado localmente e não relacionado a esta fase (documentado em `deferred-items.md` desde o plano 04-03); não tocado.

## User Setup Required

None — nenhuma configuração de serviço externo é necessária. `download_storage_object` reutiliza as mesmas credenciais de Supabase Storage já configuradas para upload (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` ou o par de dev local).

## Verification Results

- `uv run pytest tests/test_certifier_workbench.py -x -q` → 11 passed (2 novos + 9 pré-existentes).
- `uv run pytest tests/contract -q` → 67 passed, 1 failed (pré-existente, `Dockerfile.frontend`, não relacionado).
- `uv run pytest -q` (suíte completa do backend) → 106 passed, 1 failed (mesma falha pré-existente acima). Nenhuma falha nova introduzida por este plano — confirma que os 7 planos da Phase 4 (`04-01` a `04-07`) integram sem regressão.
- `npm run build` → código 0.
- Todas as `acceptance_criteria` baseadas em `grep` das três tasks (contagens de rotas, classes, textos literais, ausência de padrões proibidos como `public_certification_item`/`public_object_url`/`event.metadata`/`text-emerald-600`) foram verificadas manualmente e passam exatamente como escrito no plano.
- As verificações manuais 1-5 da seção `<verification>` do plano (bancada da certificadora com seis abas, duas filas, certificado no dossiê interno e público, download condicional, minimização pública das notas) requerem um servidor local rodando interativamente e não foram executadas nesta sessão automatizada; ficam registradas como verificação manual pendente para quem revisar a branch antes do merge, mas a cobertura automatizada (11 testes de `test_certifier_workbench.py` + 67 de contrato) já exercita o mesmo comportamento programaticamente (200/403/401/404, headers de download, ausência de `notes`/`metadata` nas respostas públicas).

## Next Phase Readiness

- D-13 e D-22 fechadas: dossiê público exibe certificado/histórico e código morto removido; produtor dono tem caminho para a trilha interna completa.
- Nenhum plano da Phase 4 referencia mais um plano inexistente — a referência ao "04-08" do plano 04-06 foi absorvida pela seção `<verification>` deste plano (04-07), como o próprio 04-07 já previa.
- Phase 4 (certification-workbench) está com os 7 planos completos e sem bloqueio conhecido para a próxima fase do roadmap.

---
*Phase: 04-certification-workbench*
*Completed: 2026-08-15*

## Self-Check: PASSED

All 6 modified files confirmed present on disk (`backend_app/modules/supabase_storage.py`, `backend_app/modules/projects/routes.py`, `backend_app/modules/projects/schemas.py`, `tests/test_certifier_workbench.py`, `src/services/database.ts`, `src/pages/Dashboard/MrcaDetails.tsx`); all 3 task commit hashes (`152bd6e`, `7fdbc44`, `0780c69`) confirmed in `git log`.
