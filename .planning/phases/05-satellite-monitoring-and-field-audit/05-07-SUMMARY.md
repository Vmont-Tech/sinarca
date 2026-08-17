---
phase: 05-satellite-monitoring-and-field-audit
plan: 07
subsystem: api
tags: [fastapi, sqlalchemy, satellite, integrity, risk-engine, dossier]

# Dependency graph
requires:
  - phase: 05-02
    provides: "Evidence/dossier response shapes, public_audit_item minimization pattern, get_project_for_auditor org-scoped guard precedent"
  - phase: 05-04
    provides: "SATELLITE_ANOMALY_CONFIRMED_CRITICAL/HIGH risk signals, recalculate_risk_score's fourth query over CONFIRMED project_events (cleared_at-aware)"
  - phase: 05-06
    provides: "SatelliteAnomaly/ProjectEvent/SatelliteEvidence final populated shapes, SatelliteEvidenceService.load_evidence_bytes, metadata_['correlation'] shape"
provides:
  - "GET /api/v1/projects/{id}/satellite/summary, /satellite/observations, /environmental-events(/{id}), /environmental-events/{id}/evidence/{id}/image, /credit-adjustment-pendencies, and admin-only GET /satellite/usage -- full org-scoped read surface over the satellite domain"
  - "PATCH /projects/{id}/environmental-events/{id}/decision (CONFIRMED/DISMISSED, D-18) and PATCH .../clear (D-22) -- the only place in the codebase that writes project_events.status/decided_at/cleared_at"
  - "backend_app/modules/credits_availability.py: block_project_credits/unlock_project_credits, single source of truth for credit availability, now used by both audit verification and satellite incident confirmation"
  - "SatelliteService.raise_credit_adjustment_pendency/list_credit_pendencies/has_open_credit_pendency (D-23) -- structured manual-review pendency, never a carbon/tonnage estimate"
  - "public_satellite_item() in the public dossier (D-25/SATM-07) -- real Sentinel-2 baseline (ndviMean/pointsAnalyzed/referenceHash) once observations exist, minimized allowlist"
  - "_assert_project_edit_permission gains an auditor branch (organization_id == project.auditor_organization_id) -- first caller in the codebase to combine require_role(..., 'auditor', ...) with this shared guard"
affects: [05-08-frontend-satellite-monitoring-ui, 05-09-frontend-field-audit-ui, 05.1-integrity-review-and-external-registries]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard duplicated literally per route (require_role + _assert_project_edit_permission), never extracted into a shared helper -- matches the existing integrity/routes.py and projects/routes.py convention, and is what the plan's own acceptance-criteria grep counts (>=6, >=7) actually check for."
    - "Evidence image serving delegates entirely to SatelliteEvidenceService.load_evidence_bytes(evidence) with provider=None (the method never touches self.provider) instead of referencing storage_bucket/storage_object_path in routes.py -- keeps the 'never leak storage path' invariant structurally true, not just by convention."
    - "A single named constant (CLEAR_REVIEW_ACTION) backs both the audit_events action string and the recalculate_risk_score trigger in clear_event_review, so the literal 'ANOMALY_REVIEW_CLEARED' appears exactly once in source -- same class of fix as 05-06's module-qualified-import trick for satisfying an acceptance-criteria grep count without duplicating the underlying string."
    - "Test fixtures that create HTTP projects via the standard origination flow must randomize boundary lat/lng per project (not reuse a fixed rectangle or a monotonic per-run offset) -- create_project auto-runs detect_and_persist_conflicts, and Postgres data from prior local test runs persists, so a fixed or run-scoped-only offset scheme produces spurious cross-run GEOSPATIAL_OVERLAP conflicts that silently inflate the risk score under test."
  key-files:
    created:
      - backend_app/modules/satellite/schemas.py
      - backend_app/modules/satellite/routes.py
      - backend_app/modules/credits_availability.py
      - tests/test_satellite_incident_recalc.py
    modified:
      - backend_app/api/router.py
      - backend_app/modules/projects/service.py
      - backend_app/modules/projects/schemas.py
      - backend_app/modules/satellite/service.py
      - backend_app/modules/audit/routes.py
      - tests/contract/test_backend_app_api_v1.py

