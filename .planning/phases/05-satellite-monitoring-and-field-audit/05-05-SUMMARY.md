---
phase: 05-satellite-monitoring-and-field-audit
plan: 05
subsystem: infra
tags: [apscheduler, sqlalchemy, asyncio, fastapi-lifespan, postgres, copernicus]

# Dependency graph
requires:
  - phase: 05-01
    provides: "satellite_jobs/satellite_observations/copernicus_api_usage tables, ORM models, closed vocabulary constants, satellite_*/copernicus_* Settings thresholds"
  - phase: 05-03
    provides: "SatelliteProvider Protocol, CopernicusProvider (fail-closed, cached OAuth2, 2-request semaphore), build_copernicus_provider() factory"
  - phase: 05-04
    provides: "detect_anomaly pure function, Risk Engine SATELLITE_ANOMALY_CONFIRMED_* signal wired via project_events (consumed by Plan 06, not this plan)"
provides:
  - "backend_app/modules/satellite/service.py: SatelliteService — idempotent observation persistence, satellite_jobs lifecycle, baseline application (D-07), usage recorder (D-26)"
  - "backend_app/modules/satellite/historical_reconstruction.py: reconstruction_window/select_monthly_scenes/join_statistics_to_scenes pure functions + HistoricalReconstructionService.run()"
  - "backend_app/modules/satellite/scheduler.py: AsyncIOScheduler job registration, JOB_DISPATCH dict, run_pending_satellite_jobs, enqueue_due_monitoring_jobs"
  - "backend_app/main.py: first lifespan in the repo, starts/stops the satellite scheduler"
  - "create_project now enqueues HISTORICAL_RECONSTRUCTION without blocking the HTTP response"
