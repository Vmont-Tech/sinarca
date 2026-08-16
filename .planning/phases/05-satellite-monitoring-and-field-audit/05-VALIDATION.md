---
phase: 05
slug: satellite-monitoring-and-field-audit
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-16
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest `>=9.0.3` |
| **Config file** | nenhum `pytest.ini`/`[tool.pytest]` — configuração mínima via `tests/conftest.py` (define `DATABASE_URL` default e fixture autouse que limpa env de Storage/Supabase entre testes) |
| **Quick run command** | `uv run pytest -q <arquivo tocado>` |
| **Full suite command** | `uv run pytest -q` |
| **Estimated runtime** | ~30-60s (suíte roda contra Postgres local real via Supabase Docker, sem mocking de banco) |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest -q <arquivo tocado pela task>`
- **After every plan wave:** Run `uv run pytest -q` (suíte completa)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Req | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|-----|----------|-----------|-------------------|-------------|--------|
| SATM-01 | SATM-01 | Upload real de evidência de auditoria gera `Document`/`Evidence`, não `local://` | integration | `uv run pytest -q tests/test_audit_field_evidence.py -x` | ❌ W0 | ⬜ pending |
| SATM-02 | SATM-02 | Assinatura stub SHA-256 é determinística e reproduzível a partir dos mesmos inputs | unit | `uv run pytest -q tests/test_audit_field_evidence.py::test_signature_stub_deterministic -x` | ❌ W0 | ⬜ pending |
| SATM-03 | SATM-03 | Laudo/evidência aparecem no dossiê público minimizado sem notas internas | integration | `uv run pytest -q tests/test_api_integration.py -k dossier -x` | ✅ (estende arquivo existente) | ⬜ pending |
| SATM-04 | SATM-04 | Fluxo fail-closed de NFC (client-side, já coberto desde Phase 3) | manual-only | — | — | ⬜ pending |
| SATM-05 | SATM-05 | `CopernicusProvider.search_scenes`/`get_statistics` idempotentes, reconstrução persiste ~60 pontos/5 anos | unit + integration | `uv run pytest -q tests/adapters/test_copernicus.py -x` | ❌ W0 | ⬜ pending |
| SATM-06 | SATM-06 | `AnomalyDetector` puro nunca gera `DEFORESTATION`, vocabulário restrito | unit | `uv run pytest -q tests/modules/satellite/test_anomaly_detector.py -x` | ❌ W0 | ⬜ pending |
| SATM-07 | SATM-07 | Nenhum campo de baseline exibido vem de `deterministic_baseline()` quando `CopernicusProvider` está configurado | integration | `uv run pytest -q tests/test_project_boundaries.py -k baseline -x` | ✅ (estende arquivo existente) | ⬜ pending |
| SATM-08 | SATM-08 | `ProjectEvent CONFIRMED HIGH/CRITICAL` dispara Auto Hold via novo sinal de risco | unit + integration | `uv run pytest -q tests/test_risk_engine.py -k satellite -x` | ✅ (estende arquivo existente) | ⬜ pending |
| SATM-09 | SATM-09 | `credit_adjustment_pendencies` criada e disponibilidade ajustada após incidente confirmado | integration | `uv run pytest -q tests/test_satellite_incident_recalc.py -x` | ❌ W0 | ⬜ pending |
| SATM-10 | SATM-10 | Job de monitoramento respeita `maxCloudCoverage`, é idempotente, não bloqueia request HTTP | unit + integration | `uv run pytest -q tests/modules/satellite/test_monitoring_job.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/adapters/test_copernicus.py` — stubs para SATM-05, mocka `httpx.AsyncClient` via `httpx.MockTransport` (sem nova dependência; avaliar `respx` só se `MockTransport` se mostrar insuficiente)
- [ ] `tests/modules/satellite/test_anomaly_detector.py` — stubs para SATM-06, função pura sem banco
- [ ] `tests/modules/satellite/test_monitoring_job.py` — stubs para SATM-10
- [ ] `tests/test_audit_field_evidence.py` — stubs para SATM-01/SATM-02
- [ ] `tests/test_satellite_incident_recalc.py` — stubs para SATM-09
- [ ] Criar diretório `tests/modules/satellite/` junto com o módulo `backend_app/modules/satellite/`
- [ ] Confirmar convenção de nomeação em `tests/adapters/` (já existe) antes de adicionar `test_copernicus.py`
- [ ] Mover `httpx` de `[dependency-groups] dev` para `[project] dependencies` em `pyproject.toml`
- [ ] Adicionar `APScheduler>=3.11` a `[project] dependencies`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Releitura de QTAG/NFC fail-closed em campo | SATM-04 | Comportamento client-side dependente de hardware NFC do dispositivo; já validado desde a Phase 3 (`fieldCapture.ts`) | Abrir auditoria em dispositivo sem leitor NFC, confirmar bloqueio explícito + fallback manual funcional |
| Camadas de mapa (RGB/NDVI/NDMI/NBR/Anomalies) e slider before/after | D-24 (UI) | Renderização visual, sem asserção automatizável direta | Abrir dashboard de monitoramento de um projeto com histórico reconstruído, alternar cada camada, validar slider before/after em um evento |
| Consumo real de Processing Units contra credenciais Copernicus reais | D-08/D-11 | Requer `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` reais, ausentes neste ambiente (staging bloqueado, mesmo padrão dos outros providers) | Quando credenciais forem provisionadas: rodar reconstrução histórica real de 1 projeto, confirmar `copernicus_api_usage` populado e quota respeitada |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-16 (domain specialist review, mesmo mandato das Phases 04.1/04.2)