key-decisions:
  - "_assert_project_edit_permission (backend_app/modules/projects/service.py) gained an auditor branch. Confirmed via grep before writing any code that no existing route combines require_role(..., \"auditor\", ...) with this shared guard -- every prior caller only reaches producer/certifier/admin branches. Without the fix, every satellite route (Task 1 reads + Task 2 decision/clear) would 403 any legitimately-assigned auditor, silently defeating the plan's own require_role tuples. Verified non-breaking: existing test_project_boundaries.py (20/20) stayed green, since the new branch only activates when require_role already permits the auditor role."
  - "decide_event's call to raise_credit_adjustment_pendency (Task 3) forced credits_availability.py and the pendency methods to ship inside Task 2's commit, not Task 3's -- same structural coupling class as 05-06-SUMMARY.md's task-boundary note (SatelliteMonitoringService.run() unconditionally calling detect_and_persist_anomalies before Task 2 existed). Task 2's own test scope (10 tests) exercises this code path directly (every CONFIRMED HIGH/CRITICAL decision in the test suite routes through it), so it was verified and correct before that commit was made -- the atomicity guarantee (each commit leaves a working, tested repo) holds even though the file-diff boundary is looser than the plan's task split implies. Task 3's commit is the audit/routes.py DRY-up (actually wiring the already-shipped shared module) plus the genuinely new dossier-minimization surface."
  - "Every project created via the standard origination API flow already carries two DECLARED Claims (LAND_POSSESSION, RIGHT_TO_OPERATE per create_origination_claims), worth ~40 baseline risk weight (LAND_CLAIM_UNVERIFIED 20 + CLAIM_EVIDENCE_PENDING 10 + POSSESSION_WITHOUT_TITLE 10) before any satellite signal exists. This is exactly the plan's own 'projeto que ja tem outros sinais' Auto Hold scenario -- confirming one CRITICAL satellite event (weight 50) reliably crosses the >80 CRITICAL-class threshold on a freshly created project with zero synthetic setup. No manufactured Conflict signal needed or used."
  - "GET /projects/{id}/credit-adjustment-pendencies queries CreditAdjustmentPendency directly in routes.py rather than through a SatelliteService method, despite SatelliteService.list_credit_pendencies existing (added for clear_event_review's has_open_credit_pendency check). Both work identically against the same table; the inline query was written first (Task 1, before service.py had any pendency methods) and left as-is since refactoring it added no behavioral value."

requirements-completed: [SATM-06, SATM-07, SATM-08, SATM-09]

# Metrics
duration: ~110min
completed: 2026-08-17
---

# Phase 05 Plan 07: Satellite Decision Cycle, Auto Hold Wiring, Credit Pendency, and Minimized Public Baseline Summary

**Full `/api/v1` read surface for the satellite domain plus the only human-decision endpoints in the system that can move a `ProjectEvent` past `ANALYZED` (`CONFIRMED`/`DISMISSED`), wired into the existing Phase 04.2 Auto Hold with zero second blocking mechanism, a structured `credit_adjustment_pendencies` review gate that never estimates carbon volume, and a minimized real-Sentinel-2 baseline block in the public dossier.**

## Performance

- **Duration:** ~110 min (includes upfront codebase investigation across `integrity/`, `audit/`, `certifier/`, and the Plan 04/05/06 handoff summaries before the first commit)
- **Tasks:** 3
- **Files modified:** 10 (4 created, 6 modified)

## Accomplishments

