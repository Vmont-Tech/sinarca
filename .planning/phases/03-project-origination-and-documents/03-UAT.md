---
status: partial
phase: 03-project-origination-and-documents
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md]
started: 2026-08-15T04:31:38Z
updated: 2026-08-15T04:31:38Z
verified_by: claude (API/curl automation contra container reconstruído; sem Playwright disponível; browser aberto em http://localhost:5173 para conferência visual do usuário)
---

## Current Test

[testing paused — 1 item outstanding: bloqueio de infraestrutura (Supabase Storage local)]

## Tests

### 1. Cadastro de projeto com produtor, localização, metodologia e área
expected: `POST /api/v1/projects` autenticado como produtor aceita nome, descrição, tipo, localização (cidade/estado/bioma/coordenadas), metodologia e cria o projeto com `friendlyId` novo.
result: pass
reported: "curl: criado PRC-2026-503 como produtor@sinarca.com.br, retornou success=true, methodology='VM0015 (Verra)', metrics calculadas (área/estoque de carbono)."

### 2. Exige exatamente 4 QTAGs com coordenadas, CMAC e vértices A/B/C/D
expected: Criação de projeto com `tags` requer 4 vértices A/B/C/D, cada um com `tag_uid`, `cmac`, `latitude`, `longitude`.
result: pass
reported: "curl: projeto criado com 4 tags (A/B/C/D). Dossiê público confirmou os 4 vértices persistidos com CMAC mascarado (ex: 'cmac...rb-a')."

### 3. Vértices duplicados são rejeitados
expected: Enviar dois vértices com o mesmo `vertex_label` (ex: dois 'A') retorna erro, não cria o projeto.
result: pass
reported: "curl: payload com vertex_label 'A' repetido duas vezes → HTTP 400 'Os vértices não podem repetir'."

### 4. Geometria inválida é rejeitada (vértices não formam área)
expected: 4 coordenadas colineares (formando uma linha, não um polígono) são rejeitadas antes de persistir o projeto.
result: pass
reported: "curl: 4 coordenadas em linha reta → HTTP 400 'Os vértices precisam formar uma área válida, não uma linha'. Corrigido para um quadrado válido e a criação passou."

### 5. Polígono/geofence real calculado a partir das QTAGs
expected: O dossiê público do projeto expõe as 4 tags com coordenadas suficientes para o frontend renderizar o polígono (`ProjectGeofencePreview`).
result: pass
reported: "curl: GET /public-dossier retornou os 4 tags com latitude/longitude/vertex para PRC-2026-503. Renderização visual do SVG não testada (sem Playwright) — página aberta em http://localhost:5173/projeto/PRC-2026-503 para conferência do usuário."

### 6. Timeline cobre o ciclo canônico CREATED → AWAITING_CERTIFICATION
expected: Projeto novo tem timeline com os eventos CREATED, QTAGS_RECORDED, BASELINE_CREATED, DOCUMENTS_PENDING e AWAITING_CERTIFICATION.
result: pass
reported: "curl (pós-rebuild do container): os 5 eventos apareceram na ordem correta com descrições reais, não um evento genérico único. ⚠ Esse teste falhou na primeira tentativa contra o container desatualizado (só retornava 1 evento genérico) — ver nota de integridade abaixo."

### 7. Upload de documentos do projeto
expected: `POST /api/v1/projects/{id}/documents` com FormData autenticado aceita PDF, persiste com hash SHA-256 e vincula ao projeto.
result: blocked
blocked_by: third-party
reason: "curl retornou HTTP 502 'Não foi possível gravar o arquivo no Supabase Storage'. Investigado: o Kong gateway do Supabase Storage local (porta configurada 54321 em supabase/config.toml) não está exposto no host — `docker ps` confirma supabase_kong_sinarca-local só expõe 8000/tcp interno, sem mapeamento para o host. Isso é uma lacuna de configuração do ambiente Docker local (pré-existente, não introduzida hoje), não um bug de código. A suíte de testes automatizados (pytest) passa porque usa storage mockado; a integração real com Supabase Storage nunca foi testada de ponta a ponta neste ambiente local."

### 8. NFC/SUN falha fechado sem credenciais; geolocalização com fallback manual
expected: Captura de campo detecta ausência de NFC/hardware e bloqueia com estado explícito; geolocalização negada cai para entrada manual de lat/lng.
result: pass
reported: "Verificado hoje mais cedo via código (`fieldCapture.ts` — NfcCaptureStatus 'unsupported'/'blocked_missing_credentials'/'manual_entry_required') durante a auditoria Nyquist; não é testável via curl (lógica client-side de hardware do navegador). Página do wizard aberta em http://localhost:5173/painel/adicionar-projeto para conferência visual do usuário."

## Summary

total: 8
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none — item 7 é bloqueio de infraestrutura documentado, não gap de código]

## Nota de integridade

O container `sinarca-sinarca-api-1` usado nos testes 1-6 estava rodando código de 2026-05-27 (~2,5 meses desatualizado — nunca tinha sido reconstruído). Descoberto no Teste 6: a timeline retornada não batia com a função `initial_project_timeline()` do código atual. Reconstruí os containers (`docker compose build sinarca-api sinarca-web && docker compose up -d --force-recreate`) e recriei o projeto de teste contra o container atualizado — todos os 6 testes anteriores foram então re-confirmados com um projeto novo (PRC-2026-503) criado já contra o código atual. Essa descoberta também foi registrada em `02-UAT.md` (Fase 2), cuja verificação inicial rodou contra o mesmo container desatualizado, mas cujos resultados-chave foram re-confirmados válidos após o rebuild.
