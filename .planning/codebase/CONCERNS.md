# Codebase Concerns

**Analysis Date:** 2026-05-22

## Tech Debt

**Backend split between demo API and unused SQLAlchemy API:**
- Issue: The API that actually imports and runs is the in-memory FastAPI app in `backend/main.py`; the SQLAlchemy routers in `backend/api/*` are not mounted anywhere because `backend/main.py` has no `include_router` calls.
- Files: `backend/main.py`, `backend/api/auth/auth.py`, `backend/api/auth/auth_admin.py`, `backend/api/projects/projects.py`, `backend/api/audit/audit.py`, `backend/api/inventory/inventory.py`, `backend/api/market/marketplace.py`, `backend/core/database.py`
- Impact: A Node rewrite must treat `backend/main.py` plus `src/services/database.ts` as the active contract, not the SQLAlchemy routers. Porting the SQLAlchemy shape directly will break frontend pages that expect `friendlyId`, `metrics`, `entities`, `blockchain`, and `/api/v1/*`.
- Fix approach: Freeze the active OpenAPI/JSON contract from `backend/main.py`, then migrate endpoint-by-endpoint to Node with contract tests driven by `src/services/api.ts`, `src/services/database.ts`, and `src/contexts/AuthContext.tsx`.

**Python dependency manifest is incomplete for large parts of `backend/`:**
- Issue: `pyproject.toml` and `uv.lock` only declare the runnable demo app dependencies; legacy DB/auth/storage modules import packages that are not declared.
- Files: `pyproject.toml`, `uv.lock`, `backend/api/auth/auth.py`, `backend/api/auth/auth_admin.py`, `backend/core/database.py`, `backend/core/security.py`, `backend/core/limiter.py`, `backend/services/s3_services.py`
- Impact: `uv run python -c "from backend.api.auth.auth import router"` fails because `jose` is missing. Similar imports require `sqlalchemy`, `passlib`, `brutils`, `slowapi`, `boto3`, `cryptography`, and other undeclared packages.
- Fix approach: During the Node rewrite, classify legacy Python modules as either source-of-truth requirements or dead code. Do not carry over imports just because files exist.

**SQLAlchemy model layer is internally inconsistent:**
- Issue: Auth/seed code expects `User.username`, `User.hashed_password`, and `User.role`, but `backend/models/user.py` defines `nome`, `senha_hash`, and `tipo_usuario`.
- Files: `backend/models/user.py`, `backend/api/auth/auth.py`, `backend/api/auth/auth_admin.py`, `backend/data/seed.py`, `backend/models/schemas.py`
- Impact: Enabling the DB routers without schema repair will fail at runtime and creates high migration risk from local/demo state to production DB state.
- Fix approach: Define a new canonical user/account schema for the Node backend; map old field names explicitly and add migration tests before touching production data.

**Database schema exists without migrations or production lifecycle:**
- Issue: `backend/core/database.py` can call `Base.metadata.create_all()` and `CREATE EXTENSION IF NOT EXISTS vector`, but there is no Alembic, Prisma, SQL migration folder, seed workflow, rollback plan, or production migration command.
- Files: `backend/core/database.py`, `backend/models/*.py`, `Dockerfile`, `docker-compose.yml`
- Impact: Local/prod DB drift is likely. `CREATE EXTENSION IF NOT EXISTS vector` requires pgvector availability that the Docker setup does not install.
- Fix approach: For Node, start with explicit migrations and seed scripts. Treat `backend/mock_data.py` as fixture data, not as an implicit schema.

**Frontend build passes while TypeScript typecheck fails:**
- Issue: `npm run build` succeeds because Vite does not run `tsc`; `npx tsc -p tsconfig.app.json --noEmit` reports many strict-mode failures.
- Files: `package.json`, `tsconfig.app.json`, `src/ErrorBoundary.tsx`, `src/pages/Dashboard/UserProfile.tsx`, `src/pages/Dashboard/GlobalMap.tsx`, `src/services/impact-engine/types.ts`, `src/services/impact-engine/engine/calculator.ts`, `src/services/impact-engine/engine/composer.ts`
- Impact: Frontend/backend contract changes can compile in Vite while type regressions remain hidden, especially around optional API fields and impact-engine result types.
- Fix approach: Add a `typecheck` script and make it part of verification before changing contracts.

