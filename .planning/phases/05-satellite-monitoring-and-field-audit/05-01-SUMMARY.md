---
phase: 05-satellite-monitoring-and-field-audit
plan: 01
subsystem: database
tags: [postgres, sqlalchemy, supabase-migrations, apscheduler, httpx, pydantic-settings]

# Dependency graph
requires:
  - phase: 04.2-integrity-layer-foundation
    provides: risk engine / signal weighting pattern (integrity_risk_weight_* settings) mirrored here for satellite anomaly weights
provides:
  - "7 new operational tables: satellite_observations, satellite_anomalies, project_events, satellite_evidence, satellite_jobs, copernicus_api_usage, credit_adjustment_pendencies"
  - "7 corresponding SQLAlchemy ORM models in backend_app/db/models.py"
  - "backend_app/modules/satellite/constants.py — closed canonical vocabulary for the whole phase"
  - "satellite_* / copernicus_* threshold settings in backend_app/core/config.py (D-12/D-13/D-14/D-17)"
  - "httpx promoted to production dependency; APScheduler added"
  - "tests/db/test_satellite_schema.py — schema contract locked in test (10 tests)"
affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07, 05-08, 05-09]

# Tech tracking
tech-stack:
  added: ["APScheduler>=3.11,<4 (production dependency, in-process scheduler for D-14)"]
  patterns:
    - "text + check constraint for all domain vocabulary — never CREATE TYPE / Postgres ENUM (repo convention since Phase 04)"
    - "Operational internal tables: RLS enabled, DML revoked from anon/authenticated, zero SELECT policies — access only via backend_app org-scoped routes"

key-files:
  created:
    - backend_app/modules/satellite/__init__.py
    - backend_app/modules/satellite/constants.py
    - supabase/migrations/202608180001_satellite_observations_anomalies_events.sql
    - supabase/migrations/202608180002_satellite_jobs_copernicus_usage.sql
    - supabase/migrations/202608180003_credit_adjustment_pendencies.sql
    - tests/db/test_satellite_schema.py
  modified:
    - pyproject.toml
    - .env.example
    - backend_app/core/config.py
    - backend_app/db/models.py

key-decisions:
  - "httpx moved from [dependency-groups] dev to [project] dependencies — it is a production runtime dependency of the future Copernicus adapter (Plan 03), not just a test client."
  - "sentinelhub-py explicitly rejected per RESEARCH.md Alternatives Considered (drags numpy/shapely/pyproj/pillow/tifffile/requests into production and is synchronous)."
  - "COPERNICUS_CLIENT_ID/COPERNICUS_CLIENT_SECRET are NOT modeled in Settings — read via os.getenv in a future CopernicusAdapterConfig.from_env(), matching the fail-closed pattern already used by backend_app/adapters/stellar.py."
  - "project_events.type vocabulary is closed to VEGETATION_LOSS/VEGETATION_RECOVERY/POSSIBLE_FIRE; DEFORESTATION is never a valid value anywhere in schema, code, or tests (SATM-06), proven both by grep and by a live rejected INSERT against Postgres."

patterns-established:
  - "Pattern: SatelliteObservation idempotency key declared in the ORM via UniqueConstraint(name=<matching index name from migration>) so on_conflict_do_nothing(index_elements=[...]) works in later plans (D-15)."
  - "Pattern: satellite_jobs_active_idx is a partial unique index (WHERE status IN ('PENDING','PROCESSING')) enforcing at most one active job per (project_id, job_type) — Postgres-level dedup, not application locking."

requirements-completed: [SATM-05, SATM-06, SATM-09, SATM-10]

# Metrics
duration: ~35min
completed: 2026-08-17
---

# Phase 05 Plan 01: Satellite Monitoring Data Foundation Summary

**7 new operational tables (observations/anomalies/events/evidence/jobs/usage/credit-pendencies) applied to local Postgres via idempotent migrations, mirrored by SQLAlchemy models and a closed vocabulary module, with httpx promoted to production and APScheduler added for the in-process job scheduler.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 (all completed, Task 3 was BLOCKING)
- **Files modified/created:** 10

