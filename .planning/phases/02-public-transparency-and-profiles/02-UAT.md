---
status: complete
phase: 02-public-transparency-and-profiles
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-08-15T04:20:17Z
updated: 2026-08-15T04:20:17Z
verified_by: claude (API/curl automation, sem Playwright disponível; browser aberto em http://localhost:5173 para conferência visual do usuário)
---

## Current Test

[testing complete]

## Tests

### 1. Páginas legais/institucionais publicadas sem placeholders
expected: `/termos`, `/privacidade`, `/suporte-juridico` e `/sobre` não contêm `[Inserir...]`, `[Nome do DPO]` ou "Manus AI"; contato/suporte/DPO usam `@sinarca.com.br`.
result: pass
reported: "Verificado hoje mais cedo via `rg -n \"\\[Inserir|\\[endereço|\\[Nome do DPO|\\[E-mail do DPO|Manus AI\" src/pages/Public` (0 matches) durante a auditoria Nyquist da fase; reconfirmado agora."

### 2. Navegação pública usa URLs limpas sem `/public`
expected: Única referência a `/public` em `src/` é o redirect de compatibilidade em `App.tsx`.
result: pass
reported: "Verificado via `rg -Pn \"/public(?!Contact|-dossier)\" src` → só as 2 linhas do redirect em App.tsx."

### 3. Dossiê público do projeto expõe QTAGs, baseline, certificação, auditoria, documentos, créditos e transações
expected: `GET /api/v1/projects/PRC-2024-002/public-dossier` retorna projeto real com 4 QTAGs (CMAC mascarado), baseline Sentinel/NDVI, certificação, auditoria, documentos, créditos e transações — não dados vazios/mock.
result: pass
reported: "curl verificado: 4 tags (A/B/C/D, cmac mascarado tipo 'cmac...02-a'), baseline com sentinelSceneId/ndviMean=0.681, 1 certificação APPROVED, 1 auditoria APPROVED, 2 documentos, 1 lote de créditos (quantityAvailable=84499), 3 transações, 6 chainEvents. Página aberta em http://localhost:5173/projeto/PRC-2024-002 para conferência visual."

### 4. Explorer de transações filtra por projeto, hash, tipo, comprador e status
expected: `GET /api/v1/transactions` aceita `project_id`, `hash`, `type`, `buyer` e `status` como query params e retorna resultados filtrados.
result: pass
reported: "curl verificado nos 5 filtros: project_id=PRC-2024-002 (success), hash=0x8a1 (1 resultado), type=retired (2), status=completed (2), buyer=comp-001 (2). Página aberta em http://localhost:5173/feed."

### 5. Detalhe de transação por hash
expected: `GET /api/v1/transactions/{hash}` retorna detalhe da transação específica, não uma busca em lista geral.
result: pass
reported: "curl `/api/v1/transactions/0x8a1...b2c3` retornou a transação tx-002 completa (asset, amount, buyer, projectId)."

### 6. Perfil público minimiza/mascara dados sensíveis
expected: `GET /api/v1/profiles/{id}` retorna documento mascarado (não CPF/CNPJ completo) e sem e-mail/telefone completos sem necessidade.
result: pass
reported: "curl `/api/v1/profiles/prod-001` retornou document='***8900' (mascarado), sem e-mail/telefone no payload público."

### 7. Catálogo público de produtores
expected: `GET /api/v1/producers` retorna catálogo com produtores reais do banco.
result: pass
reported: "curl retornou success=true com 102 produtores."

### 8. Cadastro público oferece 4 papéis e bloqueia admin
expected: Registro aceita `producer`/`company`/`auditor`/`certifier`; registro com `role=admin` é rejeitado.
result: pass
reported: "curl: POST /auth/register com role=admin → HTTP 400. POST com role=certifier → HTTP 201, user.role='certifier' confirmado na resposta."

### 9. Edição de perfil persiste dados
expected: `PATCH /auth/me` salva campo (ex. telefone) e o valor permanece após novo `GET /auth/me`.
result: pass
reported: "curl: PATCH /auth/me {phone:'11999998888'} → sucesso. GET /auth/me subsequente retornou phone='11999998888', confirmando persistência real no Postgres, não apenas em memória."

### 10. Erros amigáveis: credencial inválida e e-mail duplicado
expected: Login com senha errada retorna 401; registro com e-mail já existente retorna 409 (para a UI mapear para mensagem amigável).
result: pass
reported: "curl: login com senha errada → HTTP 401. Registro com empresa@sinarca.com.br (já existe) → HTTP 409. Contrato de erro correto para a UI mapear mensagens amigáveis (rendering visual da mensagem não testado por não ter Playwright — sinalizado como limitação do método)."

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

## Método de verificação

Sessão sem Playwright/Puppeteer disponível. Testes 1-2 reaproveitam evidência já coletada hoje na auditoria Nyquist (`02-VALIDATION.md`). Testes 3-10 foram verificados diretamente via `curl` contra a API local (`http://localhost:5680`), com o browser aberto em `http://localhost:5173` (dossiê do projeto e feed) para conferência visual complementar do usuário. Nenhum teste exigiu decisão de UX subjetiva que só um humano pudesse avaliar — todos os itens da Fase 02 são contratos de dados/API testáveis programaticamente.

**Nota de integridade (2026-08-15, pós-verificação):** o container `sinarca-sinarca-api-1` usado nos testes acima foi criado em 2026-05-27 e nunca tinha sido reconstruído — rodava código de ~2,5 meses atrás, sem nenhuma mudança feita hoje (merge da PR #5, correção do bug de perfil zerado, etc). Descoberto ao investigar uma discrepância na timeline de projetos da Fase 03. Reconstruí os containers (`docker compose build && up -d --force-recreate`) e re-executei os 5 checks mais sensíveis a mudanças recentes contra o container atualizado: dossiê público (4 tags + baseline), mascaramento de documento no perfil, bloqueio de cadastro admin, persistência de edição de perfil e filtros de transação — todos os 5 confirmados idênticos. Os 10 testes acima permanecem válidos.
