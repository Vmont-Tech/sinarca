---
phase: 05-satellite-monitoring-and-field-audit
plan: 03
subsystem: integrations
tags: [httpx, asyncio, copernicus, sentinel-hub, oauth2, satellite, stac]

# Dependency graph
requires:
  - phase: 05-01
    provides: "satellite_* tables/ORM models, satellite domain constants, copernicus_*/satellite_* Settings thresholds, httpx promoted to production dependency"
provides:
  - "backend_app/adapters/satellite.py: pure Protocol SatelliteProvider + DTOs (SceneDTO, IndexStatisticsDTO, SatelliteImageDTO, CopernicusUsageRecord)"
  - "backend_app/adapters/copernicus.py: CopernicusProvider — first async adapter in the repo, fail-closed, cached OAuth2 token, 2-request semaphore, STAC/Statistical/Process API methods, pure parsers, build_copernicus_provider() factory"
  - "tests/adapters/test_copernicus.py: 11 tests via httpx.MockTransport, no live credentials, no network"
  - ".planning/docs/providers/PHASE5-COPERNICUS-PROVIDER.md: D-10 operational prerequisite doc (BLOCKED_MISSING_PROVIDER_CREDENTIALS)"
affects: [05-05, 05-06, 05-07, 05-08, 05-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First fully-async adapter in the repo: httpx.AsyncClient end-to-end, no requests/urllib, transport injection point (httpx.AsyncBaseTransport) for MockTransport in tests"
    - "Cached OAuth2 token behind asyncio.Lock with 30s expiry margin, single 401 retry with token invalidation"
    - "Internal asyncio.Semaphore enforcing an external provider's concurrent-request quota, kept inside the adapter and never exposed to call sites"
    - "Pure, network-free module-level parser functions (parse_stac_response/parse_statistics_response) separated from the HTTP methods for unit testability"

key-files:
  created:
    - backend_app/adapters/satellite.py
    - backend_app/adapters/copernicus.py
    - tests/adapters/test_copernicus.py
    - .planning/docs/providers/PHASE5-COPERNICUS-PROVIDER.md

key-decisions:
  - "Task 1 introduces async stub methods (self.config.assert_ready() then raise NotImplementedError) for search_scenes/get_statistics/get_image, replaced by Task 2's real implementation — required because Task 1's own <verify> script asserts these three methods already exist as coroutine functions on CopernicusProvider, and Task 1's acceptance criteria requires grep -c 'assert_ready' >= 4 before Task 2 runs."
  - "STAC pagination follows the documented POST 'next' link convention: if payload['links'] contains an entry with rel == 'next' and a 'body' key, that body replaces the request body for the next page (max 5 pages, per D-12's ~60-point/5-year expected volume); no live STAC response was available to validate the exact link shape against."
  - "Tests wrap every await for a given CopernicusProvider instance — including aclose() — inside a single asyncio.run(...) call per test, since the repo has no pytest-asyncio and asyncio.Lock/Semaphore objects bind to the event loop of their first use; reusing a provider instance across two separate asyncio.run() calls raises 'bound to a different event loop'."

requirements-completed: [SATM-05, SATM-10]

# Metrics
duration: ~45min
completed: 2026-08-16
---

# Phase 05 Plan 03: Copernicus Adapter Summary

**Async `CopernicusProvider` over the Copernicus Data Space Ecosystem — cached OAuth2 token, 2-request semaphore, STAC/Statistical/Process API methods implementing `SatelliteProvider`, fail-closed with zero real credentials and 11 passing `httpx.MockTransport` tests**

## Performance

- **Duration:** ~45 min (includes a ~7 min full-suite verification run)
- **Tasks:** 3 (all completed)
- **Files modified/created:** 4 (all newly created, zero existing files touched)

## Accomplishments
- `backend_app/adapters/satellite.py`: pure `Protocol SatelliteProvider` + 4 frozen dataclasses (`SceneDTO`, `IndexStatisticsDTO`, `SatelliteImageDTO`, `CopernicusUsageRecord`) — zero HTTP-client or ORM dependency, so domain code can depend on the contract without pulling in the concrete provider.
- `backend_app/adapters/copernicus.py` (439 lines): `CopernicusAdapterConfig` (fail-closed `assert_ready()`, fixed CDSE URLs as dataclass defaults — never request/route parameters, per T-05-16/ASVS V10), `CopernicusProvider` — the repo's first async adapter, with a token cached behind `asyncio.Lock` (30s expiry margin, single 401 retry with token invalidation), an `asyncio.Semaphore(2)` enforcing CDSE's free-tier concurrent-request quota (D-11), a best-effort `CopernicusUsageRecord` emitted on every call (never carries the client secret), and the three public methods over STAC search / Statistical API / Process API.
- Pure, network-free parsers `parse_stac_response`/`parse_statistics_response` drop malformed STAC features (missing `id`/`datetime`) and Statistical API intervals carrying an `error` key instead of inventing a value — `None` is never converted to `0.0`.
- `tests/adapters/test_copernicus.py`: 11 tests via `httpx.MockTransport` (no `respx`, no `pytest-asyncio`) covering fail-closed gates on all 3 public methods, token caching/refresh, STAC/statistics/image parsing, a 500 error propagating as `httpx.HTTPStatusError` (never simulated data), client-secret leakage in usage records, and the 2-concurrent-request ceiling under `asyncio.gather`. All 11 passed on first run; full `tests/adapters/` suite (22 tests) green, no regression.
- `.planning/docs/providers/PHASE5-COPERNICUS-PROVIDER.md`: D-10 operational prerequisite doc, status `BLOCKED_MISSING_PROVIDER_CREDENTIALS` (confirmed `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` both `UNSET` in this environment via `env | grep -c`), endpoints/quotas/PU cost table, and the manual smoke checklist for when real credentials exist.

## Task Commits

Each task was committed atomically:

1. **Task 1: Contrato SatelliteProvider, config fail-closed, token cacheado e semaforo de concorrencia** - `96337df` (feat)
2. **Task 2: search_scenes (STAC), get_statistics (Statistical API) e get_image (Process API)** - `f5054c5` (feat)
3. **Task 3: Testes do adapter com httpx.MockTransport e documento de pre-requisito de credenciais (D-10)** - `7475127` (test)

## Files Created/Modified
- `backend_app/adapters/satellite.py` - `Protocol SatelliteProvider` + DTOs, zero deps beyond `dataclasses`/`typing`
- `backend_app/adapters/copernicus.py` - `CopernicusAdapterConfig` + `CopernicusProvider` (OAuth2 cache, semaphore, usage recorder, 3 public methods, 2 pure parsers, 2 evalscript constants, `build_copernicus_provider()` factory)
- `tests/adapters/test_copernicus.py` - 11 tests via `httpx.MockTransport`
- `.planning/docs/providers/PHASE5-COPERNICUS-PROVIDER.md` - D-10 credentials prerequisite doc

## Decisions Made
- Task 1 ships async stub methods with the fail-closed gate already visible (`self.config.assert_ready()` first line), so the plan's own Task 1 verification (which checks `search_scenes`/`get_statistics`/`get_image` are already coroutine functions, and `assert_ready` appears ≥4 times) passes before Task 2 fills in the bodies — no behavior change, purely sequencing to satisfy the plan's own gates.
- STAC pagination implemented defensively (max 5 pages, follows a `rel == "next"` link's `body` if present) since no live CDSE response was available this session to confirm the exact pagination envelope; this does not affect the parsing contract (`parse_stac_response`), which is fully covered by unit tests independent of HTTP.
- Two acceptance-criteria greps false-positived on my own explanatory comments (`httpx` mentioned in a comment in `satellite.py`; `numpy/rasterio/gdal/sentinelhub` mentioned in a comment in `copernicus.py` explaining why they're absent) — reworded both comments to keep the same intent without the literal forbidden words.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1 needed stub methods with explicit `assert_ready()` gates to satisfy its own acceptance criteria**
- **Found during:** Task 1 acceptance-criteria verification loop
- **Issue:** The plan's Task 1 `<verify>` script asserts `CopernicusProvider.search_scenes`/`get_statistics`/`get_image` already exist as coroutine functions, and Task 1's acceptance criteria requires `grep -c 'assert_ready' >= 4` (definition + the 3 public methods) — but Task 1's `<action>` prose only described the config/token/concurrency skeleton, not the three method stubs.
- **Fix:** Added three `async def` stub methods to `CopernicusProvider` in Task 1, each opening with `self.config.assert_ready()` then `raise NotImplementedError`, later replaced by Task 2's real bodies (same signatures, same gate).
- **Files modified:** `backend_app/adapters/copernicus.py`
- **Verification:** Task 1's exact `<verify>` python script and all 8 Task 1 acceptance criteria pass; re-verified again after Task 2 replaced the stub bodies (Task 2's own acceptance criteria also pass).
- **Committed in:** `96337df` (Task 1 commit)

**2. [Rule 1 - Bug] Two grep acceptance criteria false-positived on explanatory comments**
- **Found during:** Task 1 and Task 2 acceptance-criteria verification
- **Issue:** `grep -c 'AsyncSession\|httpx' backend_app/adapters/satellite.py` matched the literal word "httpx" inside a comment explaining the module has no HTTP-client dependency; `grep -ic 'numpy\|rasterio\|gdal\|sentinelhub' backend_app/adapters/copernicus.py` matched those words inside a comment explaining why the evalscript approach avoids local raster/array processing.
- **Fix:** Reworded both comments to preserve the same rationale without the literal forbidden words.
- **Files modified:** `backend_app/adapters/satellite.py`, `backend_app/adapters/copernicus.py`
- **Verification:** both grep checks return `0` after the edit; re-ran full acceptance-criteria sets for both tasks.
- **Committed in:** `96337df`, `f5054c5`

---

**Total deviations:** 2 auto-fixed (both Rule 1, required to literally satisfy the plan's own acceptance criteria). **Impact on plan:** None — no scope creep, no behavior change beyond what Task 2's own action text already specified for the three public methods.

## Issues Encountered

**Full repo suite shows 36 pre-existing failures unrelated to this plan.** `uv run pytest -q` reports `36 failed, 207 passed` — but `git diff --stat 10cb478e..HEAD` confirms this plan added exactly 4 new files (`satellite.py`, `copernicus.py`, `test_copernicus.py`, `PHASE5-COPERNICUS-PROVIDER.md`) and modified zero existing files. Spot-checked one failure (`tests/test_project_conflicts.py::test_disjoint_projects_generate_no_conflict`): a Postgres `UniqueViolationError` on `projects_friendly_id_key` against the shared local Supabase instance (`supabase_db_sinarca-local`, confirmed running via `docker ps`) — consistent with data-state collisions from concurrent test runs against a shared local database, since this wave runs a sibling parallel executor (plan 05-04) against the same worktree host's Docker Supabase. This plan's adapter code never imports `AsyncSession`/`backend_app.db` (`grep -c` = 0) and cannot cause a `projects` table insert conflict. This plan's own scope — `tests/adapters/` (22 tests, including this plan's 11 new tests) and the plan-level `<verification>` checks (`grep -ic 'sentinelhub\|numpy\|rasterio' backend_app/adapters/copernicus.py` = 0) — is entirely green. A `supabase db reset` was deliberately NOT run to "fix" this, since it would disrupt the concurrently running sibling agent's database state — out of this plan's scope per the deviation rules' scope boundary. This should be re-verified by the orchestrator after all wave-2 worktrees merge, when a single `npx supabase db reset` can run without disrupting a concurrent agent.

## User Setup Required

None new. The D-10 prerequisite (`COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET`) was already flagged as a Plan 03 blocker in `05-01-SUMMARY.md`'s "User Setup Required" section; this plan formalizes it in `PHASE5-COPERNICUS-PROVIDER.md` but requires no new user action to complete its own scope — fail-closed behavior is proven entirely via `httpx.MockTransport`, with no live credentials needed.

## Next Phase Readiness

`SatelliteProvider`/`CopernicusProvider` are ready for the plan that wires the scheduler/persistence layer (05-05 onward) to call `build_copernicus_provider(usage_recorder)` and invoke `search_scenes`/`get_statistics`/`get_image` against real AOI GeoJSON sourced from `active_boundary` (Phase 04.1). No blockers introduced by this plan. The pre-existing 36 full-suite failures (shared-DB state collisions, zero files this plan touched) are noted above for the orchestrator to re-verify once wave 2 merges and the shared local Postgres can be reset cleanly.

---
*Phase: 05-satellite-monitoring-and-field-audit*
*Completed: 2026-08-16*
