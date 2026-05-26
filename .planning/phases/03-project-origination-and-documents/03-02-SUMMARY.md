---
phase: "03-project-origination-and-documents"
plan: "03-02"
subsystem: "frontend-origination"
tags: ["AddProject", "wizard", "qtags", "projectcreate-tags", "ui-ux-pro-max"]
provides:
  - "Wizard de originação em quatro etapas"
  - "Validação frontend de quatro QTAGs A/B/C/D"
  - "Payload `ProjectCreate.tags` para `/api/v1/projects`"
affects: ["phase-03", "frontend-dashboard", "project-origination"]
tech-stack:
  added: []
  patterns: ["React local state", "Tailwind dashboard UI", "lucide-react icons", "domain service validator"]
key-files:
  created:
    - "src/services/projectOrigination.ts"
  modified:
    - "src/pages/Dashboard/AddProject.tsx"
    - "src/services/database.ts"
key-decisions:
  - "Validação/normalização das QTAGs fica em `src/services/projectOrigination.ts` para ser reutilizada nos próximos planos."
  - "Upload real permanece para 03-04; a etapa de documentos nesta entrega prepara o fluxo sem criar persistência falsa."
duration: "aprox. 25min"
completed: "2026-05-26"
---

# Phase 03: 03-02 Summary

`AddProject` virou um wizard operacional para originação, com dados técnicos editáveis, catálogos vindos da API e envio explícito das quatro QTAGs no payload de criação.

## Performance
- **Duration:** aprox. 25min
- **Tasks:** 4/4
- **Files modified:** 3

## Accomplishments
- Criado `projectOrigination.ts` com `REQUIRED_VERTICES`, `validateTagDrafts`, `normalizeProjectTags` e `averageCoordinates`.
- Reestruturado `AddProject.tsx` em etapas `project`, `qtags`, `documents` e `review`, com progresso, retorno previsível, labels persistentes e alvos de toque 44px+.
- Adicionada captura obrigatória de UID, CMAC, latitude e longitude para os vértices A/B/C/D, com erros por painel e resumo.
- `handleSubmit` agora monta `location.coordinates` a partir das QTAGs e envia `tags: normalizeProjectTags(tags)` para `apiPost<any>('/projects')`.

## Task Commits
1. **T1-T4: wizard e validação de originação** - `94f369f`

## Verification
- `npm run lint && npm run build` — exit 0; warnings legados em `Feed.tsx` e `Settings.tsx`, sem erros.
- `rg -n "tags: normalizeProjectTags|apiPost<any>\\('/projects'|REQUIRED_VERTICES|validateTagDrafts|vertex_label|cmac|tag_uid|stateOptions" src/pages/Dashboard/AddProject.tsx src/services/projectOrigination.ts package.json` — encontrou os contratos esperados e não encontrou `stateOptions`.
- `git diff --check` — sem saída.
- `git diff -- package.json package-lock.json pnpm-lock.yaml yarn.lock bun.lockb` — sem saída, confirmando ausência de dependência nova.

## Decisions & Deviations
Upload persistido de documentos segue fora desta entrega porque está planejado para `03-04`. A etapa visual de documentos foi mantida sem simular persistência.

## Next Phase Readiness
`03-03` pode integrar captura de campo/geofence sobre o estado estruturado de QTAGs e o validador compartilhado.

## Self-Check: PASSED