**Repository contains generated and design-output artifacts:**
- Issue: `soroban-contract/target` is tracked and about 2.7 GB; `novas telas painel/` contains many generated HTML/screenshot variants.
- Files: `soroban-contract/target`, `novas telas painel/`, `.gitignore`
- Impact: Git operations, clones, CI, and code search are slow and noisy. Future agents may read generated artifacts instead of source.
- Fix approach: Stop tracking generated targets and move design artifacts to docs/reference storage or a clearly ignored archive.

**Documentation and implementation disagree on stack and contract:**
- Issue: `README.md` claims TanStack Router/React Query, while `package.json` uses `react-router-dom` and no TanStack packages. `docs/BACKEND_INTEGRATION_SPEC.md` says Algorand, while code and contract files use Stellar/Soroban terminology.
- Files: `README.md`, `package.json`, `docs/BACKEND_INTEGRATION_SPEC.md`, `backend/services/stellar_service.py`, `soroban-contract/src/contract.rs`
- Impact: Planning a Node rewrite from docs alone will choose the wrong dependencies or blockchain integration.
- Fix approach: Use source code and live frontend calls as canonical, then update docs after the Node API contract is settled.

## Known Bugs

**Stellar enabled mode breaks marketplace purchase:**
- Symptoms: `StellarService.transfer_credit()` returns a mock transaction only when `STELLAR_ENABLED=false`; with enabled mode it falls through with `None`, so `/api/v1/marketplace/buy` will fail when it reads `stellar_tx["hash"]`.
- Files: `backend/services/stellar_service.py`, `backend/main.py`
- Trigger: Set `STELLAR_ENABLED=true` and call `POST /api/v1/marketplace/buy`.
- Workaround: Keep `STELLAR_ENABLED=false` until a real Stellar/Soroban adapter is implemented and tested.

**Stellar real-code block is unreachable and references invalid scope:**
- Symptoms: The SDK code after `burn_credit()`'s return is unreachable and references `to_account`, which is not a `burn_credit()` parameter.
- Files: `backend/services/stellar_service.py`
- Trigger: Refactor or enable the real Stellar path without moving and testing that block.
- Workaround: Delete the unreachable block and replace it with explicit transfer/burn implementations.

**Docker Compose file is invalid YAML:**
- Symptoms: `docker compose config` fails with `yaml: line 7: found character that cannot start any token`.
- Files: `docker-compose.yml`
- Trigger: Any Docker Compose deployment or Dokploy flow that reads `docker-compose.yml`.
- Workaround: Use `Dockerfile` directly only after validating runtime env; do not rely on Compose until the YAML is rewritten.

**Docker healthcheck and exposed ports disagree with the app:**
- Symptoms: `docker-compose.yml` healthchecks `http://localhost:5680/docs`, while the root `Dockerfile` starts Uvicorn on port `80`; `Dockerfile.api` starts on `5680`; `Dockerfile.frontend` starts Vite dev server.
- Files: `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`, `docker-compose.yml`
- Trigger: Deploying through Dokploy/Nixpacks/Compose without choosing one runtime model.
- Workaround: For production, use one API image and one static frontend build or one combined image with a matching healthcheck.

**Frontend retirement flow bypasses configured API base URL:**
- Symptoms: `RetireCredits` posts directly to `http://127.0.0.1:5680/api/v1/marketplace/compensate`, ignoring `VITE_API_URL` and the Vite proxy.
- Files: `src/pages/Dashboard/RetireCredits.tsx`, `src/services/api.ts`, `vite.config.ts`
- Trigger: Production deployment or any non-local API host.
- Workaround: Route the call through `apiPost('/marketplace/compensate', ...)`.

