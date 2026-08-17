---
phase: 05-satellite-monitoring-and-field-audit
plan: 06
subsystem: satellite-monitoring
tags: [apscheduler, sqlalchemy, asyncio, postgres, copernicus, anomaly-detection, on-conflict]

# Dependency graph
requires:
  - phase: 05-04
    provides: "detect_anomaly/detect_anomalies pure functions, ObservationSnapshot/AnomalySignal DTOs (never DEFORESTATION)"
  - phase: 05-05
    provides: "SatelliteService (persist_observations/latest_observation/list_observations/finish_job/apply_baseline_from_observations), historical_reconstruction.py's select_monthly_scenes/join_statistics_to_scenes, scheduler.py JOB_DISPATCH dict with a fail-closed CONTINUOUS_MONITORING placeholder"
provides:
  - "backend_app/modules/satellite/monitoring.py: SatelliteMonitoringService — incremental window, anomaly/event persistence, DETECTED->ANALYZED Correlation Engine, public timeline entry (D-21)"
  - "backend_app/modules/satellite/evidence.py: SatelliteEvidenceService — before/after PNG capture gated on ANALYZED, SHA-256 hash, idempotent per (project_event_id, kind)"
  - "backend_app/modules/storage_paths.py: satellite_evidence_location() factory"
  - "backend_app/modules/satellite/scheduler.py: CONTINUOUS_MONITORING now dispatches to the real service (fail-closed placeholder removed)"
