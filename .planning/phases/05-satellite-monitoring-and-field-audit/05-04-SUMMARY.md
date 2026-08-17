---
phase: 05-satellite-monitoring-and-field-audit
plan: 04
subsystem: integrity-risk
tags: [anomaly-detection, risk-engine, auto-hold, pure-function]

# Dependency graph
requires:
  - phase: 05-01
    provides: "satellite domain constants/thresholds in Settings (NDVI drop threshold, etc.)"
provides:
  - "backend_app/modules/satellite/anomaly_detector.py: detect_anomaly (pure fn), ObservationSnapshot/AnomalySignal DTOs — never emits DEFORESTATION"
  - "backend_app/modules/integrity/risk_engine.py: third signal bucket SATELLITE_ANOMALY_CONFIRMED_CRITICAL/HIGH from ProjectEventSnapshot"
  - "backend_app/modules/integrity/service.py: recalculate_risk_score gains a fourth query reading CONFIRMED project_events (excludes cleared_at)"
affects: [05-06, 05-07, 05-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure module discipline for anomaly_detector.py: no DB/HTTP imports, deterministic, tested without a database or event loop (mirrors risk_engine.py's existing pure-function contract from Phase 04.2)"
    - "Auto Hold reused unchanged: satellite anomalies feed a new risk signal into the existing single-writer Auto Hold (project.integrity_status), no second blocking mechanism introduced (D-20)"
    - "Cleared events (cleared_at set) stop counting as a risk signal automatically on next recalculation — no manual integrity_status write needed to lift a hold"

key-files:
  created:
    - backend_app/modules/satellite/anomaly_detector.py
    - tests/modules/satellite/test_anomaly_detector.py
  modified:
    - backend_app/modules/integrity/constants.py
    - backend_app/modules/integrity/risk_engine.py
    - backend_app/modules/integrity/service.py
    - tests/test_risk_engine.py

key-decisions:
  - "detect_anomaly classifies NDVI/NBR drops and recoveries into VEGETATION_LOSS/VEGETATION_RECOVERY/POSSIBLE_FIRE only — DEFORESTATION is excluded from the closed vocabulary and enforced with a runtime assertion, not just a docstring convention (D-17, SATM-06)."
  - "compute_signals gains a new parameter with an empty default so all existing callers (Phase 04.2 certification/claim/conflict flows) continue to work unmodified — confirmed via the pre-existing risk_engine contract test suite passing unchanged."
  - "recalculate_risk_score's fourth query reads only project_events with decision=CONFIRMED and cleared_at IS NULL — one signal per severity bucket (HIGH/CRITICAL), count carried in metadata, weight never doubled per event."

requirements-completed: [SATM-06, SATM-08]

# Metrics
duration: ~35min
completed: 2026-08-16
---

# Phase 05 Plan 04: Anomaly Detector + Risk Engine Wiring Summary

**Pure NDVI/NBR anomaly classifier (never `DEFORESTATION`) wired into the existing Phase 04.2 Risk Engine as a new explainable signal — confirmed HIGH/CRITICAL satellite anomalies feed the same Auto Hold mechanism already in production, no second blocking path introduced**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 (all completed)
- **Files modified/created:** 6 (2 created, 4 modified)

## Accomplishments

- `backend_app/modules/satellite/anomaly_detector.py` (172 lines): `detect_anomaly` is a pure function — `ObservationSnapshot` in, `AnomalySignal | None` out, all thresholds read from `Settings` (never hardcoded), deterministic and testable with zero DB/event-loop dependency. Classifies NDVI drops as `VEGETATION_LOSS`, NDVI recoveries as `VEGETATION_RECOVERY`, and NBR-flagged burn signatures as `POSSIBLE_FIRE`. A runtime assertion on the closed vocabulary guarantees `DEFORESTATION` can never be emitted, satisfying the Bible's "satellite signal != confirmed event" rule structurally, not just by convention.
- `tests/modules/satellite/test_anomaly_detector.py`: 20 tests, all passing, no database or asyncio required.
- `backend_app/modules/integrity/risk_engine.py`: extended `compute_signals` with a third bucket — `ProjectEventSnapshot` in, up to two new signals out (`SATELLITE_ANOMALY_CONFIRMED_CRITICAL` / `SATELLITE_ANOMALY_CONFIRMED_HIGH`, one per severity present, event count carried in signal metadata). New parameter defaults to empty so every existing caller from Phase 04.2 (certification, claim, conflict recalculation) keeps working with zero code changes on their side.
- `backend_app/modules/integrity/service.py`: `recalculate_risk_score` gains a fourth query — reads only `project_events` where `decision = 'CONFIRMED'` and `cleared_at IS NULL`. An event that gets cleared (auditor/certificadora review, D-22) stops counting as a risk signal on the very next recalculation, so Auto Hold lifts without anyone writing `integrity_status` by hand.
- `backend_app/modules/integrity/constants.py`: added the two new signal codes and their configurable weights, same pattern as the existing D-10/D-13 threshold constants from Phase 04.2.
- `tests/test_risk_engine.py`: extended with satellite-specific cases (10 of them, per the plan's own count) — confirms the new signal both fires and clears correctly, and that the pre-existing 04.2 contract tests are unaffected.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure anomaly detector (SATM-06, D-17)** - `db385b6` (feat)
2. **Task 2: Wire confirmed satellite anomalies into Risk Engine (D-20)** - `b4f6bde` (feat)

## Files Created/Modified
- `backend_app/modules/satellite/anomaly_detector.py` - pure `detect_anomaly`, `ObservationSnapshot`/`AnomalySignal` DTOs
- `tests/modules/satellite/test_anomaly_detector.py` - 20 tests, no DB
- `backend_app/modules/integrity/constants.py` - new signal codes + weights
- `backend_app/modules/integrity/risk_engine.py` - third `compute_signals` bucket
- `backend_app/modules/integrity/service.py` - fourth query in `recalculate_risk_score`
- `tests/test_risk_engine.py` - 10 new satellite-signal cases, existing suite unaffected

## Verification Evidence

Verified individually inside this plan's own worktree before merge (full-repo suite was not re-run here — see note below):
- `tests/modules/satellite/test_anomaly_detector.py`: 20/20 passed
- `tests/test_risk_engine.py`: 29/29 passed (10 satellite-specific + 19 pre-existing Phase 04.2 cases, all still green)
- `tests/` integrity/risk contract subset: 11/11 passed
- All plan `<acceptance_criteria>` greps for both tasks passed

## Decisions Made
- No second blocking mechanism: confirmed satellite anomalies participate in the existing single-writer Auto Hold via a new risk signal only — `project.integrity_status` is still written exclusively by the Phase 04.2 Auto Hold code path (D-20 honored structurally).
- `compute_signals`'s new parameter is additive with an empty default specifically to avoid touching any of the 04.2-era call sites — verified by running the pre-existing risk-engine test suite unmodified and green.

## Issues Encountered

**Full-repo `uv run pytest -q` was not completed inside this worktree before merge.** This wave ran two parallel executors (05-03 and 05-04) against the same shared local Supabase/Postgres instance; repeated full-suite runs inside each isolated worktree produced non-deterministic unrelated failures (`UniqueViolationError` on `projects_friendly_id_key` and similar) consistent with concurrent test data collisions between the two sibling agents, not real regressions from either plan's own changes (this plan touches zero files under `backend_app/db/` or any table-seeding path). This plan's own scope (`tests/modules/satellite/test_anomaly_detector.py` + `tests/test_risk_engine.py`) is fully green in isolation. Per the orchestrator's explicit instruction, the full-suite re-verification is deferred to the orchestrator's post-merge gate (step 5.6 of execute-phase.md), which runs once against a clean, uncontended database after both wave-2 worktrees merge back to main.

## User Setup Required

None.

## Next Phase Readiness

`detect_anomaly` is ready to be called from the monitoring job (Plan 06) once real `SatelliteObservation` rows exist. The Risk Engine's new signal is ready to receive real `CONFIRMED` `project_events` once the human-decision endpoint (Plan 07) starts writing them. No blockers introduced by this plan.

---
*Phase: 05-satellite-monitoring-and-field-audit*
*Completed: 2026-08-16*
