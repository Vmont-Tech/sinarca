# Phase 03 Research

**Data:** 2026-05-26

## Pergunta de pesquisa

O que precisamos saber para planejar bem a Phase 03 (`project-origination-and-documents`) sem reintroduzir mock runtime no frontend e sem prometer captura NFC/Sentinel que o ambiente real ainda não suporta?

## Fontes canônicas locais

- `.planning/ROADMAP.md` — define Phase 03 e critérios de sucesso.
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` seção 3 — baseline obrigatório de aceite.
- `.planning/phases/03-project-origination-and-documents/03-CONTEXT.md` — decisões já capturadas.
- `.planning/phases/01-backend-rebuild/DATA-MODEL.md` — entidades `project_tags`, `project_baselines`, `documents`, `audit_events`.
- `.planning/phases/02-public-transparency-and-profiles/02-RESEARCH.md` — dossiê público e agregação de QTAGs/documentos.
- `src/pages/Dashboard/AddProject.tsx` — formulário atual, ainda sem tags/documentos reais.
- `src/services/api.ts` — cliente HTTP canônico, já aceita `FormData`.
- `src/services/database.ts` — fachada de dados usada pelas telas.
- `backend_app/modules/projects/routes.py` — `POST /api/v1/projects` atual.
- `backend_app/modules/projects/schemas.py` — `ProjectCreate.tags` já existe.
- `backend_app/modules/projects/service.py` — valida exatamente 4 tags quando `tags` é enviado, persiste baseline, tags e evento.
- `backend_app/modules/inventory/routes.py` — referência de upload seguro com `UploadFile`, hash e magic bytes.
- `backend_app/db/models.py` — modelos `ProjectTag`, `ProjectBaseline`, `Document`, `AuditEvent`.
- `tests/contract/test_backend_app_api_v1.py` e `tests/db/test_schema_contract.py` — contratos existentes para criação de projeto, tags e upload seguro.

## Fontes externas oficiais

- MDN Web NFC API: Web NFC é experimental, não é Baseline e não cobre operações NFC de baixo nível; só trabalha com NDEF. Fonte: https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
- W3C Web NFC: `NDEFReader` expõe leitura/gravação de mensagens NDEF para tags compatíveis. Fonte: https://w3c.github.io/web-nfc/
- MDN Geolocation `getCurrentPosition`: exige secure context, permissão explícita e pode ser bloqueado por `Permissions-Policy`. Fonte: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
- MDN FormData: `FormData` monta payload `multipart/form-data` compatível com `fetch`. Fonte: https://developer.mozilla.org/en-US/docs/Web/API/FormData
- FastAPI Request Files: uploads usam `File`/`UploadFile`, exigem `python-multipart` e múltiplos arquivos devem ser declarados como lista. Fonte: https://fastapi.tiangolo.com/tutorial/request-files/
- Sentinel Hub Process API: permite request por área/período e cálculo de índices como NDVI. Fonte: https://docs.sentinel-hub.com/api/latest/api/process/
- Copernicus Data Space / Sentinel Hub examples: NDVI usa bandas Sentinel-2 B08 e B04. Fonte: https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/introduction_to_SH_APIs.html
- NXP NTAG 424 DNA: NTAG 424 DNA usa AES-128, SUN authentication em cada leitura e recursos de proteção/privacidade. Fonte: https://www.nxp.com/products/wireless-connectivity/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications%3ANTAG424DNA

## Mapa de implementação atual

### Frontend

- `AddProject.tsx` envia apenas `name`, `description`, `project_type`, `producer_id`, `certifier_id`, `area_hectares`, `carbon_stock` e `location`.
- A tela usa `stateOptions` fixo para cidade/UF/coordenadas. Isso conflita com a Phase 03, que exige município/estado reais e geofence derivado das tags.
- A dropzone de documentos é decorativa; não seleciona arquivos, não monta `FormData` e não persiste `documents`.
- Não há etapa para quatro QTAGs/NFC, CMAC, coordenadas ou vértices A/B/C/D.
- `src/services/api.ts` já trata `FormData` sem definir `Content-Type`, então a base técnica para upload multipart existe.
- `MrcaDetails.tsx` já consegue renderizar `dossier.tags`, `dossier.baseline` e `dossier.documents`, herdando a Phase 02, mas a Phase 03 precisa garantir que esses dados nasçam na originação.

### Backend/API

- `ProjectTagInput` já possui `tag_uid`, `cmac`, `latitude`, `longitude`, `vertex_label`.
- `ProjectCreate.tags` é opcional hoje. Quando enviado, `ProjectsService.create_project()` bloqueia qualquer quantidade diferente de 4.
- `create_project()` persiste `ProjectBaseline`, `ProjectTag` e `PROJECT_CREATED` em `audit_events`.
- `deterministic_baseline(payload)` gera baseline local determinístico. Sentinel live deve permanecer bloqueio explícito ou adapter futuro, não sucesso falso.
- Não existe endpoint dedicado para upload de documentos de projeto. O padrão seguro mais próximo está em `/inventory/upload`.
- A tabela `documents` já tem `project_id`, `document_type`, `storage_path`, `sha256_hash`, `mime_type`, `size_bytes`, `uploaded_at` e `metadata`.

### Testes

- `tests/contract/test_backend_app_api_v1.py` já cobre:
  - criação de projeto com 2 tags retorna 400;
  - criação com 4 tags retorna 201;
  - upload seguro de inventário com auth, magic bytes e hash.
- `tests/db/test_schema_contract.py` já bloqueia ausência de `project_tags`, `project_baselines` e `documents`.
- Não há runner JS unitário; a validação frontend da fase deve usar `npm run lint`, `npm run build` e contratos Python que leem arquivos TSX quando necessário.

## Decisões técnicas recomendadas

1. **Tornar tags obrigatórias na UI, não necessariamente no backend global.**
   - A Phase 03 exige que `ProjectCreate.tags` seja exercitado pela UI.
   - O backend já tem compatibilidade com payload sem tags; mudar isso globalmente pode quebrar seeds ou fluxos legados.
   - Plano recomendado: UI bloqueia submissão sem 4 tags; teste de contrato mantém backend aceitando o payload legado apenas se existir necessidade explícita. Se a regra de produto exigir obrigatoriedade global, isso deve ser um task com ajuste de testes.

2. **Separar captura de campo em adapter de capacidade.**
   - Web NFC é experimental e limitado a NDEF; não se deve prometer leitura SUN/CMAC real quando browser/hardware/credencial não suportam.
   - Criar `fieldCapture`/`nfcCapture` no frontend com estados: `available`, `unsupported`, `permission_denied`, `blocked_missing_credentials`, `manual_entry`.
   - Manual entry auditável deve existir para UAT local, mas a UI deve rotular como entrada manual e não como validação criptográfica.

3. **Geofence no cliente com validação simples e persistência por tags.**
   - Com exatamente quatro vértices A/B/C/D, o frontend consegue desenhar o polígono em SVG/HTML sem adicionar dependência de mapa.
   - A área oficial continua `area_hectares` informado/validado; cálculo geodésico real pode ser etapa posterior se necessário.
   - O plano deve adicionar utilitário testável para ordenar vértices e criar pontos SVG/preview.

4. **Documentos de projeto devem reutilizar padrão seguro de upload.**
   - Criar endpoint `POST /api/v1/projects/{project_id}/documents` com `UploadFile`, `document_type`, auth por papel e vínculo `project_id`.
   - Reusar `MAX_UPLOAD_BYTES`, extensões permitidas, magic bytes, SHA-256 e `audit_events` do padrão de inventário.
   - A UI deve mostrar documentos enviados/listados; dropzone sem persistência não fecha a fase.

5. **Timeline canônica precisa ser explícita e auditável.**
   - `Project.timeline` hoje tem apenas registro inicial textual.
   - A Phase 03 deve padronizar eventos até `AVAILABLE`, mesmo que fases posteriores só avancem alguns estados.
   - Cada mudança de documento/status sensível deve criar `audit_events`.

6. **Sentinel/SUN/CMAC live entram como contrato ou bloqueio.**
   - SUN/CMAC real depende de chaves NTAG/KMS/HSM e suporte de hardware.
   - Sentinel live depende de credenciais/adapter e AOI/time period.
   - A fase deve registrar campos/status de bloqueio: `cmac_status`, `sun_validation_status`, `baseline_source`, `sentinel_blocker`, em metadata ou resposta de contrato, sem simular sucesso live.

## Riscos e mitigação

| Risco | Impacto | Mitigação no plano |
|---|---|---|
| Web NFC indisponível em browser alvo | Captura automática falha em UAT | Adapter com detecção de suporte e fallback manual rotulado |
| CMAC/SUN tratado como validado sem chave | Risco de fraude e promessa falsa | Estado `blocked_missing_credentials` e copy explícita |
| Upload decorativo permanecer | Fase parece pronta sem documento persistido | Endpoint + UI + teste de contrato obrigatórios |
| Geofence apenas visual e sem origem de dados | Dossiê público não reflete originação | Polígono deriva de `project_tags` retornados pelo dossiê |
| Mudar schema sem push real | Falso positivo de build/test | Preferir schema existente; se migration surgir, incluir `supabase db push` bloqueante |
| Reintroduzir dados fixos | Viola gate transversal | `rg` e UAT de fonte `/api/v1`/seed |

## Validation Architecture

### Infraestrutura

- Backend: `uv run --with pytest --with httpx pytest -q tests/contract/test_backend_app_api_v1.py`
- Schema: `uv run pytest -q tests/db/test_schema_contract.py`
- Frontend: `npm run lint && npm run build`
- Fonte de dados: `rg` direcionado em `AddProject.tsx`, `MrcaDetails.tsx`, `api.ts`, `database.ts`.

### Novos testes esperados

- Teste backend para `POST /api/v1/projects/{project_id}/documents`:
  - 401 sem auth;
  - 415 extensão inválida;
  - 400 magic bytes inválido;
  - 201 com PDF válido, `project_id`, `sha256`, `storage_path` e `audit_event`.
- Teste backend para criação de projeto com 4 tags:
  - resposta/dossiê público inclui quatro tags A/B/C/D e baseline.
- Teste estático/contrato frontend:
  - `AddProject.tsx` envia `tags` no `apiPost('/projects', ...)`;
  - não existe dropzone apenas decorativo sem `<input type="file">`/`FormData`;
  - fluxo de campo expõe estado de fallback/unsupported.

### UAT manual obrigatório

1. Login como produtor ou certificadora.
2. Abrir `/painel/adicionar-projeto`.
3. Preencher produtor, município, UF, bioma, metodologia, área e estoque.
4. Registrar exatamente quatro QTAGs nos vértices A/B/C/D com coordenadas e CMAC.
5. Confirmar que a UI mostra polígono/geofence antes do envio.
6. Anexar pelo menos um documento legal e um inventário florestal.
7. Criar projeto e abrir `/painel/mrca/:id` ou `/projeto/:id`.
8. Confirmar que QTAGs, baseline, documentos e timeline vêm da API.

## Implicações para o planejamento

- A fase deve ser vertical: backend contract mínimo + UI + verificação no mesmo conjunto de planos.
- Cada `PLAN.md` deve ter seção "Cobertura do checklist".
- O planejamento não deve adicionar marketplace, certificação decisória, auditoria de campo completa ou admin; essas capacidades pertencem às Phases 4, 5, 6 e 9.
- Sem nova biblioteca pesada de mapas nesta fase; usar SVG/HTML/CSS ou componente local simples para preview de geofence.
