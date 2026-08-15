---
phase: "03-project-origination-and-documents"
plan: "03-04"
subsystem: "frontend-project-documents"
tags: ["project-documents", "FormData", "uploads", "wizard", "public-dossier"]
provides:
  - "Serviço frontend de upload de documento de projeto"
  - "Fila local de anexos no wizard de originação"
  - "Upload pós-criação com erro recuperável"
affects: ["phase-03", "AddProject", "project-documents"]
tech-stack:
  added: []
  patterns: ["FormData via apiPost", "local/uploading/uploaded/error document states", "contract test for dossier document listing"]
key-files:
  created:
    - "src/services/projectDocuments.ts"
  modified:
    - "src/pages/Dashboard/AddProject.tsx"
    - "src/services/database.ts"
    - "tests/contract/test_backend_app_api_v1.py"
key-decisions:
  - "Arquivos são selecionados antes da criação e enviados após o backend retornar `friendlyId`."
  - "Se upload falhar, o projeto criado é preservado e a UI permite reenvio dos anexos pendentes."
duration: "aprox. 25min"
completed: "2026-05-26"
---

# Phase 03: 03-04 Summary

O fluxo de documentos deixou de ser decorativo: o wizard agora exige anexos mínimos, cria o projeto e envia os documentos obrigatórios via endpoint persistente antes de mostrar sucesso final.

## Performance
- **Duration:** aprox. 25min
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Criado `projectDocuments.ts` com `uploadProjectDocument(projectId, documentType, file)` usando `FormData` e `apiPost`.
- Substituída a etapa visual de documentos por `<input type="file">`, seletor de tipo, lista de anexos e estados `local`, `uploading`, `uploaded` e `error`.
- `handleSubmit` agora cria o projeto, envia anexos pendentes para `/projects/{id}/documents` e só mostra sucesso final quando uploads obrigatórios passam.
- Teste de contrato de documento agora confirma que o upload aparece no dossiê público do projeto.

## Task Commits
1. **T1-T3: upload real de documentos no wizard** - `0f78ccf`

## Verification
- `rg -n "FormData|document_type|uploadProjectDocument|projects/\\$\\{projectId\\}/documents|Content-Type|fetch" src/services/projectDocuments.ts` — encontrou `FormData`, `document_type` e `uploadProjectDocument`; não encontrou `Content-Type` nem `fetch`.
- `rg -n "type=\\\"file\\\"|uploadProjectDocument|FOREST_INVENTORY|LEGAL_OWNERSHIP|uploaded" src/pages/Dashboard/AddProject.tsx` — encontrou UI/estado de anexos.
- `npm run lint` — exit 0; warnings legados em `Feed.tsx` e `Settings.tsx`.
- `npm run build` — exit 0; warning de chunk grande existente.
- `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document"` — 2 passed.
- `! rg -n "dropzone|Arraste os arquivos aqui" src/pages/Dashboard/AddProject.tsx` — sem saída.
- `git diff --check` — sem saída.

## Decisions & Deviations
None - plan executed as written.

## Next Phase Readiness
`03-05` pode fechar o dossiê/timeline e UAT com QTAGs, geofence, documentos e baseline vindos da API.

## Self-Check: PASSED
