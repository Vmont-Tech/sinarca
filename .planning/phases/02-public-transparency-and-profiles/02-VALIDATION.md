---
phase: "02"
slug: "public-transparency-and-profiles"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-14
---

# Phase 02 — Validation Strategy

> Reconstruído retroativamente (State B — sem `02-VALIDATION.md` prévio) a partir dos 5 planos e do `02-VERIFICATION.md` existente, com auditoria de gaps em 2026-08-14.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + FastAPI TestClient; npm/Vite/ESLint; ripgrep para checks estáticos |
| **Config file** | `pyproject.toml`, `package.json` |
| **Quick run command** | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` |
| **Full suite command** | `npm run lint && npm run build && uv run pytest -q` |
| **Estimated runtime** | ~15 segundos (sem `supabase db reset`) |

## Sampling Rate

- **After every task commit:** Rodar o comando automatizado específico da task.
- **After every plan wave:** `npm run lint && npm run build && uv run pytest -q`.
- **Before `/gsd-verify-work`:** Full suite verde; `npx supabase db reset` deve ser confirmado manualmente por exigir reset destrutivo do banco local.
- **Max feedback latency:** 60 segundos.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 02-01 | 1 | CHECKLIST-1-publico-transparencia | link público reintroduz `/public` | Única referência a `/public` em `src/` é o redirect de compatibilidade em `App.tsx` | static | `rg -Pn "/public(?!Contact\|-dossier)" src` | yes | covered |
| 02-01-T2 | 02-01 | 1 | BIBLE-10/11/12/13 | placeholder editorial publicado | Páginas legais sem `[Inserir...]`/`Manus AI` | static | `rg -n "\[Inserir\|\[endereço\|\[Nome do DPO\|\[E-mail do DPO\|Manus AI" src/pages/Public` | yes | covered |
| 02-01-T3 | 02-01 | 1 | CHECKLIST-1-publico-transparencia | métricas públicas hardcoded | Build/lint limpos, sem contadores fixos sem fonte | frontend | `npm run lint && npm run build` | yes | covered |
| 02-02-T1 | 02-02 | 1 | CHECKLIST-1-publico-transparencia | dossiê expõe dados sem agregação testada | Dossiê público agregado (QTAGs/baseline/certificação/auditoria/créditos) coberto por teste de contrato | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` | yes | covered |
| 02-02-T2 | 02-02 | 1 | CHECKLIST-1-publico-transparencia | filtros de transação divergem API/UI | `/transactions` com filtros + detalhe por hash testados | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` | yes | covered |
| 02-02-T3 | 02-02 | 1 | CHECKLIST-1/2 | catálogo público expõe PII | DTO público minimizado, `/producers` testado | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` | yes | covered |
| 02-02-T4 | 02-02 | 1 | CHECKLIST-regra-transversal-dados | seed insuficiente força mock runtime | Seed local aplica sem erro | integration (destructivo) | `npx supabase db reset` | yes | manual-only |
| 02-03-T1 | 02-03 | 2 | CHECKLIST-1-publico-transparencia | cliente usa fallback mockado | `database.ts` tem métodos tipados para dossiê/transações sem fallback local | frontend | `npm run lint` | yes | covered |
| 02-03-T2 | 02-03 | 2 | CHECKLIST-regra-transversal-dados | dossiê mantém conteúdo fixo/rede legada | Sem documentos fixos nem menção a Algorand em `MrcaDetails.tsx` | static | `rg -n "PDD\|Relatório de Validação\|Certidão de Posse\|15 Out 2024\|Algorand\|Gateway de Pagamento Blockchain" src/pages/Dashboard/MrcaDetails.tsx` | yes | covered |
| 02-03-T3 | 02-03 | 2 | CHECKLIST-1-publico-transparencia | filtros locais divergem da API | Explorer usa query params reais; build passa | frontend | `npm run lint && npm run build` | yes | covered |
| 02-04-T1 | 02-04 | 2 | CHECKLIST-1/2 | perfil público expõe dados sensíveis sem necessidade | `database.ts` tipa campos públicos vs. autenticados | frontend | `npm run lint` | yes | covered |
| 02-04-T2 | 02-04 | 2 | CHECKLIST-1-publico-transparencia | métricas/atividade fixadas artificialmente | Rota `/painel/meu-perfil` busca perfil real via `database.getPublicProfile(user.id)` em vez de zerar métricas | frontend + regression | `uv run pytest -q tests/contract/test_frontend_auth_contract.py -k own_profile` | yes | covered |
| 02-04-T3 | 02-04 | 2 | CHECKLIST-1-publico-transparencia | rankings/catálogos hardcoded | Listagens consomem API/seed; build passa | frontend | `npm run lint && npm run build` | yes | covered |
| 02-05-T1 | 02-05 | 3 | CHECKLIST-2-auth-perfis | cadastro público permite `admin` | UI oferece 4 papéis, backend bloqueia/normaliza `admin` | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py -k "register or auth"` | yes | covered |
| 02-05-T2 | 02-05 | 3 | CHECKLIST-2/regra-transversal | avatar/documento parecem persistidos mas ficam locais | `PATCH /auth/me` persiste campos aceitos | contract | `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py -k "profile or me" && npm run lint` | yes | covered |
| 02-05-T3 | 02-05 | 3 | CHECKLIST-2-auth-perfis | erros técnicos vazam detalhes internos | Mensagens amigáveis para 401/409/sessão expirada/API offline | frontend | `npm run lint && npm run build` | yes | covered |

*Status: covered · manual-only · partial · missing*

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — `tests/contract/test_api_v1_contract.py`, `tests/contract/test_frontend_auth_contract.py` e checks estáticos via `rg` já existiam antes desta auditoria.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx supabase db reset` (seed completo para telas públicas) | CHECKLIST-regra-transversal-dados | Comando destrutivo — reseta o banco Postgres local (`supabase_db_sinarca-local`, rodando há dias com dados de dev reais); não deve rodar sem confirmação explícita do responsável pelo ambiente | Rodar `npx supabase db reset` em ambiente onde a perda dos dados locais atuais é aceitável; confirmar que os endpoints públicos (`/projects/{id}/public-dossier`, `/transactions`, `/producers`, `/profiles/{id}`) retornam os exemplos seedados. |

