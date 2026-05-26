---
phase: "03-project-origination-and-documents"
plan: "03-05"
subsystem: "project-dossier-verification"
tags: ["MrcaDetails", "public-dossier", "timeline", "uat", "contracts"]
provides:
  - "Dossiê com geofence/QTAGs/documentos/timeline vindos da API"
  - "Contrato estático de fonte de dados frontend"
  - "Relatório 03-VERIFICATION.md"
affects: ["phase-03", "project-detail", "verification"]
tech-stack:
  added: []
  patterns: ["public dossier API contract", "static frontend contract tests", "GSD verification report"]
key-files:
  created:
    - ".planning/phases/03-project-origination-and-documents/03-VERIFICATION.md"
  modified:
    - "src/pages/Dashboard/MrcaDetails.tsx"
    - "tests/contract/test_frontend_project_links.py"
    - ".planning/ROADMAP.md"
    - ".planning/STATE.md"
key-decisions:
  - "Baseline/Sentinel no dossiê é rotulado como determinístico/bloqueado quando metadata indica ausência de provider."
  - "UAT visual fica documentado com passos e bloqueios externos; contratos automatizados cobrem payload, upload e dossiê."
duration: "aprox. 20min"
completed: "2026-05-26"
---

# Phase 03: 03-05 Summary

Fechamento da originação: o detalhe do projeto agora usa QTAGs, geofence, documentos, baseline e timeline vindos do dossiê público/API, e a fase tem evidência de verificação/UAT.

## Performance
- **Duration:** aprox. 20min
- **Tasks:** 4/4
- **Files modified:** 4

## Accomplishments
- `MrcaDetails.tsx` renderiza `ProjectGeofencePreview` a partir de `dossier.tags`.
- Timeline reconhece códigos `CREATED`, `QTAGS_RECORDED`, `BASELINE_CREATED`, `DOCUMENTS_PENDING`, `AWAITING_CERTIFICATION`, `AWAITING_AUDIT`, `ACTIVE` e `AVAILABLE`.
- Baseline/Sentinel são exibidos sem sugerir integração live quando `baseline_source` é determinístico ou `sentinel_status` está bloqueado.
- `test_frontend_project_links.py` agora falha se `tags` sair do payload, se upload voltar a ser decorativo ou se o dossiê deixar de consumir `dossier.tags`/`dossier.documents`.
- Criado `03-VERIFICATION.md` com comandos, cobertura, UAT e bloqueios externos.

## Task Commits
1. **T1-T3: dossiê e contratos frontend** - `88e5ac7`

## Verification
- `rg -n "ProjectGeofencePreview|dossier.tags|baseline|deterministic_baseline|Sentinel" src/pages/Dashboard/MrcaDetails.tsx` — encontrou contratos esperados.
- `rg -n "CREATED|QTAGS_RECORDED|BASELINE_CREATED|DOCUMENTS_PENDING|AWAITING_CERTIFICATION|AVAILABLE" src/pages/Dashboard/MrcaDetails.tsx backend_app/modules/projects/service.py` — encontrou códigos esperados.
- `npm run lint` — exit 0; warnings legados em `Feed.tsx` e `Settings.tsx`.
- `npm run build` — exit 0; warning de chunk grande existente.
- `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project or project_document"` — 5 passed, 3 deselected.
- `uv run pytest -q tests/contract/test_frontend_project_links.py tests/db/test_schema_contract.py` — 12 passed.
- `rg -n "Cobertura do checklist|UAT|Web NFC|SUN|Sentinel|QTAG|documentos" .planning/phases/03-project-origination-and-documents/03-VERIFICATION.md` — encontrou seções esperadas.
- `git diff --check` — sem saída.

## Decisions & Deviations
O UAT visual completo com sessão autenticada ficou documentado para execução manual porque depende de ambiente/browser autenticado e permissões de geolocalização/NFC. Os contratos automatizados cobrem os caminhos críticos de payload, upload persistido e dossiê API.

## Next Phase Readiness
Phase 4 pode consumir o dossiê completo para revisão da certificadora, decisão técnica e preparação de certificado/lastro.

## Self-Check: PASSED