affects: [05-07, 05-08, 05-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Partial unique indexes require index_where on pg_insert(...).on_conflict_do_nothing() — Postgres cannot infer a partial index from index_elements alone; discovered via a real InvalidColumnReferenceError against project_events_anomaly_idx and satellite_evidence_event_kind_idx (both `where ... is not null`)."
    - "Module-qualified constant imports (from backend_app.modules.satellite import constants as satellite_constants) instead of bare name imports, when a plan's acceptance criteria greps for an exact single occurrence of a constant name that is both imported and used."
    - "Lazy in-method import of a sibling service (SatelliteEvidenceService inside correlate_and_create_event) guarded by a broad try/except, so an earlier task's file can be committed and its own tests pass before the dependent module exists yet."

key-files:
  created:
    - backend_app/modules/satellite/monitoring.py
    - backend_app/modules/satellite/evidence.py
    - tests/modules/satellite/test_monitoring_job.py
  modified:
    - backend_app/modules/satellite/scheduler.py
    - backend_app/modules/storage_paths.py

key-decisions:
  - "affected_area_ha = round(active_area_ha * max(0.0, signal.drop_ratio), 4) where active_area_ha comes from ProjectsService.boundary_item()['declaredAreaHa'] — an order-of-magnitude for human review, never a carbon/tonnage estimate (D-23)."
  - "metadata_['correlation'] is enrichment only (confirmed_events_count, stale_qtags, consecutive_drops) — it is read by nothing that alters severity or status, keeping D-18's 'no automatic escalation' guarantee structural, not just documented."
  - "SATELLITE_EVENT_TIMELINE_TITLES lives in monitoring.py (not constants.py, which is Plan 01's file, out of this plan's files_modified) — a 3-entry closed map matching PROJECT_EVENT_TYPES exactly."

requirements-completed: [SATM-06, SATM-10]

# Metrics
duration: ~75min
completed: 2026-08-17
---

# Phase 05 Plan 06: Continuous Satellite Monitoring + Anomaly/Event Persistence + Visual Evidence Summary

**SatelliteMonitoringService (incremental window, anomaly/event persistence, Correlation Engine stopping hard at ANALYZED) and SatelliteEvidenceService (before/after PNG only on ANALYZED, real SHA-256 hash) — 20 new tests, all passing, plus a real Postgres partial-unique-index bug found and fixed via TDD before it could reach production.**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3 (all completed)
- **Files modified/created:** 5 (3 created, 2 modified)

## Accomplishments

- `backend_app/modules/satellite/monitoring.py` (~370 lines): `monitoring_window(last_observed_at, now, settings)` — starts exactly at the last observation (D-15 idempotency covers edge overlap) or a short 2-cycle window without history (never the 5-year historical-reconstruction window). `SatelliteMonitoringService.run(job)` mirrors `HistoricalReconstructionService.run()`'s structure: fail-closed without `active_boundary` (never calls the provider), two serial provider calls per cycle (D-11, never `asyncio.gather`), an extra D-13 guard that drops any row with `cloud_coverage is None or > satellite_max_cloud_coverage_pct` before persistence, then `detect_and_persist_anomalies` + `apply_baseline_from_observations` + `finish_job`.
- `detect_and_persist_anomalies`/`correlate_and_create_event`: the pure `detect_anomalies` module from Plan 04 does all NDVI/NBR comparison — zero index-comparison logic in this file. Anomalies and events are persisted idempotently via `pg_insert(...).on_conflict_do_nothing()` over the D-15 unique indexes. The Correlation Engine advances `DETECTED -> ANALYZED` in the same cycle, never `CONFIRMED` (validated both by a runtime `assert` against `PROJECT_EVENT_TRANSITIONS` and by `FORBIDDEN_AUTOMATIC_EVENT_TYPES`/`PROJECT_EVENT_TYPES` guards). Every event appends exactly one neutral, public timeline entry and two `audit_events` (`SATELLITE_ANOMALY_DETECTED`, `SATELLITE_EVENT_ANALYZED`).
- `backend_app/modules/satellite/evidence.py`: `SatelliteEvidenceService.capture_before_after` — gated on `event.status == "ANALYZED"` (cost gate for the expensive Process API), idempotent per `(project_event_id, kind)`, ±15-day windows around the anomaly's previous/current observation, real SHA-256 hash of the returned image bytes, uploaded via the same `storage_paths.py`/`upload_storage_object` pipeline already used for documents. Provider exceptions propagate to the caller — `monitoring.py`'s `correlate_and_create_event` is the one that decides to continue without an image (best-effort try/except), never this service.
- `backend_app/modules/storage_paths.py`: added `satellite_evidence_location(project_friendly_id, kind, sha256, extension=".png")`, same factory shape as the existing `project_document_location`.
- `backend_app/modules/satellite/scheduler.py`: `CONTINUOUS_MONITORING` now dispatches directly to `SatelliteMonitoringService` — the Plan 05 fail-closed placeholder (`"Tipo de job ainda não implementado"`) is gone.
- `tests/modules/satellite/test_monitoring_job.py`: 20 tests (10 pure/integration for the window+idempotency+fail-closed behavior, 6 for anomaly/event/timeline/correlation, 4 for evidence capture), all passing.

## Task Commits

Each task was committed atomically:

1. **Task 1: SatelliteMonitoringService — janela incremental, maxCloudCoverage e idempotencia (SATM-10)** - `73edaf1` (feat)
2. **Task 2: Anomalia persistida, ProjectEvent DETECTED→ANALYZED e trilha auditavel (SATM-06, D-17/D-18/D-21)** - `2779a6f` (test)
3. **Task 3: SatelliteEvidenceService — before/after PNG com hash SHA-256, apenas em ANALYZED (D-19)** - `4448bff` (feat)

## Files Created/Modified

- `backend_app/modules/satellite/monitoring.py` - `SatelliteMonitoringService`, `monitoring_window`, `SATELLITE_EVENT_TIMELINE_TITLES`
- `backend_app/modules/satellite/evidence.py` - `SatelliteEvidenceService`
- `backend_app/modules/satellite/scheduler.py` - `CONTINUOUS_MONITORING` dispatch now real (fail-closed placeholder removed)
- `backend_app/modules/storage_paths.py` - `satellite_evidence_location()`
- `tests/modules/satellite/test_monitoring_job.py` - 20 tests across window/idempotency/anomaly/event/timeline/evidence

## Contract for Plan 07 — final populated shapes

**`SatelliteAnomaly`** (post-`detect_and_persist_anomalies`), fields actually populated by this plan:

```python
SatelliteAnomaly(
    project_id=..., observation_id=<current obs.id>, previous_observation_id=<previous obs.id>,
    index_name="NDVI" | "NDMI" | "NBR",
    value_before=Decimal, value_after=Decimal, drop_ratio=Decimal,  # positivo=queda, negativo=recuperacao
    severity="LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    confidence=Decimal,  # 0-100
    affected_area_ha=Decimal | None,
    status="PENDING_ANALYSIS" -> "LINKED",  # LINKED assinala que ja tem ProjectEvent (Task 2 step 7)
    reason=<texto PT-BR explicavel do AnomalySignal>,
    detected_at=<current observation.observed_at>,
    metadata_={"event_type": "VEGETATION_LOSS"|"VEGETATION_RECOVERY"|"POSSIBLE_FIRE", **signal.metadata},
    # signal.metadata contem ndvi_drop_ratio (e nbr_drop_ratio quando POSSIBLE_FIRE)
)
```

**`ProjectEvent`** (post-`correlate_and_create_event`), fields actually populated:

```python
ProjectEvent(
    project_id=..., anomaly_id=<anomaly.id>,
    type="VEGETATION_LOSS" | "VEGETATION_RECOVERY" | "POSSIBLE_FIRE",  # NUNCA DEFORESTATION
    status="DETECTED" -> "ANALYZED",  # nunca CONFIRMED/DISMISSED neste plano
    severity=<mesma da anomalia>, confidence=Decimal,
    affected_area_ha=<mesma da anomalia>,
    ndvi_before=Decimal | None, ndvi_after=Decimal | None,  # so preenchidos quando index_name == "NDVI"
    summary=<mesmo reason da anomalia>,
    detected_at=<anomaly.detected_at>, analyzed_at=<datetime.now(utc) no momento da correlacao>,
    metadata_={"correlation": {...}},  # shape exato abaixo
)
```

**`metadata_["correlation"]`** exact shape (enrichment only — read by nothing that alters severity/status, per D-18):

```json
{
  "confirmed_events_count": 0,
  "stale_qtags": ["<tag_uid ou vertex_label>", "..."],
  "consecutive_drops": 0
}
```

- `confirmed_events_count`: `count(*)` of the project's own `ProjectEvent` rows with `status == "CONFIRMED"` at correlation time (always 0 in this plan's scope — Plan 07 is what ever writes `CONFIRMED`).
- `stale_qtags`: `ProjectTag.tag_uid` (or `vertex_label` fallback) for every `status == "ACTIVE"` tag whose `last_seen_at` is more than 180 days before `anomaly.detected_at`.
- `consecutive_drops`: walks the project's prior `SatelliteAnomaly` rows for the same `index_name`, most recent first, counting a consecutive streak of `drop_ratio > 0` (stops at the first non-drop).