**API tests are stale and not runnable from declared dependencies:**
- Symptoms: `uv run pytest tests/test_api_integration.py -q` cannot spawn `pytest`; the tests also expect `/api/v1/monetization` and transaction `financials` fields that are not present in `backend/main.py`.
- Files: `tests/test_api_integration.py`, `backend/main.py`, `pyproject.toml`
- Trigger: Running backend tests in a fresh environment.
- Workaround: Add test dependencies, then rewrite tests against the active API contract before using them as rewrite safety net.

**Root documentation has broken local references:**
- Symptoms: `README_SINARCA.md` links to `docs/bible/12_Política_de_Privacidade.md`, but the file is `docs/bible/12_Politica_de_Privacidade.md`. `docs/PROJECT_LIFECYCLE_ONBOARDING.md` embeds `file:///C:/...` images from a local Windows machine.
- Files: `README_SINARCA.md`, `docs/bible/12_Politica_de_Privacidade.md`, `docs/PROJECT_LIFECYCLE_ONBOARDING.md`
- Trigger: Opening docs outside the original local workstation.
- Workaround: Normalize filenames and commit portable image assets under `docs/`.

## Security Considerations

**Demo auth uses plaintext passwords and in-memory users:**
- Risk: `backend/mock_data.py` stores demo users with plaintext passwords; `backend/main.py` compares plaintext login credentials and stores newly registered passwords in memory.
- Files: `backend/mock_data.py`, `backend/main.py`
- Current mitigation: Public registration blocks `role=admin` in `backend/main.py`.
- Recommendations: In Node, require hashed passwords or external identity, prohibit demo credentials in production, and gate demo auth behind an explicit env flag.

**Session tokens are process-local and expiration is client-enforced:**
- Risk: `ACTIVE_SESSIONS` in `backend/main.py` stores token-to-user mappings without server-side expiration cleanup; the frontend stores bearer tokens in `localStorage`.
- Files: `backend/main.py`, `src/contexts/AuthContext.tsx`, `src/services/api.ts`
- Current mitigation: `expires_at` is returned and checked by the frontend.
- Recommendations: Use signed, expiring access tokens or server sessions with TTL storage; enforce expiration on the server and avoid long-lived localStorage tokens for production.

**Business endpoints have no authorization checks:**
- Risk: Marketplace, audit, certifier, inventory, and transaction endpoints in `backend/main.py` accept unauthenticated requests and mutate global state.
- Files: `backend/main.py`
- Current mitigation: None detected.
- Recommendations: Add middleware/guards for role-specific routes before or during the Node rewrite. Contract tests should assert unauthenticated requests fail.

**Upload validation is superficial:**
- Risk: `/api/v1/inventory/upload` trusts `file.content_type`, reads the upload into memory, does not scan content, does not persist to a controlled store, and is unauthenticated.
- Files: `backend/main.py`, `backend/validators/file_validator.py`, `backend/services/s3_services.py`
- Current mitigation: Size and MIME allowlist checks in `backend/main.py`.
- Recommendations: Validate extension and magic bytes, scan files, write to object storage, attach uploads to authenticated users, and store hashes.

**Environment and secrets handling is not production-ready:**
- Risk: No `.env` file is present, `.env` is ignored, no `.env.example` exists, and Docker files define database credentials inline. `SECRET_KEY` can be `None` in JWT helpers.
- Files: `.gitignore`, `Dockerfile`, `docker-compose.yml`, `backend/core/config.py`, `backend/core/jwt.py`
- Current mitigation: Secret-looking files are ignored by `.gitignore`; no secret files are tracked.
- Recommendations: Add `.env.example` with names only, fail fast on missing secrets, move database credentials to deployment secrets, and never bake production values into images.

**Supabase is not integrated:**
- Risk: No Supabase client, env vars, or auth calls are detected. The active auth path is local FastAPI token state plus frontend localStorage.
- Files: `src/contexts/AuthContext.tsx`, `src/services/api.ts`, `backend/main.py`
- Current mitigation: Not applicable.
- Recommendations: If the Node rewrite uses Supabase, design it as a new integration with explicit env contract, service-role isolation, RLS policy review, and frontend token flow; do not assume existing Supabase conventions.

