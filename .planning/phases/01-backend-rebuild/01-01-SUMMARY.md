---
phase: 01-backend-rebuild
plan: 01-01
subsystem: api
tags: [fastapi, react, pytest, contract-tests, stellar]

requires: []
provides:
  - "Contrato legado /api/v1 congelado em suíte pytest"
  - "Testes legados alinhados ao runtime ativo sem monetization/financials"
  - "Aposentadoria de créditos roteada pelo cliente HTTP central do frontend"
affects: [backend_app, api-v1, frontend-retirement, stellar-adapter]

tech-stack:
  added: []
  patterns:
    - "TestClient contra backend.main:app para congelar contrato antes do backend_app"
    - "Reset explícito de USERS, PROJECTS, TRANSACTIONS e ACTIVE_SESSIONS em testes mutáveis"

key-files:
  created:
    - tests/contract/test_api_v1_contract.py
  modified:
    - tests/test_api_integration.py
    - src/pages/Dashboard/RetireCredits.tsx
    - backend/services/stellar_service.py

key-decisions:
  - "O contrato legado foi congelado contra backend.main:app antes da reconstrução em backend_app."
  - "A aposentadoria de créditos usa apiPost('/marketplace/compensate') para herdar VITE_API_URL e bearer token."
  - "O adapter Stellar legado deve falhar explicitamente quando habilitado sem chaves públicas."

patterns-established:
  - "Testes de contrato validam shapes consumidos pelo frontend com payloads concretos."
  - "Fluxos que mutam dados em memória devem restaurar fixtures globais entre testes."

requirements-completed:
  - DOC-PDF-3.6
  - DOC-PDF-3.7
  - DOCX-LEDGER-OFFCHAIN
  - CTX-D03
  - CTX-D09

duration: 5min
completed: 2026-05-22
---

# Phase 01 Plan 01-01: Congelar Contrato Legado e Corrigir Integração Frontend Crítica Summary

**Contrato HTTP `/api/v1` legado congelado em pytest, testes obsoletos removidos e aposentadoria de créditos roteada pelo cliente central do frontend.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-22T21:19:10Z
- **Completed:** 2026-05-22T21:23:50Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Criada suíte `tests/contract/test_api_v1_contract.py` cobrindo health, auth, projetos, filas de auditoria/certificação, marketplace, compra, compensação e upload inválido.
- `tests/test_api_integration.py` deixou de exigir `/api/v1/monetization` e `transaction["financials"]`, validando o contrato real de compra com `PURCHASE`, `totalValue`, hash Stellar e decremento de estoque.
- `src/pages/Dashboard/RetireCredits.tsx` deixou de chamar `http://127.0.0.1:5680` diretamente e agora usa `apiPost('/marketplace/compensate')`.

## Task Commits

1. **Task 1: Criar suíte de contrato HTTP da API v1 ativa** - `f220619` (`test`)
2. **Task 2: Atualizar testes legados para o contrato real atual** - `cc8be0b` (`fix`)
3. **Task 3: Corrigir aposentadoria de créditos para usar cliente HTTP central** - `19821bc` (`fix`)

**Plan metadata:** final `docs(01-01)` commit contains this summary, STATE and ROADMAP updates.

## Files Created/Modified

- `tests/contract/test_api_v1_contract.py` - Suíte de contrato com reset de estado legado e payloads concretos.
- `tests/test_api_integration.py` - Teste de integração atualizado para o contrato real atual.
- `src/pages/Dashboard/RetireCredits.tsx` - Aposentadoria usa `apiPost`, mantém payload previsto e troca Algorand por Stellar.
- `backend/services/stellar_service.py` - Guard mínimo para erro explícito quando Stellar está habilitado sem chaves públicas.
- `src/services/api.ts` - Lido e validado; sem alteração necessária.

## Verification

| Command | Result |
|---|---|
| `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` | PASS - 15 passed |
| `uv run --with pytest --with httpx pytest -q tests/test_api_integration.py` | PASS - 8 passed |
| `npm run lint` | PASS - 0 errors, 1 pre-existing warning in `src/pages/Dashboard/Feed.tsx:36` |
| `npm run build` | PASS - Vite build completed; chunk-size warning remains non-blocking |

## Decisions Made

- Seguir o plano e tratar `backend.main:app` como contrato legado a preservar, sem antecipar criação de `backend_app`.
- Manter o payload fixo de aposentadoria exigido pelo plano para não ampliar escopo de dados dinâmicos nesta etapa.
- Corrigir o guard de configuração Stellar como bug bloqueante do T2, sem implementar o adapter real de testnet nesta etapa.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guard de chaves Stellar ausentes**
- **Found during:** Task 2 (Atualizar testes legados para o contrato real atual)
- **Issue:** `StellarService(StellarConfig(enabled=True, issuer_public_key="", distributor_public_key="")).transfer_credit(...)` não levantava `RuntimeError`, quebrando o teste legado que o plano mandou manter.
- **Fix:** Adicionado guard mínimo em `transfer_credit` para falhar explicitamente quando Stellar está habilitado sem chaves públicas de emissor/distribuidor.
- **Files modified:** `backend/services/stellar_service.py`, `tests/test_api_integration.py`
- **Verification:** `uv run --with pytest --with httpx pytest -q tests/test_api_integration.py` passou com 8 testes.
- **Committed in:** `cc8be0b`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** Necessário para cumprir o requisito explícito do T2; não implementa o adapter real e não altera o contrato HTTP congelado.

## Issues Encountered

- `npm run lint` ainda reporta warning preexistente em `src/pages/Dashboard/Feed.tsx:36` (`react-hooks/exhaustive-deps`). Não bloqueia o plano e não foi alterado por este escopo.
- `npm run build` reporta warning de chunks acima de 500 kB. Build finaliza com sucesso e o warning não bloqueia o plano.

## Known Stubs

- `src/pages/Dashboard/RetireCredits.tsx:170` mantém payload fixo de demonstração para aposentadoria (`comp-001`, `PRC-2024-002`, `5000`), conforme exigido pelo plano. O dado dinâmico fica para os planos de persistência/API operacional.
- `backend/services/stellar_service.py:59` mantém modo mock quando `STELLAR_ENABLED=false`; integração Stellar/Soroban real é escopo do Plan 01-05.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- Plan 01-02 pode criar `backend_app` usando a suíte de contrato como guarda de compatibilidade.
- Plan 01-04 pode trocar mocks persistidos e fluxos operacionais com cobertura inicial contra regressão do frontend.
- Plan 01-05 deve completar o adapter Stellar/Soroban real; este plano só congelou e saneou o comportamento legado mínimo.

## Self-Check: PASSED

- Arquivos principais encontrados: `tests/contract/test_api_v1_contract.py`, `tests/test_api_integration.py`, `src/pages/Dashboard/RetireCredits.tsx`, `backend/services/stellar_service.py`, `.planning/phases/01-backend-rebuild/01-01-SUMMARY.md`.
- Commits encontrados no git log: `f220619`, `cc8be0b`, `19821bc`.

---
*Phase: 01-backend-rebuild*
*Completed: 2026-05-22*