## Validation Sign-Off

- [x] All tasks have automated verify or explicit manual-only path.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers missing test references (nenhuma — infraestrutura já existia).
- [x] No watch-mode flags.
- [x] Feedback latency target documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** validated 2026-08-14

## Validation Audit 2026-08-14

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Gap 1 — 02-01-T1 (comando obsoleto):** `rg -n "(/public|to=\"/public|...)" src` dava falso-positivo em `src/constants/publicContact.ts` (imports `PUBLIC_CONTACT_EMAIL` etc.) e em `src/services/database.ts` (`/projects/{id}/public-dossier`), módulos criados após o plano original. Corrigido para `rg -Pn "/public(?!Contact|-dossier)" src`, que hoje aponta só para as duas linhas legítimas em `src/App.tsx` (redirect de compatibilidade).

**Gap 2 — 02-04-T2 (bug real de implementação):** `src/pages/Dashboard/UserProfile.tsx` — a rota `/painel/meu-perfil` (sem `:id`) montava o perfil do próprio usuário localmente com `metrics: {projects:0, totalImpact:0, transactions:0}, projects: [], activity: []` fixos, sem chamar a API. Corrigido para chamar `database.getPublicProfile(user.id)` (mesmo endpoint público `/profiles/{id}` já usado para outros usuários), com o objeto zerado mantido apenas como fallback caso a API retorne `null`. Teste de regressão adicionado em `tests/contract/test_frontend_auth_contract.py::test_own_profile_route_fetches_real_metrics_instead_of_hardcoded_zeros`.

Verificação final: `npm run lint` (limpo) · `npm run build` (sucesso) · `uv run pytest -q` (94 passed, era 93 antes do teste novo).