**S3/storage service is broken and would leak wrong URLs:**
- Risk: `backend/services/s3_services.py` imports `settings` that does not exist in `backend/core/config.py`; `upload_file()` returns a URL using the backup bucket name while uploading to the primary bucket.
- Files: `backend/services/s3_services.py`, `backend/core/config.py`
- Current mitigation: The service is not wired into `backend/main.py`.
- Recommendations: Replace with a tested storage adapter in Node and keep bucket names, encryption keys, and upload ACLs in deployment secrets.

## Performance Bottlenecks

**Frontend bundle is already large for a Vite SPA:**
- Problem: `npm run build` succeeds but emits a warning for a 720 kB minified JS chunk.
- Files: `src/App.tsx`, `src/pages/Dashboard/*.tsx`, `src/services/impact-engine/*`, `package.json`
- Cause: Dashboard pages and heavy modules are bundled together without route-level code splitting.
- Improvement path: Add lazy routes and split dashboard/public/impact-engine chunks before expanding API-driven workflows.

**Frontend repeatedly fetches and remaps full project collections:**
- Problem: Many pages call `database.getMarketProjects({ limit: 1000 })`, which fetches `/projects?limit=1000` and remaps all items client-side.
- Files: `src/services/database.ts`, `src/pages/Dashboard/Overview.tsx`, `src/pages/Dashboard/Feed.tsx`, `src/pages/Dashboard/PublicExplorer.tsx`, `src/pages/Dashboard/ImpactLeaders.tsx`
- Cause: No server-side pagination/filtering contract is used beyond simple query params; no React Query/cache layer is installed despite docs saying it exists.
- Improvement path: Add typed query params and cached client fetches; in Node, expose pagination and filters that match dashboard needs.

**Backend state operations are linear and process-local:**
- Problem: Project/user lookups use list scans and all mutations update module-level lists.
- Files: `backend/main.py`, `backend/mock_data.py`
- Cause: In-memory MVP data structures.
- Improvement path: Move to indexed DB queries in Node and define transaction boundaries for purchase, compensation, audit, and certifier decisions.

**Generated artifacts slow repository operations:**
- Problem: `soroban-contract/target` is about 2.7 GB and tracked by Git.
- Files: `soroban-contract/target`, `.gitignore`
- Cause: Rust build output is not ignored/untracked.
- Improvement path: Add `soroban-contract/target/` to `.gitignore` and remove generated artifacts from version control with a deliberate cleanup commit.

## Fragile Areas

**Python backend replacement risk:**
- Files: `backend/main.py`, `src/services/api.ts`, `src/services/database.ts`, `src/contexts/AuthContext.tsx`, `docs/BACKEND_INTEGRATION_SPEC.md`
- Why fragile: The frontend contract is broader than the backend integration spec and uses demo-specific shapes from `backend/mock_data.py`.
- Safe modification: Generate a contract inventory from active frontend calls, then implement Node endpoints to match those shapes before replacing Python.
- Test coverage: `tests/test_api_integration.py` is stale; add contract tests before swapping runtimes.

**Frontend/backend contract is only partially centralized:**
- Files: `src/services/api.ts`, `src/services/database.ts`, `src/pages/Dashboard/RetireCredits.tsx`, `src/pages/Dashboard/MrcaDetails.tsx`
- Why fragile: Most calls go through `api.ts`, but `RetireCredits` hardcodes localhost and `MrcaDetails` can fall back to static `src/data/mrca_db.ts`.
- Safe modification: Remove direct `fetch()` calls and define typed service methods for every API operation.
- Test coverage: No frontend unit/integration tests cover failed API responses or production API URLs.

**Local/prod DB migration path is undefined:**
- Files: `backend/core/database.py`, `backend/models/*.py`, `backend/mock_data.py`, `Dockerfile`, `docker-compose.yml`
- Why fragile: There is demo state, half-finished SQLAlchemy state, no migrations, no Supabase state, and no production seed/rollback story.
- Safe modification: Choose one target database for Node, create migrations first, then write import scripts from `backend/mock_data.py` only as fixture/seed data.
- Test coverage: No tests exercise DB initialization, schema migration, seed idempotency, or rollback.