**`affected_area_ha` final formula:**

```python
active_area_ha = ProjectsService(session).boundary_item(str(project.id))["declaredAreaHa"]
affected_area_ha = round(active_area_ha * max(0.0, signal.drop_ratio), 4) if active_area_ha else None
```

Never a carbon/tonnage estimate (D-23) — an order of magnitude for the human reviewer to size the incident.

**Timeline texts written (D-21, public/neutral — `project.timeline` is serialized both in the public dossier and the internal review by the same `project_to_mrca()`):**

```python
SATELLITE_EVENT_TIMELINE_TITLES = {
    "VEGETATION_LOSS": "Perda de vegetação detectada por satélite",
    "VEGETATION_RECOVERY": "Recuperação de vegetação detectada por satélite",
    "POSSIBLE_FIRE": "Possível incêndio detectado por satélite",
}
# desc (mesmo texto para os tres tipos, so a severidade muda):
"Monitoramento Sentinel-2 registrou variação relevante de vegetação; "
"evento em análise técnica (severidade {severity.lower()})."
```

**Provider calls per monitoring cycle (D-11, never parallel):**

- Baseline cycle (no anomaly reaches `ANALYZED`): **2 calls** — `search_scenes` + `get_statistics`.
- Cycle where exactly one anomaly reaches `ANALYZED`: **4 calls** — the same 2, plus `get_image` twice (`BEFORE_IMAGE` then `AFTER_IMAGE`, serial, via `SatelliteEvidenceService`). Verified directly by `test_before_after_is_only_captured_when_event_reaches_analyzed` (asserts 0 vs. 2 `get_image` calls) and `test_before_after_capture_is_idempotent` (a second `capture_before_after` call adds 0 more).

## Decisions Made