affects: [05-06, 05-07, 05-08, 05-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First FastAPI lifespan in the repo (contextlib.asynccontextmanager over FastAPI(lifespan=...)), starts/stops AsyncIOScheduler"
    - "APScheduler jobs use max_instances=1 + coalesce=True to prevent same-process overlap; SELECT ... FOR UPDATE SKIP LOCKED in claim_next_jobs prevents cross-poller double-claim"
    - "Job dispatch as dict[str, Callable] keyed by job_type, so future job types register without touching the poller loop"
    - "Single CopernicusProvider instance shared across a whole poller cycle (cached OAuth2 token + 2-request semaphore only work if the instance is shared)"

key-files:
  created:
    - backend_app/modules/satellite/service.py
    - backend_app/modules/satellite/historical_reconstruction.py
    - backend_app/modules/satellite/scheduler.py
    - tests/modules/satellite/test_historical_reconstruction.py
  modified:
    - backend_app/main.py
    - backend_app/modules/projects/service.py
    - tests/conftest.py

key-decisions:
  - "Uvicorn production worker count CONFIRMED by direct read of Dockerfile.api (CMD has no --workers flag -> Uvicorn default = 1) and docker-compose.dokploy.yml (sinarca-api service has no deploy.replicas/scale -> Compose default = 1 replica). Not a blocker — proceeded with the in-process APScheduler design as planned."
  - "persist_observations inserts against SatelliteObservation.__table__ directly (Core insert, not ORM-enabled insert(<mapped class>)) to avoid ambiguity between SQLAlchemy 2.0's ORM-enabled DML (which would expect the Python attribute name metadata_) and Core DML (which expects the DB column name metadata) when combined with the Postgres-specific on_conflict_do_nothing()/returning()."
  - "All Numeric-column values passed through a _to_decimal() helper before insert/update — asyncpg's numeric codec requires Decimal, not float, matching the Decimal(str(...)) convention already used elsewhere in this codebase (e.g. ProjectBaseline in create_project)."
  - "HistoricalReconstructionService.run()'s except-block calls await self.session.refresh(job) immediately after await self.session.rollback(), before calling finish_job. rollback() expires every attribute on every object in the session; a plain attribute read afterward (job.project_id inside finish_job) triggers an implicit synchronous lazy-load that AsyncSession cannot perform outside a greenlet context (MissingGreenlet). refresh() is async-safe because it uses the already-known identity key rather than reading an expired attribute first."
  - "JOB_DISPATCH already registers a CONTINUOUS_MONITORING entry (fail-closed: marks the job FAILED with 'Tipo de job ainda não implementado' if backend_app/modules/satellite/monitoring.py does not import) so Plan 06 only needs to replace this dispatch function's body, not add a new dict key."

patterns-established:
  - "Pattern: async services doing multi-object writes (SatelliteService) never commit except at documented job-lifecycle boundaries (claim_next_jobs, finish_job) — mirrors IntegrityService's flush-not-commit discipline from Phase 04.2."
  - "Pattern: pure composition functions (reconstruction_window/select_monthly_scenes/join_statistics_to_scenes) live at module level, fully testable without a database or event loop, and the service class only orchestrates I/O + calls into them."

requirements-completed: [SATM-05, SATM-07, SATM-10]

# Metrics
duration: ~90min
completed: 2026-08-17
---

# Phase 05 Plan 05: Satellite Async Infrastructure Summary

**SatelliteService (idempotent observation persistence + job lifecycle + baseline application), HistoricalReconstructionService (5-year monthly composite reconstruction, fail-closed, idempotent), and the first FastAPI lifespan in the repo running an in-process APScheduler that lets create_project enqueue work without blocking the HTTP response — 27 new tests, all passing, zero regressions in the surrounding test files touched.**

## Performance

- **Duration:** ~90 min
- **Tasks:** 3 (all completed)
- **Files modified/created:** 7 (4 created, 3 modified)

## Accomplishments

- `backend_app/modules/satellite/service.py` (`SatelliteService`): `enqueue_job`/`claim_next_jobs`/`finish_job` for the `satellite_jobs` lifecycle (`claim_next_jobs` uses `SELECT ... FOR UPDATE SKIP LOCKED`), `persist_observations` with `on_conflict_do_nothing` over the D-15 unique index, `apply_baseline_from_observations` making `projects.metadata.baseline_source` point at `COPERNICUS` for the first time in the codebase (replacing `deterministic_baseline()` as the *displayed* source — the function itself is untouched, still used as the creation-time placeholder), and `usage_recorder_for`/`usage_summary` for D-26 consumption observability.
- `backend_app/modules/satellite/historical_reconstruction.py`: three pure, DB-free functions (`reconstruction_window`, `select_monthly_scenes`, `join_statistics_to_scenes`) plus `HistoricalReconstructionService.run()`, which calls the provider exactly twice per reconstruction (`search_scenes` + `get_statistics`, D-11) instead of looping 60 times monthly. Fails closed without `active_boundary` (never touches the provider) and fails closed on any provider exception (never persists simulated data).
- `backend_app/modules/satellite/scheduler.py`: `register_satellite_jobs` wires two `AsyncIOScheduler` jobs (`satellite_pending_jobs` poller, `satellite_monitoring_enqueue`) with `max_instances=1`/`coalesce=True`; `run_pending_satellite_jobs` claims jobs, builds **one** `CopernicusProvider` per cycle, and processes jobs **in series** (never `asyncio.gather`, per D-11 quota).
- `backend_app/main.py`: first `lifespan` in the repository (`FastAPI(lifespan=lifespan)`), starts the scheduler on startup and calls `scheduler.shutdown(wait=False)` on shutdown.
- `backend_app/modules/projects/service.py`: `create_project` now calls `SatelliteService(self.session).enqueue_job(project, job_type="HISTORICAL_RECONSTRUCTION")` right after `persist_project_boundary` — proven non-blocking by a monkeypatch that would explode if `build_copernicus_provider` were ever called during the request, plus a response-time assertion (< 5s).
- 27 new tests across 3 task commits, all passing; no regressions found in `tests/test_api_integration.py`, `tests/test_project_boundaries.py`, `tests/test_audit_field_evidence.py`, `tests/test_certifier_workbench.py`, `tests/test_project_conflicts.py`, `tests/modules/satellite/test_anomaly_detector.py`, `tests/db/test_satellite_schema.py`, `tests/adapters/test_copernicus.py`, or `tests/test_risk_engine.py` (all re-run in this worktree after the change).

## Task Commits

Each task was committed atomically:

1. **Task 1: SatelliteService — persistencia idempotente de observacao, ciclo de vida de satellite_jobs e usage recorder** - `3ea1e20` (feat)
2. **Task 2: HistoricalReconstructionService — 5 anos, composicao mensal por menor cloud cover (D-12/D-13/SATM-05)** - `bc876ca` (feat, TDD)
3. **Task 3: Scheduler APScheduler no lifespan do FastAPI e enfileiramento em create_project (D-14/SATM-10)** - `e0a6ce2` (feat)

## Files Created/Modified

- `backend_app/modules/satellite/service.py` - `SatelliteService`: job lifecycle, idempotent persistence, baseline application, usage recorder
- `backend_app/modules/satellite/historical_reconstruction.py` - pure composition functions + `HistoricalReconstructionService`
- `backend_app/modules/satellite/scheduler.py` - `register_satellite_jobs`, `run_pending_satellite_jobs`, `enqueue_due_monitoring_jobs`, `JOB_DISPATCH`
- `backend_app/main.py` - `lifespan` context manager starting/stopping the `AsyncIOScheduler`
- `backend_app/modules/projects/service.py` - `create_project` enqueues `HISTORICAL_RECONSTRUCTION` after boundary persistence
- `tests/conftest.py` - `SATELLITE_SCHEDULER_ENABLED=false` in the autouse fixture
- `tests/modules/satellite/test_historical_reconstruction.py` - 15 tests (7 pure-function, 8 integration against local Postgres) covering Task 2's `<behavior>` list, plus 3 more tests (Task 3) for the non-blocking enqueue contract — 18 tests total in this file

## Contract for Plans 06/07 — `SatelliteService` signatures

```python
class SatelliteService:
    def __init__(self, session: AsyncSession) -> None: ...
    async def enqueue_job(self, project: Project, *, job_type: str, window_start=None, window_end=None, metadata=None) -> SatelliteJob | None
    async def claim_next_jobs(self, *, limit: int) -> list[SatelliteJob]
    async def finish_job(self, job: SatelliteJob, *, status: str, observations_persisted: int = 0, anomalies_detected: int = 0, error_message: str | None = None) -> None
    async def persist_observations(self, project: Project, rows: Sequence[dict[str, Any]]) -> int
    async def latest_observation(self, project_id) -> SatelliteObservation | None
    async def list_observations(self, project_id, *, date_from=None, date_to=None, limit: int = 500) -> list[SatelliteObservation]
    async def apply_baseline_from_observations(self, project: Project) -> dict[str, Any] | None
    def usage_recorder_for(self, *, project_id=None, satellite_job_id=None) -> Callable[[CopernicusUsageRecord], Awaitable[None]]
    async def usage_summary(self, *, since: datetime | None = None) -> dict[str, Any]
```

## Scheduler dispatch dict (where Plan 06 registers `CONTINUOUS_MONITORING`)

`backend_app/modules/satellite/scheduler.py`:

```python
JOB_DISPATCH: dict[str, JobHandler] = {
    "HISTORICAL_RECONSTRUCTION": _dispatch_historical_reconstruction,
    "CONTINUOUS_MONITORING": _dispatch_continuous_monitoring,
}
```

`_dispatch_continuous_monitoring` already exists and currently fails closed (`ImportError` on `backend_app.modules.satellite.monitoring` → job marked `FAILED` with `"Tipo de job ainda não implementado"`). Plan 06 only needs to create `backend_app/modules/satellite/monitoring.py` with a `SatelliteMonitoringService(session, provider, settings).run(job)` — the `try/from backend_app.modules.satellite.monitoring import SatelliteMonitoringService` line in this dispatch function will then resolve and no other file in this plan needs to change.

## Uvicorn production worker count — CONFIRMED

Read directly (not inferred) before writing `scheduler.py`, per the plan's mandatory gate:

- `Dockerfile.api` line 23: `CMD ["uvicorn", "backend_app.main:app", "--host", "0.0.0.0", "--port", "5680"]` — **no `--workers` flag**, so the Uvicorn default of **1 worker** applies.
- `docker-compose.dokploy.yml`: the `sinarca-api` service declares no `deploy.replicas`/`scale` — Compose default is **1 replica**.

**Result: 1 worker confirmed in production.** This is not a blocker — the in-process `AsyncIOScheduler` design proceeds exactly as planned, with no duplication risk. The confirmation and its reasoning are also recorded as a comment directly above the `register_satellite_jobs` scheduler-registration code in `scheduler.py`, so future changes to worker count are visible next to the code that assumes 1.

## Reconstruction fixture observation counts (test evidence)

- `test_reconstruction_persists_sixty_monthly_observations`: 60 monthly `FakeProvider` scenes/statistics → **60** `satellite_observations` rows persisted, job `COMPLETED`.
- `test_reconstruction_is_idempotent_on_second_run`: first run of 12 monthly fixtures → **12** persisted; second run against the same 12 months → **0** new rows (idempotency via `on_conflict_do_nothing` over the D-15 unique index).
- `test_reconstruction_marks_baseline_source_as_copernicus`: 6 monthly fixtures → `projects.metadata.baseline_source == "COPERNICUS"` and `sentinel_status != "BLOCKED_MISSING_PROVIDER_CREDENTIALS"` confirmed after `run()`.
- `test_month_without_eligible_scene_is_never_interpolated`: a scene above `max_cloud_coverage` never produces a row for its month — proven at the pure-function level (`select_monthly_scenes`).

## Baseline hash formula (D-07/D-25 reference hash)

```python
baseline_hash = hashlib.sha256(
    f"{project.id}|{latest.scene_id}|{latest.processing_version}|{ndvi_mean}".encode()
).hexdigest()
```

Where `latest` is the most recently `observed_at` `SatelliteObservation` for the project and `ndvi_mean` is the arithmetic mean (rounded to 4 decimals) of all non-null `ndvi_mean` values across every persisted observation for that project. This is a hash of a **real observation**, never of the project name — collision on `baseline_hash` (the column's `unique` constraint) is treated as "already applied," so re-running the reconstruction never inserts a duplicate `ProjectBaseline` row.

## Decisions Made

- Uvicorn worker count gate resolved to 1 (see section above) — proceeded without introducing `SQLAlchemyJobStore`, exactly as the plan's conditional path specified.
- `persist_observations` targets `SatelliteObservation.__table__` (Core insert) rather than the ORM-mapped class, to avoid depending on SQLAlchemy 2.0's ORM-enabled-DML attribute-name resolution when combined with `sqlalchemy.dialects.postgresql.insert()` — this keeps `values()`/`index_elements`/`returning()` unambiguous regardless of dialect-specific insert semantics.
- All values written into `Numeric` columns (`SatelliteObservation.*`, `CopernicusApiUsage.processing_units`, `ProjectBaseline.ndvi_mean`/`vegetation_cover_pct`) pass through a `_to_decimal()` helper — asyncpg's numeric codec is strict about `Decimal` vs `float`, matching the existing `Decimal(str(...))` convention already used in `create_project`.
- `JOB_DISPATCH` already contains a `CONTINUOUS_MONITORING` key with a fail-closed handler, rather than leaving the key absent — this means Plan 06 modifies one function body instead of restructuring the dispatch dict.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `AsyncSession` attribute expiry after `rollback()` breaks `finish_job` in the exception path**
- **Found during:** Task 2 test run (`test_reconstruction_fails_closed_without_provider_credentials`)
- **Issue:** `HistoricalReconstructionService.run()`'s `except` block calls `await self.session.rollback()` per the plan's own action text, then calls `finish_job(job, ...)`. `rollback()` expires every attribute on every object attached to the session (not just the ones that changed). `finish_job` reads `job.project_id` for the audit event — that plain attribute read on an expired object triggers an implicit **synchronous** lazy-load, which `AsyncSession` cannot execute outside a greenlet context, raising `sqlalchemy.exc.MissingGreenlet`.
- **Fix:** Added `await self.session.refresh(job)` immediately after `rollback()` and before calling `finish_job`. `refresh()` is async-safe because it looks up the object's already-known identity key rather than reading an expired attribute first.
- **Files modified:** `backend_app/modules/satellite/historical_reconstruction.py`
- **Verification:** All 5 integration tests exercising the exception path pass; full `tests/modules/satellite/test_historical_reconstruction.py` suite green (15/15 after Task 2, 18/18 after Task 3).
- **Committed in:** `bc876ca` (Task 2 commit)

**2. [Rule 1 - Bug] Task 2's own integration tests broke once Task 3 added the `create_project` auto-enqueue hook**
- **Found during:** Task 3 test run, re-running `tests/modules/satellite/test_historical_reconstruction.py`
- **Issue:** 5 of Task 2's integration tests manually called `SatelliteService(session).enqueue_job(project, job_type="HISTORICAL_RECONSTRUCTION")` right after creating a project via the HTTP fixture — this was correct *only* while `create_project` did not yet auto-enqueue (true during Task 2). Once Task 3 wired the hook into `create_project`, the project already has an active `PENDING` job by the time the test calls `enqueue_job` again, so `enqueue_job` correctly returns `None` per its own dedup contract (`satellite_jobs_active_idx`) — and the tests, written against the old assumption, then tried to call `.run(None)`.
- **Fix:** Added a `_fetch_pending_job(session, project, job_type)` test helper that queries for the job `create_project` already enqueued, and updated the 4 affected tests (`test_reconstruction_persists_sixty_monthly_observations`, `test_reconstruction_fails_closed_without_provider_credentials`, `test_reconstruction_without_active_boundary_never_calls_provider`, `test_reconstruction_marks_baseline_source_as_copernicus`) plus the first half of `test_reconstruction_is_idempotent_on_second_run` to fetch the auto-enqueued job instead of re-enqueuing. `test_enqueue_is_idempotent_for_active_job` (a Task 3 test) directly asserts on this same auto-enqueue behavior and needed no fix.
- **Files modified:** `tests/modules/satellite/test_historical_reconstruction.py`
- **Verification:** Full file re-run: 18/18 passed.
- **Committed in:** `e0a6ce2` (Task 3 commit)

**3. [Rule 1 - Bug] Two acceptance-criteria greps false-positived on explanatory comments**
- **Found during:** Task 1 acceptance-criteria verification
- **Issue:** `grep -c 'skip_locked' backend_app/modules/satellite/service.py` matched both the actual `with_for_update(skip_locked=True)` call and a docstring line that also said `skip_locked=True`; `grep -c 'deterministic_baseline' backend_app/modules/satellite/service.py` matched both the real `SATELLITE_JOB_TYPES` guard logic (0 expected occurrences) and a docstring line naming the function it replaces.
- **Fix:** Reworded both comments to preserve the same explanation without repeating the literal grepped string (same pattern already documented in `05-03-SUMMARY.md`'s Deviations section).
- **Files modified:** `backend_app/modules/satellite/service.py`
- **Verification:** Both greps return the exact expected count after the edit; full acceptance-criteria set for Task 1 re-verified.
- **Committed in:** `3ea1e20` (Task 1 commit)

### Noted, not fixed

**4. `grep -c 'deterministic_baseline' backend_app/modules/projects/service.py` returns 4, plan expected 2**
- **Found during:** Task 3 acceptance-criteria verification
- **Issue:** The plan's acceptance criteria says this grep should return 2 ("definicao + a chamada existente em create_project"). The actual count is 4: the function definition (line ~1936), the existing call inside `create_project` (line ~853, untouched by this plan), and **two pre-existing string literals** inside `create_project`'s initial `metadata_` dict (`"baseline_adapter": "deterministic_baseline"` and `"baseline_source": "deterministic_baseline"`, lines ~895/898) that were already present in the codebase before this plan touched the file.
- **Why not fixed:** These two literals are legitimate placeholder values describing the creation-time baseline source before the async reconstruction completes — they are exactly the values `apply_baseline_from_observations` (Task 1) is designed to overwrite once the job succeeds. Rewording them to dodge the grep would be a cosmetic change to unrelated, working code, outside this task's declared file scope, for a single acceptance-criteria count that doesn't affect any behavior this plan verifies.
- **Files modified:** None.
- **Verification:** `git show 3bc9f10:backend_app/modules/projects/service.py | grep -c deterministic_baseline` confirms these two literals existed at the plan's base commit already.

---

**Total deviations:** 4 (3 auto-fixed — 2 real bugs found via the plan's own TDD verification loop, 1 grep false-positive; 1 noted-but-not-fixed acceptance-criteria mismatch pre-dating this plan). **Impact on plan:** Both auto-fixed bugs were genuine correctness issues (an `AsyncSession` misuse that would have crashed every failed-job path in production, and a test suite that would have been silently wrong about what it was testing) — no scope creep, both required for the plan's own acceptance criteria to hold. The one noted-but-not-fixed item is cosmetic and pre-existing.

## Issues Encountered

None beyond the deviations documented above. The full-repo `uv run pytest -q` was intentionally **not** run in this worktree, per the wave's explicit instruction — instead, this plan's own scope (`tests/modules/satellite/`, `tests/db/test_satellite_schema.py`, `tests/adapters/test_copernicus.py`, `tests/test_risk_engine.py` — 85 tests) plus every test file in the repo that exercises `POST /api/v1/projects` (`tests/test_api_integration.py`, `tests/test_project_boundaries.py`, `tests/test_audit_field_evidence.py`, `tests/test_certifier_workbench.py`, `tests/test_project_conflicts.py` — 63 more tests) were run directly in the foreground and are all green. The orchestrator's post-merge full-suite gate is the appropriate place for the final whole-repo confirmation.

## User Setup Required

None new. `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` remain the Plan 03 prerequisite (documented in `.planning/docs/providers/PHASE5-COPERNICUS-PROVIDER.md`) — this plan's code path is fully exercised via `FakeProvider` in tests and requires no live credentials to verify.

## Next Phase Readiness

`SatelliteService`, `HistoricalReconstructionService`, and the scheduler's `JOB_DISPATCH` dict are ready for Plan 06 (anomaly/event persistence + `CONTINUOUS_MONITORING` job type) and Plan 07 (HTTP routes exposing observations/jobs/usage summary). No blockers introduced by this plan. The Uvicorn worker-count gate is resolved (1 worker, confirmed) — no `SQLAlchemyJobStore` migration is required for this milestone.

---
*Phase: 05-satellite-monitoring-and-field-audit*
*Completed: 2026-08-17*
