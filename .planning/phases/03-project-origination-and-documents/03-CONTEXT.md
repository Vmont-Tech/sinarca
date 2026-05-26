# Phase 03: project-origination-and-documents

## Origem

Criada em 2026-05-26 a partir da auditoria `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`.

## Escopo

- Completar formulário de cadastro de projeto.
- Capturar produtor responsável, localização, bioma, metodologia, área, estoque e documentos.
- Exigir 4 QTAGs/NFC com coordenadas, CMAC e vértices A/B/C/D.
- Definir e implementar cliente de campo web/PWA/mobile para leitura/captura NFC quando o ambiente permitir.
- Validar ou documentar bloqueio técnico para SUN/CMAC, chave mestra, hash inicial de área e pontos Sentinel-2.
- Exibir geofence real a partir de `project_tags`.
- Vincular documentação legal e inventário florestal ao projeto.
- Normalizar timeline de status do projeto.

## Fora de escopo

- Decisão de certificadora.
- Auditoria de campo.
- Marketplace e aposentadoria.

## Regras de aceite

- A fase deve incluir seção "Cobertura do checklist" no `PLAN.md`, cobrindo o item 3 do checklist e dependências com certificação/auditoria.
- `ProjectCreate.tags` deve ser exercitado pela UI.
- Captura de campo deve falhar fechado quando NFC/hardware/credencial não estiver disponível.
- Uploads devem ser persistidos ou bloqueados visualmente; dropzone decorativo não conta como entrega.
- Status e documentos sensíveis devem deixar trilha auditável quando alterados.