**Docker/Dokploy deployment path is ambiguous:**
- Files: `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`, `docker-compose.yml`, `.dockerignore`, `vite.config.ts`
- Why fragile: There are three container strategies, one invalid compose file, a frontend dev-server Dockerfile, and an all-in-one image that initializes Postgres at build time.
- Safe modification: For Dokploy, provide one production `Dockerfile` per service or a valid compose file with externalized Postgres and matching healthchecks.
- Test coverage: No deploy smoke test or `docker compose config` check is part of scripts.

**Stellar/Soroban integration is split across mocks, unreachable Python, and Rust contract:**
- Files: `backend/services/stellar_service.py`, `backend/services/blockchain_service.py`, `soroban-contract/src/contract.rs`, `soroban-contract/contract.rs`, `CHANGELOG_BLOCKCHAIN.md`
- Why fragile: Backend marketplace uses mock Stellar hashes; real transfer code is unreachable; root `soroban-contract/contract.rs` is a template separate from `soroban-contract/src/contract.rs`.
- Safe modification: Treat `soroban-contract/src/contract.rs` as the only candidate contract source and define a Node adapter boundary for mint/unlock/transfer/burn.
- Test coverage: No Rust contract tests and no backend tests for real Stellar/Soroban enabled mode.

**Impact engine types are out of sync:**
- Files: `src/services/impact-engine/types.ts`, `src/services/impact-engine/engine/calculator.ts`, `src/services/impact-engine/engine/composer.ts`, `src/services/impact-engine/engine/calculateScope1.ts`, `src/services/impact-engine/engine/calculateScope2.ts`, `src/services/impact-engine/engine/calculateScope3.ts`
- Why fragile: Several engine modules import missing type exports and assume optional input sections are present.
- Safe modification: Repair the TypeScript model before wiring calculation output to backend persistence.
- Test coverage: No impact-engine unit tests detected.

## Scaling Limits

**API cannot scale beyond one process without losing state:**
- Current capacity: One Python process with in-memory `USERS`, `PROJECTS`, `TRANSACTIONS`, and `ACTIVE_SESSIONS`.
- Limit: Multiple workers, restarts, deploys, or horizontal scaling lose sessions and mutations.
- Scaling path: Move state to Postgres/Supabase or another durable database and use server-side transactions for marketplace operations.

**All-in-one container model blocks production-grade database operations:**
- Current capacity: Root `Dockerfile` installs Postgres inside the API image and creates the database during image build.
- Limit: Data lifecycle, backups, migrations, secret rotation, and Dokploy healthchecks become coupled to image build/runtime.
- Scaling path: Use managed/external Postgres and run migrations at deploy time, not during Docker image build.

**Uploads are memory-bound and storage-less:**
- Current capacity: `MAX_UPLOAD_BYTES` defaults to 10 MB and the entire upload is read into memory.
- Limit: Larger files, concurrent uploads, malware scanning, and audit evidence retention are not supported.
- Scaling path: Stream uploads to object storage with DB metadata and async processing.

**No rate limiting is active on the running app:**
- Current capacity: `backend/core/limiter.py` defines a limiter, but `backend/main.py` does not import or attach it.
- Limit: Public unauthenticated endpoints can be spammed.
- Scaling path: Add rate limiting at the Node API gateway/app layer and test limits on login/upload/mutation endpoints.

## Dependencies at Risk

**Python backend modules depend on packages outside the lock contract:**
- Risk: Importing legacy routers fails in clean installs.
- Impact: Any plan that reuses legacy auth/DB code as a working source will stall.
- Migration plan: Use `backend/main.py` as behavior source and `backend/api/*` only as reference after dependency/schema triage.