## Accomplishments
- `httpx` promoted to `[project] dependencies`; `APScheduler>=3.11,<4` added; `sentinelhub-py` explicitly not adopted (RESEARCH pitfall avoided). `uv sync` confirmed `apscheduler` resolved into `uv.lock`.
- 13 new configurable `satellite_*`/`copernicus_*`/`integrity_risk_weight_satellite_*` settings added to `Settings` (D-12/D-13/D-14/D-17) — no thresholds hardcoded anywhere.
- `backend_app/modules/satellite/constants.py` created as the single source of truth for the domain vocabulary — mirrored exactly by the check constraints in all 3 new migrations. Includes `FORBIDDEN_AUTOMATIC_EVENT_TYPES = frozenset({"DEFORESTATION"})` as an explicit code-level guard for SATM-06.
- 3 idempotent migrations (`create table if not exists`, `text + check`, no `CREATE TYPE`) created 7 tables, all RLS-enabled with DML revoked from `anon, authenticated` and zero SELECT policies.
- `satellite_observations` idempotency enforced via `unique index satellite_observations_idempotency_idx (project_id, satellite, scene_id, processing_version)` — proven against the live database.
- 7 ORM models added to `backend_app/db/models.py`, matching the Phase 04.2 style exactly (text vocabulary as `String`, `numeric(p,s)` as `Numeric(p,s)`, `metadata_` mapped column, `created_at_column()` helper).
- `npx -y supabase db reset` applied all 3 new migrations without any error and without needing to touch `supabase/seed.sql` (no Rule 3-style seed desync this time).
- `tests/db/test_satellite_schema.py` created with 10 tests, all passing, locking the schema contract by reading migration SQL text (no DB dependency, runs anywhere).
- Full test suite run: 210 passed / 3 pre-existing failures, confirmed unrelated to this plan (see Deviations).

## Task Commits

Each task was committed atomically:

1. **Task 1: Dependencies, thresholds in Settings, and satellite domain vocabulary** - `523db70` (feat)
2. **Task 2: Three idempotent migrations (7 tables) and corresponding ORM models** - `5404b55` (feat)
3. **Task 3: [BLOCKING] Apply migrations to local Postgres and lock schema contract in test** - `e208417` (test)

## Files Created/Modified
- `pyproject.toml` - `httpx` moved to production deps; `APScheduler>=3.11,<4` added
- `.env.example` - `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` documented
- `backend_app/core/config.py` - 13 new `satellite_*`/`copernicus_*`/`integrity_risk_weight_satellite_*` settings
- `backend_app/modules/satellite/__init__.py` - empty module marker (matches `integrity/__init__.py` pattern)
- `backend_app/modules/satellite/constants.py` - closed canonical vocabulary for the whole Phase 05 domain
- `backend_app/db/models.py` - 7 new ORM models: `SatelliteObservation`, `SatelliteAnomaly`, `ProjectEvent`, `SatelliteEvidence`, `SatelliteJob`, `CopernicusApiUsage`, `CreditAdjustmentPendency`
- `supabase/migrations/202608180001_satellite_observations_anomalies_events.sql` - `satellite_observations`, `satellite_anomalies`, `project_events`, `satellite_evidence`
- `supabase/migrations/202608180002_satellite_jobs_copernicus_usage.sql` - `satellite_jobs`, `copernicus_api_usage`
- `supabase/migrations/202608180003_credit_adjustment_pendencies.sql` - `credit_adjustment_pendencies`
- `tests/db/test_satellite_schema.py` - 10 schema-contract tests (no DB dependency)

## Final Table/Column Names (contract for Plans 02-09)

All names applied exactly as proposed in the plan — **no deviations**:

