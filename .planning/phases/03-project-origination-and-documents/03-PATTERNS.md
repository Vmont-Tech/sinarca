# Phase 03 Pattern Map

**Data:** 2026-05-26

## Objetivo

Mapear padrões concretos do repositório que os planos da Phase 03 devem seguir ao implementar originação de projeto, QTAGs, geofence, documentos e timeline.

## Arquivos análogos

| Responsabilidade | Arquivo existente | Padrão a reutilizar |
|---|---|---|
| Cliente HTTP | `src/services/api.ts` | Usar `apiGet`, `apiPost`, `apiPatch`; `FormData` já é suportado sem `Content-Type` manual. |
| Fachada de domínio | `src/services/database.ts` | Tipar responses e centralizar mapeamentos compartilhados. |
| Formulário protegido | `src/pages/Dashboard/AddProject.tsx` | Evoluir a tela existente em vez de criar rota paralela. |
| Dossiê de projeto | `src/pages/Dashboard/MrcaDetails.tsx` | Reaproveitar exibição de `dossier.tags`, `dossier.baseline`, `dossier.documents`, `project.timeline`. |
| Upload seguro | `backend_app/modules/inventory/routes.py` | Reusar limites, extensão permitida, magic bytes, hash, owner e `audit_events`. |
| Projeto API | `backend_app/modules/projects/routes.py` | Manter rotas sob `/api/v1` e `ProjectsService`. |
| Schema de tags/docs | `backend_app/db/models.py` | Usar `ProjectTag`, `ProjectBaseline`, `Document`, `AuditEvent` existentes. |
| Testes de contrato | `tests/contract/test_backend_app_api_v1.py` | Expandir TestClient com auth e payloads reais. |

## Padrões obrigatórios

### Frontend

- Não chamar URL absoluta nem `fetch` direto para domínio de negócio; usar `src/services/api.ts`.
- Não criar novo sistema visual; manter Tailwind/lucide e a estrutura de dashboard.
- Não adicionar biblioteca de mapa pesada para preview de quatro vértices; usar componente SVG/HTML simples salvo necessidade comprovada.
- Inputs de QTAG devem ter estado local estruturado por vértice `A`, `B`, `C`, `D`.
- Upload deve usar `FormData` e exibir estado por arquivo: local, enviando, persistido, erro.

### Backend

- Rotas novas entram em routers montados por `backend_app/api/router.py`.
- Regras de projeto ficam em `backend_app/modules/projects/service.py` ou helpers próximos, não espalhadas na rota.
- Upload de projeto deve reaproveitar validação segura do inventário ou extrair helper compartilhado.
- Mudanças sensíveis criam `audit_events`.
- Mensagens HTTP devem usar `detail` claro em PT-BR.

### Testes

- Preferir `TestClient(app)` já usado em `tests/contract/test_backend_app_api_v1.py`.
- Usar `auth_headers()` existente para produtor/certificadora/admin.
- Cobrir payload inválido antes de implementação.
- Validar efeitos persistidos pelo endpoint/dossiê, não apenas status HTTP.

## Arquivos prováveis por plano

| Plan | Arquivos prováveis |
|---|---|
| `03-01` | `backend_app/modules/projects/routes.py`, `backend_app/modules/projects/service.py`, `backend_app/modules/projects/schemas.py`, `tests/contract/test_backend_app_api_v1.py` |
| `03-02` | `src/pages/Dashboard/AddProject.tsx`, `src/services/database.ts`, possivelmente `src/services/api.ts` se precisar helper de upload |
| `03-03` | `src/pages/Dashboard/AddProject.tsx`, `src/components/`, `src/services/fieldCapture.ts`, `src/services/geofence.ts` |
| `03-04` | `src/pages/Dashboard/AddProject.tsx`, `backend_app/modules/projects/*`, `tests/contract/test_backend_app_api_v1.py` |
| `03-05` | `src/pages/Dashboard/MrcaDetails.tsx`, `src/services/database.ts`, `tests/contract/test_frontend_project_links.py`, docs/UAT |

## Landmines

- `ProjectCreate.tags` existe, mas a UI atual não o envia.
- A dropzone atual em `AddProject.tsx` é visual; não existe `<input type="file">`.
- Web NFC não é suporte universal; qualquer plano que dependa dele como caminho único falha.
- `deterministic_baseline()` não é Sentinel live; deve ser rotulado como baseline determinístico/sandbox.
- `documents` aceita `project_id`, mas upload atual de inventário não vincula projeto.
- `npm run build` passa mesmo sem testes JS unitários; planos precisam incluir verificações textuais/contratos para fonte de dados.