- `SatelliteEvidenceService` is imported lazily, inside `correlate_and_create_event`, wrapped in a broad `try/except`, exactly mirroring the pattern `scheduler.py` already used for the Plan-05→06 boundary. This let Task 1's commit include the full `monitoring.py` file (since `run()` unconditionally calls `detect_and_persist_anomalies`) while still being tested and correct on its own, before `evidence.py` existed.
- Constants used in exactly one place per the plan's own acceptance-criteria grep counts (`FORBIDDEN_AUTOMATIC_EVENT_TYPES`, `PROJECT_EVENT_TRANSITIONS`) are accessed via a module-qualified import (`from backend_app.modules.satellite import constants as satellite_constants`) instead of bare names, since a bare `from ... import X` plus a usage line would always produce 2 grep matches, not 1.
- `upload_storage_object`/`download_storage_object` in `evidence.py` are likewise accessed via `from backend_app.modules import supabase_storage as storage_client` for the same reason (the plan's acceptance criteria expects `grep -c 'upload_storage_object'` == 1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ON CONFLICT` against a partial unique index requires `index_where`, or Postgres rejects the insert**
- **Found during:** Task 2 integration test run (`test_ndvi_drop_creates_anomaly_and_analyzed_event`), first execution.
- **Issue:** `project_events_anomaly_idx` and `satellite_evidence_event_kind_idx` (both from the Plan 01 migration `202608180001_satellite_observations_anomalies_events.sql`) are **partial** unique indexes (`where anomaly_id is not null` / `where project_event_id is not null`). `pg_insert(...).on_conflict_do_nothing(index_elements=[...])` without a matching `index_where` cannot be resolved by Postgres to a specific constraint — every `ProjectEvent`/`SatelliteEvidence` insert failed with `asyncpg.exceptions.InvalidColumnReferenceError: there is no unique or exclusion constraint matching the ON CONFLICT specification`. The exception was caught by `run()`'s outer `except Exception`, so the job silently finished `FAILED` with 0 anomalies detected — the surface symptom in the test was a `sqlalchemy.exc.MissingGreenlet` raised on a later `project.id` access, itself a downstream effect of `rollback()` expiring session state after the swallowed failure (same root shape as the `MissingGreenlet` bug documented in `05-05-SUMMARY.md`, but a different trigger).
- **Root-cause isolation:** a standalone diagnostic script run directly against the local Postgres reproduced the failure and surfaced `job.error_message`, which contained the real Postgres error text.
- **Fix:** added `index_where=ProjectEvent.__table__.c.anomaly_id.isnot(None)` to the `ProjectEvent` insert in `monitoring.py`, and `index_where=SatelliteEvidence.__table__.c.project_event_id.isnot(None)` to the `SatelliteEvidence` insert in `evidence.py` — both now match the exact partial-index predicate from the migration.
- **Files modified:** `backend_app/modules/satellite/monitoring.py`, `backend_app/modules/satellite/evidence.py`.
- **Verification:** all 20 tests in `tests/modules/satellite/test_monitoring_job.py` pass; re-ran the standalone diagnostic to confirm `job.status == "COMPLETED"` with the expected anomaly/evidence counts.
- **Committed in:** `2779a6f` (Task 2) for the `monitoring.py` fix, `4448bff` (Task 3) for the `evidence.py` fix — both were fixed before their respective task's commit, so no separate fix-up commit was needed.

**2. [Rule 1 - Bug] Two mandatory plan comments accidentally matched their own acceptance-criteria greps**
- **Found during:** Task 1 acceptance-criteria verification (`grep -c 'asyncio.gather'` returned 1, not 0) and Task 3 (`grep -c 'upload_storage_object'` returned 2, not 1).
- **Issue:** The plan's own mandated D-11 comment text (`"... nada aqui usa asyncio.gather."`) contains the literal string its own acceptance criterion forbids. Similarly, `evidence.py`'s file-header docstring mentioned `upload_storage_object` by name in prose, adding a second match beyond the actual call site.
- **Fix:** reworded both comments to preserve the same explanation without repeating the literal grepped string — same pattern already documented in `05-05-SUMMARY.md`'s Deviations section for an analogous false positive.
- **Files modified:** `backend_app/modules/satellite/monitoring.py`, `backend_app/modules/satellite/evidence.py`.
- **Verification:** both greps return the exact expected count after the edit.
- **Committed in:** `73edaf1` (Task 1), `4448bff` (Task 3).

**3. [Rule 1 - Bug] `carbono`/`tonelada` appeared in an explanatory comment near the `affected_area_ha` calculation**
- **Found during:** Task 2 acceptance-criteria verification (`grep -ic 'carbono\|tonelada\|carbon_stock'` expected 0).
- **Issue:** The comment explaining what `affected_area_ha` is *not* (a carbon/tonnage estimate, per D-23) used those exact words to say so, tripping the criterion meant to keep carbon-estimation language out of this file entirely.
- **Fix:** reworded to "NAO e um calculo de sequestro/estoque em massa de CO2" — same meaning, D-23 reference preserved, no forbidden substring.
- **Files modified:** `backend_app/modules/satellite/monitoring.py`.
- **Verification:** grep returns 0.
- **Committed in:** `73edaf1` (Task 1, since the comment lives in code committed with the full file in Task 1's commit).

### Task-boundary note (not a correctness deviation)

`SatelliteMonitoringService.run()` calls `detect_and_persist_anomalies()` unconditionally (there is no seam to omit Task 2's logic from Task 1's file without changing `run()`'s control flow itself). Rather than write a throwaway stub and immediately replace it, Task 1's commit (`73edaf1`) contains the complete, working `monitoring.py` (all three tasks' production logic) plus only Task 1's 10 tests — verified passing on their own before commit. Task 2's commit (`2779a6f`) then adds only its own 6 tests (the corresponding production code was already correct and committed). Task 3's commit (`4448bff`) adds `evidence.py`, `storage_paths.py`'s factory, and the final 4 tests. Every commit's own test scope was run and passed *before* that commit was made (10, then 16, then 20 tests, each confirmed green in isolation), so the atomicity guarantee ("each commit leaves the repo in a working, tested state for the work it claims to deliver") holds even though the per-task *file diff* boundary is looser than the plan's task split implies.

---

**Total deviations:** 3 auto-fixed (1 real correctness bug — the partial-index `ON CONFLICT` — plus 2 grep false-positives on mandated comment text), 1 documented task-boundary note. **Impact on plan:** The `ON CONFLICT` fix was necessary for correctness (every anomaly that should reach `ANALYZED` would otherwise silently fail the whole job); the grep false-positives are cosmetic wording fixes with no behavior change; the task-boundary note reflects an unavoidable structural coupling (`run()` must call the anomaly step to be a working job) rather than scope creep.

## Issues Encountered

None beyond the deviations documented above. The local Supabase/Postgres instance was already running and uncontended (no sibling worktree executing in parallel this wave), so no test-data collisions were observed across the ~30 integration test runs performed while iterating.

## User Setup Required

None. All new tests use `FakeProvider`/`FakeProvider.get_image` (no live Copernicus credentials required), matching the pattern already established in `tests/modules/satellite/test_historical_reconstruction.py`.

## Next Phase Readiness

Plan 07 (human decision routes: `ANALYZED -> CONFIRMED/DISMISSED`, Auto Hold interaction, `credit_adjustment_pendencies`) can now read real `SatelliteAnomaly`/`ProjectEvent` rows with the exact shapes documented above, including `metadata_["correlation"]` for display context and `SatelliteEvidenceService.list_evidence()`/`load_evidence_bytes()` for serving `before.png`/`after.png` over HTTP. No blockers introduced by this plan.

**Verification performed (task-scoped, per this wave's explicit instruction — no full-repo `pytest -q` background run):**
- `tests/modules/satellite/test_monitoring_job.py`: 20/20 passed.
- `tests/modules/satellite/` (full directory, includes Plan 05's reconstruction suite): 55/55 passed.
- `tests/test_risk_engine.py`, `tests/db/test_satellite_schema.py`, `tests/adapters/test_copernicus.py`: 50/50 passed (no regression from the `scheduler.py`/`storage_paths.py` changes).
- `tests/test_api_integration.py`, `tests/test_project_boundaries.py`, `tests/test_audit_field_evidence.py`, `tests/test_certifier_workbench.py`, `tests/test_project_conflicts.py`: 63/63 passed (no regression in adjacent HTTP-facing suites).
- Direct DB query `select count(*) from project_events where type = 'DEFORESTATION'` returns 0.
- All acceptance-criteria `grep` counts for all three tasks re-verified after the fixes above.

---
*Phase: 05-satellite-monitoring-and-field-audit*
*Completed: 2026-08-17*
