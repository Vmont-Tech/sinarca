---
phase: "03"
slug: "project-origination-and-documents"
status: passed
date: 2026-08-15
---

# Phase 03 — Verificação e UAT

## Fechamento (2026-08-15)

1. **Nyquist (`03-VALIDATION.md`)** — 9/9 tasks auditadas contra o código atual, zero gaps.
2. **UAT (`03-UAT.md`)** — 7/8 testes passados via API contra o container reconstruído (criação de projeto com 4 QTAGs, rejeição de vértices duplicados/geometria inválida, timeline canônica de 5 eventos, geofence, NFC fail-closed). 1 bloqueado por infraestrutura local (Kong do Supabase Storage não exposto no host) — não é bug de código.
3. **Segurança (`03-SECURITY.md`)** — 16 ameaças verificadas: 15 já fechadas, 1 corrigida nesta rodada (dossiê público expunha `storageBucket`/`storageObjectPath`/`storagePath`/hash completo de documentos, incluindo `LEGAL_OWNERSHIP`; corrigido para retornar só metadados mínimos com hash mascarado, igual ao padrão já usado no CMAC). `threats_open: 0`.

Durante a verificação, foi descoberto e corrigido que o container Docker local estava rodando código de 2026-05-27 (~2,5 meses desatualizado) — ver nota em `02-UAT.md` e `03-UAT.md`.

## Cobertura do checklist

- **Cadastro completo do projeto:** `AddProject.tsx` captura produtor, município, UF, bioma, metodologia, tipo, área, estoque e certificadora usando catálogos da API.
- **QTAGs obrigatórias:** UI exige quatro vértices A/B/C/D com UID, CMAC, latitude e longitude; backend rejeita payload diferente de quatro tags e vértices duplicados.
- **Geofence:** `ProjectGeofencePreview` renderiza polígono SVG a partir das mesmas QTAGs enviadas no payload.
- **Documentos:** documentos legais/CAR e inventário florestal são selecionados no wizard e enviados via `FormData` para `/api/v1/projects/{id}/documents` após criação do projeto.
- **Timeline:** backend gera eventos canônicos `CREATED`, `QTAGS_RECORDED`, `BASELINE_CREATED`, `DOCUMENTS_PENDING` e `AWAITING_CERTIFICATION`; dossiê renderiza `project.timeline` da API.
- **Dossiê:** `/api/v1/projects/{id}/public-dossier` alimenta QTAGs, baseline, documentos, créditos, transações e eventos de cadeia.

## Comandos executados

| Comando | Resultado |
|---|---|
| `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document"` | 2 passed |
| `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py -k "project_document or project"` | 5 passed, 3 deselected |
| `uv run pytest -q tests/db/test_schema_contract.py` | 4 passed |
| `npm run lint` | exit 0; warnings legados em `Feed.tsx` e `Settings.tsx` |
| `npm run build` | exit 0; warning de chunk grande existente |
| `uv run pytest -q tests/contract/test_frontend_project_links.py` | 8 passed |
| `rg -n "NDEFReader|blocked_missing_credentials|ProjectGeofencePreview|polygon" src` | contratos encontrados |
| `! rg -n "dropzone|Arraste os arquivos aqui" src/pages/Dashboard/AddProject.tsx` | sem saída |

## UAT

### `/painel/adicionar-projeto`

1. Entrar com usuário produtor ou perfil autorizado.
2. Abrir `/painel/adicionar-projeto`.
3. Preencher dados do projeto: nome, descrição, município, UF, bioma, metodologia, tipo, área, estoque e certificadora.
4. Registrar QTAGs A/B/C/D com UID, CMAC, latitude e longitude.
5. Confirmar que o preview de geofence aparece apenas quando as quatro coordenadas são válidas.
6. Anexar pelo menos um `LEGAL_OWNERSHIP` ou `CAR` e um `FOREST_INVENTORY`.
7. Criar o projeto.
8. Confirmar que o sucesso só aparece após upload dos documentos.
9. Abrir `/painel/mrca/{friendlyId}` e verificar QTAGs, geofence, baseline, documentos e timeline.

**Status:** pronto para execução visual em navegador autenticado. Os contratos automatizados já validam payload, upload, dossiê e fontes de dados.

## Bloqueios externos

- **Web NFC:** suporte depende de navegador/dispositivo. Quando `NDEFReader` não existe, a UI mostra fallback manual.
- **SUN/CMAC real:** bloqueado por falta de chaves NTAG/KMS/HSM. O CMAC é registrado como valor declarado, não como validação criptográfica.
- **Sentinel live:** bloqueado por falta de credenciais/provider. O baseline atual é rotulado como determinístico local.
- **Storage externo/S3:** o backend grava `storage_path` lógico e hash; integração externa fica fora da Phase 03.

## Fora de escopo redirecionado

- Certificação detalhada e decisão técnica: Phase 4.
- Auditoria de campo, releitura NFC e anomalias: Phase 5.
- Marketplace, carteira e aposentadoria: Phase 6.
- Governança de dados/LGPD operacional: Phase 10.

## Evidência de fonte de dados

- Originação usa `apiPost<any>('/projects', ...)` com `tags: normalizeProjectTags(tags)`.
- Upload usa `uploadProjectDocument()` com `FormData` e `apiPost`.
- Dossiê usa `database.getProjectPublicDossier(id)` e renderiza `dossier.tags`, `dossier.documents`, `dossier.baseline` e `project.timeline`.
- Nenhum dado novo de originação depende de mock runtime.
