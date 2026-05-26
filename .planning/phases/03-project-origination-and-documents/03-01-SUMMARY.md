---
phase: "03-project-origination-and-documents"
plan: "03-01"
subsystem: "backend-api"
tags: ["projects", "documents", "qtags", "timeline", "audit-events"]
provides:
  - "Upload seguro de documentos vinculados a projeto"
  - "Validação de quatro QTAGs nos vértices A/B/C/D"
  - "Metadata técnica fail-closed para SUN/CMAC/Sentinel"
  - "Timeline inicial canônica de originação"
affects: ["phase-03", "project-origination", "public-dossier"]
tech-stack:
  added: []
  patterns: ["FastAPI UploadFile/FormData", "SQLAlchemy async session", "contrato TDD via pytest"]
key-files:
  created: []
  modified:
    - "backend_app/modules/projects/routes.py"
    - "backend_app/modules/projects/schemas.py"
    - "backend_app/modules/projects/service.py"
    - "tests/contract/test_backend_app_api_v1.py"
key-decisions:
  - "Documento de projeto reutiliza validação de extensão, tamanho e magic bytes do inventário."
  - "SUN e Sentinel live permanecem bloqueados explicitamente por falta de credenciais/provider."
duration: "aprox. 20min"
completed: "2026-05-26"
---

# Phase 03: 03-01 Summary

Contrato backend mínimo de originação fechado para a UI da Phase 03: criação de projeto valida QTAGs A/B/C/D, expõe status técnicos fail-closed, gera timeline canônica e aceita upload persistido de documentos por projeto.

## Performance
- **Duration:** aprox. 20min
- **Tasks:** 4/4
- **Files modified:** 4

## Accomplishments
- Adicionados testes RED para `POST /api/v1/projects/{project_id}/documents`, incluindo auth, extensão proibida, magic bytes inválidos, persistência e auditoria.
- Implementado upload seguro com `FormData`, SHA-256, storage lógico em `projects/{friendly_id}/documents/`, vínculo `documents.project_id` e evento `PROJECT_DOCUMENT_UPLOADED`.
- Criação de projeto agora rejeita vértices duplicados, mantém exatamente A/B/C/D e adiciona metadata técnica de SUN/CMAC/Sentinel.
- Timeline inicial agora inclui `CREATED`, `QTAGS_RECORDED`, `BASELINE_CREATED`, `DOCUMENTS_PENDING` e `AWAITING_CERTIFICATION`.

## Task Commits
1. **T1: contrato RED de upload de documento** - `0d3f406`
2. **T3/T4: contrato RED de metadata/timeline** - `c9824ad`
3. **T2/T3/T4: implementação backend** - `361bad2`

## Verification
- `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document"` — 2 passed.
- `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "projects_collection_detail_catalogs_and_creation_use_persistent_api"` — 1 passed.
- `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document or project"` — 5 passed, 3 deselected.
- `uv run pytest -q tests/db/test_schema_contract.py` — 4 passed.
- `rg -n "PROJECT_DOCUMENT_UPLOADED|sun_validation_status|sentinel_status|DOCUMENTS_PENDING" backend_app tests` — encontrou ocorrências esperadas.

## Decisions & Deviations
None - plan executed as written. A rota delega a resolução do projeto a um método público fino em `ProjectsService` para evitar acesso externo direto ao helper privado.

## Next Phase Readiness
O plano `03-02` pode consumir `ProjectCreate.tags`, `project.metadata` e o endpoint de documento criado aqui.

## Self-Check: PASSED