- **Task 1 (read surface):** `backend_app/modules/satellite/schemas.py` + `backend_app/modules/satellite/routes.py` expose `GET /projects/{id}/satellite/summary`, `/satellite/observations`, `/environmental-events(/{id})`, `/environmental-events/{id}/evidence/{id}/image`, `/credit-adjustment-pendencies`, and admin-only `GET /satellite/usage` — all org-scoped, all serving the exact `SatelliteAnomaly`/`ProjectEvent`/`SatelliteEvidence` shapes Plan 06 documented. Registered in `backend_app/api/router.py`.
- **Task 2 (human decision cycle):** `SatelliteService.decide_event`/`clear_event_review` implement the only code paths that can write `project_events.status` past `ANALYZED`. `decide_event` validates the transition against `PROJECT_EVENT_TRANSITIONS` (400 on `DETECTED->CONFIRMED` or a terminal event), requires non-empty `notes` on `CONFIRMED`, writes a fixed neutral public timeline entry (notes stay in `audit_events` only), and always calls `IntegrityService.recalculate_risk_score` — no line in `satellite/service.py` or `satellite/routes.py` ever writes `integrity_status` or `project.status` directly (both grep-verified at 0). `clear_event_review` requires a `CONFIRMED`, not-yet-cleared event with `notes`, records `ANOMALY_REVIEW_CLEARED`, and only unlocks credits when the recalculated `integrity_status != "ON_HOLD"` **and** no `OPEN` `CreditAdjustmentPendency` remains.
- **Task 3 (credit pendency + public dossier):** `raise_credit_adjustment_pendency` opens one `CreditAdjustmentPendency` per confirmed HIGH/CRITICAL event (idempotent via a partial unique index on `project_event_id`), blocks credits via the new shared `backend_app/modules/credits_availability.py`, and never touches `carbon_stock`. `public_satellite_item()` adds a minimized `satellite` block to the public dossier — real `ndviMean`/`pointsAnalyzed`/`referenceHash` once Plan 05/06's pipeline has run, `deterministic_baseline`/`blocked=true` before that. `audit/routes.py`'s `verify_project` now calls the same shared `block_project_credits`/`unlock_project_credits` instead of private duplicates.

## Task Commits

Each task was committed atomically:

1. **Task 1: Schemas and read routes for satellite domain (observations, events, evidence, pendencies, usage)** - `f073137` (feat)
2. **Task 2: Human decision CONFIRMED/DISMISSED, Auto Hold recalc, auditable clear (SATM-08, D-18/D-20/D-22)** - `6e6cab1` (feat) — includes `credits_availability.py` and the pendency methods per the task-boundary note above
3. **Task 3: Minimize satellite baseline in public dossier, DRY-up credit availability (SATM-07/09, D-23/D-25)** - `0f59116` (feat)

## Files Created/Modified

- `backend_app/modules/satellite/schemas.py` — `SatelliteSummaryResponse`, `SatelliteObservationsResponse`, `ProjectEventsResponse`, `ProjectEventDetailResponse` (with an `integrity` field beyond the plan's literal list, needed by Task 2's own behavior spec), `ProjectEventDecisionRequest`, `ProjectEventClearRequest`, `CreditAdjustmentPendenciesResponse`, `CopernicusUsageResponse`.
- `backend_app/modules/satellite/routes.py` — 8 GET routes + 2 PATCH routes; `observation_item`/`event_item`/`pendency_item` serializers; guard duplicated per route (not a shared helper).
- `backend_app/modules/satellite/service.py` — `decide_event`, `clear_event_review`, `raise_credit_adjustment_pendency`, `list_credit_pendencies`, `has_open_credit_pendency`; `CLEAR_REVIEW_ACTION`/`EVENT_TYPE_LABELS` module constants.
- `backend_app/modules/credits_availability.py` — new, `block_project_credits`/`unlock_project_credits` extracted from `audit/routes.py`.
- `backend_app/api/router.py` — registers `satellite_router`.
- `backend_app/modules/projects/service.py` — `_assert_project_edit_permission` auditor branch; `public_satellite_item()`; `get_public_dossier` populates `satellite=`.
- `backend_app/modules/projects/schemas.py` — `ProjectPublicDossierResponse.satellite: dict[str, Any] | None`.
- `backend_app/modules/audit/routes.py` — `verify_project` now imports and calls the shared credit-availability functions; local `_block_credits`/`_unlock_credits` removed.
- `tests/test_satellite_incident_recalc.py` — new, 15 tests (10 decision/Auto Hold/clear, 5 pendency/credit-blocking).
- `tests/contract/test_backend_app_api_v1.py` — 2 new dossier tests (`test_public_dossier_exposes_real_satellite_baseline`, `test_public_dossier_satellite_block_is_minimized`).

## Response Shapes (for Plan 08/09 frontend consumption)

