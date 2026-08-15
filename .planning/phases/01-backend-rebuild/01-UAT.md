---
status: complete
phase: 01-backend-rebuild
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md]
started: 2026-08-15T02:29:42Z
updated: 2026-08-15T02:52:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Matar qualquer servidor/serviço rodando. Limpar estado efêmero (containers reiniciados do zero). Subir a aplicação do zero (docker compose up). A API sobe sem erro, aplica seed/migrations e uma consulta primária (health check ou carregamento da home) retorna dados reais.
result: pass

### 2. Login com usuário existente
expected: Entrar em `/login` com credencial demo do seed (Argon2/JWT própria) e ser redirecionado ao painel do papel correspondente (produtor/empresa/auditor/certificadora).
result: pass

### 3. Cadastro de novo usuário
expected: Registrar um novo usuário (produtor, empresa ou auditor) em `/login` cria a conta e loga automaticamente no painel, sem opção de cadastrar como admin.
result: pass
reported: "Usuário criou e validou a própria conta (leonardolimanas@gmail.com) manualmente na UI, fora do fluxo assistido por Claude."

### 4. Mapa/Feed/Rankings públicos mostram dados reais
expected: `/mapa-brasil`, `/feed` e `/rankings` mostram projetos e transações vindos do seed do Supabase — não texto/números fixos no frontend.
result: pass

### 5. Fila de certificadora lista projetos pendentes
expected: `/painel/certificadora` (fila) mostra projetos pendentes de decisão vindos de `/api/v1/certifier/queue`, não uma lista vazia ou mockada.
result: pass

### 6. Fila de auditoria lista projetos pendentes
expected: `/painel/auditoria` (fila) mostra projetos pendentes de auditoria vindos de `/api/v1/audit/queue`.
result: pass

### 7. Comprar crédito no marketplace
expected: Comprar um crédito ambiental no marketplace reduz o estoque exibido e a compra aparece em "Transações" com hash/valor.
result: pass

### 8. Aposentar (retire) créditos
expected: A tela de aposentadoria de créditos completa a operação via API (sem erro de conexão a `127.0.0.1:5680` hardcoded) e retorna confirmação/hash.
result: pass

### 9. Detalhe do projeto mostra dados reais
expected: Abrir o detalhe de um projeto (`/projeto/:id` ou `/painel/mrca/:id`) mostra dados daquele projeto específico vindos da API, sem documentos/datas fixos herdados de outro projeto.
result: pass

### 10. Health check da API
expected: `GET /health` (porta da API, ex. `http://localhost:5680/health`) responde 200 com a versão do `backend_app`.
result: pass
reported: "{\"status\":\"ok\",\"service\":\"sinarca-api\",\"version\":\"0.3.0-backend-app\"}"

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