**Frontend docs describe dependencies that are absent:**
- Risk: Planning around TanStack Router/React Query conflicts with `package.json`.
- Impact: New code may introduce a second routing/data-fetching stack.
- Migration plan: Either update docs to React Router + custom fetch services or deliberately add a single query/caching library during a separate frontend phase.

**Soroban build artifacts are coupled to local toolchain state:**
- Risk: Tracked `soroban-contract/target` can mask reproducibility problems and bloats CI.
- Impact: Contract builds may appear available locally while fresh environments fail.
- Migration plan: Ignore target output, keep `soroban-contract/Cargo.toml` and source only, and add contract build/test commands to CI.

## Missing Critical Features

**Production authentication and authorization:**
- Problem: Active backend lacks persistent identity, password hashing, role guards on business routes, refresh-token lifecycle, and Supabase/OAuth integration.
- Blocks: Any production launch or regulated demo with real users and financial/environmental assets.

**Canonical API schema for the Node rewrite:**
- Problem: The active schema lives across `backend/main.py`, `backend/mock_data.py`, `src/data/mrca_db.ts`, and `docs/BACKEND_INTEGRATION_SPEC.md`.
- Blocks: Safe Python-to-Node replacement without frontend regressions.

**Database migration strategy:**
- Problem: No migrations, no env template, no production DB connection policy, and no local/prod drift controls.
- Blocks: Moving from mock data to durable production data.

**Production deployment contract:**
- Problem: Compose is invalid, Dockerfiles disagree, no Dokploy-specific config exists, and healthchecks/ports are inconsistent.
- Blocks: Repeatable deployment and rollback.

**Observability and audit trail:**
- Problem: No structured logging, error tracking, audit-event persistence, or transaction/audit immutable history exists in the active API.
- Blocks: Compliance claims around marketplace purchases, audit decisions, and credit retirement.

## Test Coverage Gaps

**Backend active contract:**
- What's not tested: Active `/api/v1/*` responses that frontend pages consume, unauthenticated/unauthorized access, session expiration, upload validation, and mutation persistence.
- Files: `backend/main.py`, `tests/test_api_integration.py`, `src/services/database.ts`, `src/contexts/AuthContext.tsx`
- Risk: Node rewrite can pass superficial health checks while breaking dashboard flows.
- Priority: High

**Legacy DB routers and migrations:**
- What's not tested: SQLAlchemy routers, schema creation, pgvector extension, seed script, auth token persistence, role authorization.
- Files: `backend/api/*.py`, `backend/core/database.py`, `backend/data/seed.py`, `backend/models/*.py`
- Risk: Dead code may be mistaken for production-ready behavior.
- Priority: High

**Frontend type and API failure states:**
- What's not tested: TypeScript strict errors, hardcoded localhost calls, invalid API response shapes, and fallback behavior when the API is down.
- Files: `src/services/api.ts`, `src/services/database.ts`, `src/pages/Dashboard/RetireCredits.tsx`, `src/pages/Dashboard/MrcaDetails.tsx`, `tsconfig.app.json`
- Risk: Vite build can pass while production UX fails.
- Priority: High

**Deployment validation:**
- What's not tested: `docker compose config`, image startup, healthchecks, static frontend serving, env var presence, external Postgres connectivity.
- Files: `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`, `docker-compose.yml`, `.dockerignore`
- Risk: Dokploy/deploy failures appear late.
- Priority: High

**Stellar/Soroban real mode:**
- What's not tested: `STELLAR_ENABLED=true`, missing key handling, transfer/burn success paths, contract auth rules, Rust contract build/test.
- Files: `backend/services/stellar_service.py`, `soroban-contract/src/contract.rs`, `soroban-contract/Cargo.toml`
- Risk: Marketplace can issue mock hashes while real settlement is nonfunctional.
- Priority: High

**GUI smoke script is machine-specific:**
- What's not tested: Cross-platform browser flows in CI.
- Files: `tests/test_gui_flows.py`
- Risk: Screenshots write to a hardcoded Windows path and local ports, so the script is not a reusable verification gate.
- Priority: Medium

---

*Concerns audit: 2026-05-22*