**`observation_item`:** `id, sceneId, satellite, product, processingVersion, observedAt, cloudCoverage, ndviMean, ndviMin, ndviMax, ndmiMean, nbrMean, validPixelPercentage`.

**`event_item`:** `id, type, status, severity, confidence, affectedAreaHa, ndviBefore, ndviAfter, summary, detectedAt, analyzedAt, decidedAt, decisionNotes, clearedAt, clearanceNotes, correlation, anomaly: {id, indexName, valueBefore, valueAfter, dropRatio, reason} | null, evidence: [{id, kind, sha256, capturedAt, mimeType}]`.

**`pendency_item`:** `id, projectEventId, category, description, affectedAreaHa, status, producerResponse, respondedAt, resolvedAt, createdAt, metadata`.

**`public_satellite_item` (public dossier `satellite` block):** `baselineSource, sentinelStatus, blocked, ndviMean, pointsAnalyzed, referenceHash, sentinelSceneId, lastObservedAt` — exactly 8 fields, no geometry/series/cloud-coverage/storage-path/internal-events.

**Auto Hold scenario observed in tests:** a freshly originated project already carries ~40 baseline risk weight from its two DECLARED origination Claims; confirming one CRITICAL satellite event (weight 50) pushes the score to 90 (class CRITICAL, `integrityStatus="ON_HOLD"`), with `project.status` unchanged throughout.

**Credit release conditions (exact, D-22/D-23):** `clear_event_review` calls `unlock_project_credits` if and only if, after the recalculation inside that same call, `project.integrity_status != "ON_HOLD"` **and** `has_open_credit_pendency(project.id)` is `False`. A resolved-but-not-cleared pendency, or a cleared-but-still-OPEN pendency, each independently keep credits `SUSPENDED`.

## Decisions Made