- `satellite_observations` (project_id, provider, satellite, product, scene_id, processing_version, observed_at, cloud_coverage, ndvi_mean, ndvi_min, ndvi_max, ndmi_mean, nbr_mean, valid_pixel_percentage, source, metadata, created_at)
- `satellite_anomalies` (project_id, observation_id, previous_observation_id, index_name, value_before, value_after, drop_ratio, severity, confidence, affected_area_ha, status, reason, detected_at, metadata, created_at)
- `project_events` (project_id, anomaly_id, type, status, severity, confidence, affected_area_ha, ndvi_before, ndvi_after, summary, detected_at, analyzed_at, decided_at, decided_by_profile_id, decision_notes, cleared_at, cleared_by_profile_id, clearance_notes, metadata, created_at)
- `satellite_evidence` (project_id, project_event_id, anomaly_id, kind, storage_bucket, storage_object_path, storage_path, sha256_hash, mime_type, size_bytes, captured_at, metadata, created_at)
- `satellite_jobs` (project_id, job_type, status, attempts, observations_persisted, anomalies_detected, window_start, window_end, started_at, finished_at, error_message, metadata, created_at, updated_at)
- `copernicus_api_usage` (project_id, satellite_job_id, endpoint, outcome, http_status, processing_units, duration_ms, error_code, metadata, created_at)
- `credit_adjustment_pendencies` (project_id, project_event_id, raised_by_profile_id, category, description, affected_area_ha, status, producer_response, responded_by_profile_id, responded_at, resolved_at, metadata, created_at)

## `npx -y supabase db reset` Output (tail)

```
Applying migration 202608170002_integrity_risk_assessments.sql...
Applying migration 202608180001_satellite_observations_anomalies_events.sql...
Applying migration 202608180002_satellite_jobs_copernicus_usage.sql...
Applying migration 202608180003_credit_adjustment_pendencies.sql...
Seeding data from supabase/seed.sql...
Restarting containers...
Finished supabase db reset on branch main.
{"target":"local","version":"","message":"Reset local database."}
```

No seed.sql desync (unlike the Phase 04.2 Rule 3 precedent) — reset completed clean on the first attempt.

## Live Database Proof

**7 tables confirmed present** (`pg_tables` query): `copernicus_api_usage`, `credit_adjustment_pendencies`, `project_events`, `satellite_anomalies`, `satellite_evidence`, `satellite_jobs`, `satellite_observations`.

**Idempotency index (D-15):**
```
CREATE UNIQUE INDEX satellite_observations_idempotency_idx ON public.satellite_observations USING btree (project_id, satellite, scene_id, processing_version)
```

**Zero RLS SELECT policies (D-16):** `pg_policies` query across the 7 tables returned `0`.

**Row counts after reset (all expected 0, all confirmed 0):** `satellite_observations=0`, `satellite_anomalies=0`, `project_events=0`, `satellite_evidence=0`, `satellite_jobs=0`, `copernicus_api_usage=0`, `credit_adjustment_pendencies=0`.

**SATM-06 proof — `DEFORESTATION` rejected by the live database:**
```sql
insert into project_events (project_id, type, severity)
select id, 'DEFORESTATION', 'HIGH' from projects limit 1;
```
```
ERROR:  new row for relation "project_events" violates check constraint "project_events_type_check"
DETAIL:  Failing row contains (19a67a22-043f-4e2e-9942-69d642ac6bfc, 7862e955-39ff-4886-b356-67d30a9a4e6b, null, DEFORESTATION, DETECTED, HIGH, null, null, null, null, null, 2026-08-17 01:26:54.13872+00, null, null, null, null, null, null, null, {}, 2026-08-17 01:26:54.13872+00).
```

## Decisions Made
- `httpx` treated as a hard production dependency, not a dev-only test client, per RESEARCH.md Pitfall 1 — verified separately for both `[project]` and `[dependency-groups] dev` sections.
- `sentinelhub-py` rejected outright rather than evaluated further — RESEARCH.md's "Alternatives Considered" already closed this decision with concrete reasoning (sync client, heavy transitive deps).
- No `psql` binary available on the host; used `docker exec -i supabase_db_sinarca-local psql ...` instead to run the live-database proofs required by Task 3. Purely a tooling substitution, no behavior difference from the plan's literal `psql -h 127.0.0.1 -p 54322 ...` invocation.

## Deviations from Plan

### Auto-fixed / Noted Issues