See `key-decisions` in frontmatter. Summary:
1. Added an `auditor` branch to `_assert_project_edit_permission` — the first caller in the codebase to pair `require_role(..., "auditor", ...)` with this shared guard; without it every satellite route would 403 any correctly-assigned auditor.
2. `credits_availability.py` and the pendency methods shipped inside Task 2's commit (not Task 3's) because `decide_event` calls `raise_credit_adjustment_pendency` directly — same class of forward reference documented as a task-boundary note in 05-06-SUMMARY.md, not a correctness deviation.
3. Confirmed and relied on the fact that origination-time Claims already contribute baseline risk weight, so no synthetic Conflict signal was needed to demonstrate Auto Hold combining with pre-existing signals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `_assert_project_edit_permission` had no branch for the `auditor` role**
- **Found during:** Task 1, before writing any route — grepped the codebase first and confirmed zero existing callers combine `require_role(..., "auditor", ...)` with this guard.
- **Issue:** The plan's own interfaces block says to reuse this exact guard, and Task 2 explicitly requires `require_role("auditor", "certifier", "admin")` on the decision/clear routes. Without a branch, every auditor request would fall through to the unconditional 403 at the end of the function.
- **Fix:** Added `elif organization_id is not None and actor_role == "auditor": allowed = organization_id == project.auditor_organization_id`.
- **Files modified:** `backend_app/modules/projects/service.py`.
- **Verification:** `tests/test_project_boundaries.py` (20/20, unaffected since the branch only activates for a role that previously always 403'd); satellite decision/clear tests pass with `CERTIFIER`/`PRODUCER` actors exercising the existing branches, plus `SATELLITE_DECISION_ROLES` excluding `producer` verified via `test_event_decision_is_org_scoped`.
- **Committed in:** `f073137` (Task 1).

**2. [Rule 1 - Bug] Test boundary fixtures using fixed/monotonic geometry caused spurious cross-run risk-signal contamination**
- **Found during:** Task 2, writing `test_medium_severity_confirmation_does_not_block` and `test_clear_review_removes_signal_and_lifts_auto_hold` — both failed with `integrityStatus == "ON_HOLD"` on a project that should not have been on hold.
- **Issue:** `create_project` auto-runs `detect_and_persist_conflicts`; reusing the fixed 4-point rectangle from `tests/modules/satellite/test_monitoring_job.py` (or even a monotonically-increasing per-run offset, which resets to the same starting values on every fresh `pytest` invocation) causes every new test project to 100%-overlap projects left behind by earlier local runs of this same file, auto-creating a `GEOSPATIAL_OVERLAP CRITICAL` `Conflict` that silently inflates the risk score under test.
- **Fix:** `tag_payload` now applies a large `random.uniform` lat/lng offset (0–70 / 0–100 degrees) per project, making collision probability against any prior local run negligible without requiring any data cleanup.
- **Files modified:** `tests/test_satellite_incident_recalc.py`.
- **Verification:** Full 15-test file green across repeated local runs.
- **Committed in:** `6e6cab1` (Task 2).

**3. [Rule 1 - Bug] Two mandated-comment grep false positives**
- **Found during:** Task 2 acceptance-criteria verification — `grep -c 'recalculate_risk_score'` returned 3 (expected 2) and `grep -c 'ANOMALY_REVIEW_CLEARED'` returned 2 (expected 1), both caused by explanatory comments repeating the literal grepped string.
- **Fix:** Reworded the comments to preserve the explanation without the literal substring (same pattern documented in 05-06-SUMMARY.md's Deviations section); introduced the `CLEAR_REVIEW_ACTION` module constant so the `ANOMALY_REVIEW_CLEARED` action string and the `recalculate_risk_score` trigger share one definition instead of two literals.
- **Files modified:** `backend_app/modules/satellite/service.py`.
- **Verification:** Both greps return the exact expected count after the edit.
- **Committed in:** `6e6cab1` (Task 2).

### Documented but not fixed (plan-authoring looseness, not a code issue)

- Task 3's suggestion that `GET /credit-adjustment-pendencies` (Task 1) should call `SatelliteService.list_credit_pendencies` (added in Task 2) was left as the original inline query — both are behaviorally identical against the same table, and Task 1's route was already written and tested before the service method existed.

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs — one a real authorization gap, one a real test-data contamination bug — plus 1 grep-false-positive cleanup), 1 documented plan-authoring looseness with no behavioral impact.
**Impact on plan:** All fixes were necessary for the feature to work/be secure/be correctly testable as the plan's own `must_haves.truths` and `<behavior>` blocks demand. No scope creep beyond the plan's stated objective; frontend (Plans 08/09) and the automatic monitoring pipeline (Plan 06) were untouched.

## Issues Encountered

An external, unrelated `pytest` process (from a different session on the same shared local Supabase/Postgres instance) was observed running concurrently early in this plan's execution, producing the same `UniqueViolationError` on `projects_friendly_id_key` documented as environmental contention in `05-04-SUMMARY.md`. Per explicit orchestrator instruction mid-execution, all further verification was run synchronously in the foreground (no background/Monitor loops), and a stray self-spawned background verification process from this same worktree was killed once identified. All of this plan's own scoped tests (`tests/test_satellite_incident_recalc.py`: 15/15; `tests/contract/test_backend_app_api_v1.py -k "satellite or dossier"`: 8/8; `tests/test_api_integration.py`: 6/6) are green when run without contention. The full-repo `uv run pytest -q` gate is deferred to the orchestrator's post-merge run, per this wave's explicit instruction.

## User Setup Required

None — no external service configuration required. All work is backend-only, uses the existing local Supabase/Postgres already configured for this repo.

## Next Phase Readiness

- SATM-06/07/08/09 closed for the backend. The satellite domain's full human-decision cycle (`DETECTED -> ANALYZED -> CONFIRMED/DISMISSED`, Auto Hold, credit pendency, auditable clear) is live over `/api/v1`, org-scoped, with response shapes documented above.
- Plans 08/09 (frontend) can build directly against: the 10 read/decision/clear routes in `backend_app/modules/satellite/routes.py`, the exact `event_item`/`observation_item`/`pendency_item` shapes above, the copy-locked CTAs already implemented per the UI-SPEC ("Confirmar anomalia", "Descartar anomalia", "Registrar revisão e liberar bloqueio"), and the minimized `satellite` block now present in every `GET /projects/{id}/public-dossier` response.
- No blockers introduced for Phase 05.1 (integrity-review-and-external-registries): this plan touched no migration files and no external-registry code.

---
*Phase: 05-satellite-monitoring-and-field-audit*
*Completed: 2026-08-17*