**1. Worktree base correction (pre-execution, not a plan deviation)**
- **Found during:** Mandatory HEAD assertion before any work began.
- **Issue:** Worktree HEAD (`3845305`, tip of `main`) was behind the plan's declared base commit (`07ec3ad`, "chore(state): begin phase 05 execution").
- **Fix:** `git reset --hard 07ec3ad96062645c5f6f945414a5369e3b68de6d` per the mandatory worktree-branch-check protocol (working tree was clean, no risk of data loss).
- **Committed in:** N/A (pre-task state correction, not part of any task commit)

**2. `uv sync` accidentally run once against the sibling main repo directory**
- **Found during:** Start of Task 1 verification.
- **Issue:** A single Bash invocation combined `cd "/Volumes/External SSD/Projects/sinarca" && uv sync` — since cwd resets between Bash calls in this environment, this ran `uv sync` in the main repo directory instead of the worktree.
- **Fix:** Confirmed via file timestamps that the main repo's `pyproject.toml`/`uv.lock` were untouched (last modified 22 May, well before this session) — the stray sync was a no-op resolve with nothing to write. Re-ran `uv sync` correctly with cwd already inside the worktree; this run installed `httpx`/`apscheduler`/transitive deps and updated the worktree's own `uv.lock` as intended.
- **Files modified:** None outside the worktree.
- **Verification:** `ls -la` timestamp comparison between main repo and worktree `uv.lock`/`pyproject.toml`.

**3. 3 pre-existing test failures unrelated to this plan**
- **Found during:** Full suite run (`uv run pytest -q`) as required by the plan's verification step 5.
- **Issue:** `tests/contract/test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service`, `tests/contract/test_frontend_project_links.py::test_producer_overview_has_working_actions_and_readable_static_map`, and `tests/contract/test_frontend_project_links.py::test_public_project_pages_request_only_public_marketplace_ready_projects` all fail against `Dockerfile.frontend`, `src/pages/Dashboard/Overview.tsx`, and `src/pages/Dashboard/Feed.tsx`.
- **Fix:** None applied — out of scope for this plan (frontend/Docker files this plan never touches). Confirmed via `git diff --stat 07ec3ad..HEAD -- Dockerfile.frontend src/pages/Dashboard/Overview.tsx src/pages/Dashboard/Feed.tsx src/services/database.ts` returning empty, proving these files are byte-identical to the plan's declared base commit — these failures pre-date this plan's execution and are not a regression introduced here.
- **Files modified:** None.
- **Verification:** `git diff` against base commit shows zero changes to the failing files.

---

**Total deviations:** 3 (1 pre-execution worktree correction required by protocol, 1 tooling no-op with no lasting effect, 1 confirmed pre-existing failure noted for visibility). **Impact on plan:** None of the three affected schema, migrations, ORM models, settings, or the new test file. All Task 1-3 acceptance criteria and the plan's own `<verification>` checklist pass in full.

## Issues Encountered
- No `psql` binary on host — substituted `docker exec -i supabase_db_sinarca-local psql` for all live-database proof commands (Task 3, steps 2-4). Same SQL, same output shape, no impact on the evidence gathered.

## User Setup Required

**External service requires manual configuration before Plan 03 (Copernicus adapter) can run live.** Per the plan's `user_setup` block:
- Create a free Copernicus Data Space Ecosystem account at https://dataspace.copernicus.eu (quota: 10,000 PU/month, 300 req/min, 2 concurrent requests)
- Generate an OAuth client under User Settings -> OAuth clients -> Create new client
- Set `COPERNICUS_CLIENT_ID` and `COPERNICUS_CLIENT_SECRET` in `.env` (placeholders already added to `.env.example` in this plan)

This is a Plan 03 blocker, not a Plan 01 blocker — no code in this plan reads these env vars yet.

## Next Phase Readiness

Ready for all of Plans 02-09: the 7 tables exist in local Postgres with the exact names/columns declared above, the 7 ORM models are importable from `backend_app.db.models`, `backend_app.modules.satellite.constants` exposes the full closed vocabulary, and `Settings` exposes every `satellite_*`/`copernicus_*` threshold Plans 02-09 need to read (never hardcode). No blockers for the next wave.

---
*Phase: 05-satellite-monitoring-and-field-audit*
*Completed: 2026-08-17*
