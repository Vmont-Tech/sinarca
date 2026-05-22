# Coding Conventions

**Analysis Date:** 2026-05-22

## Naming Patterns

**Files:**
- Use PascalCase for React pages, layouts, and component files: `src/pages/Dashboard/Overview.tsx`, `src/components/ProtectedRoute.tsx`, `src/layouts/DashboardLayout.tsx`.
- Use camelCase for frontend service and engine helper files: `src/services/database.ts`, `src/services/api.ts`, `src/services/impact-engine/inputs/normalizeInputs.ts`.
- Keep domain engine folders by responsibility: `src/services/impact-engine/engine/`, `src/services/impact-engine/inputs/`, `src/services/impact-engine/output/`, `src/services/impact-engine/profiles/`.
- Use snake_case for Python backend modules: `backend/services/stellar_service.py`, `backend/validators/file_validator.py`, `backend/mock_data.py`.
- Backend model modules mix Portuguese canonical names with English compatibility aliases: `backend/models/projeto.py` and `backend/models/project.py`, `backend/models/credito_ambiental.py` and `backend/models/environmental_credit.py`. Preserve aliases when touching legacy Python code.
- Do not add application code under design snapshot folders such as `novas telas painel/stitch_dashboard_de_vis_o_geral (12)/code.html`; those files are static reference artifacts.

**Functions:**
- Use PascalCase for React components: `App` in `src/App.tsx`, `ProtectedRoute` in `src/components/ProtectedRoute.tsx`, `SinarcaImpactCalculator` in `src/components/calculator/SinarcaImpactCalculator.tsx`.
- Use camelCase for frontend utility functions and service methods: `apiGet`, `apiPost`, `apiPatch` in `src/services/api.ts`; `runSIEv11` and `runImpactEngine` in `src/services/impact-engine/index.ts`.
- Use snake_case for Python route handlers and helpers: `list_projects`, `get_project`, `_find_project`, `_ensure_demo_users` in `backend/main.py`.
- Prefix private Python helpers with `_` when they are module-internal: `_cors_origins`, `_auth_response`, `_validate_public_role` in `backend/main.py`.

**Variables:**
- Use camelCase for frontend state and local variables: `isAuthenticated`, `isLoading`, `expiresAt` in `src/contexts/AuthContext.tsx`.
- Use UPPER_SNAKE_CASE for module constants in TypeScript and Python: `API_BASE_URL` in `src/services/api.ts`; `API_PREFIX`, `SESSION_TTL_SECONDS`, `MERCHANT_TRANSACTION_FEE_RATE` in `backend/main.py`.
- Preserve public API field names exactly when mapping data: camelCase fields such as `friendlyId`, `carbonStock`, and `expiresAt` appear beside snake_case and Portuguese fields such as `access_token`, `expires_at`, `escopo_1`, and `quantidade` in `backend/main.py`, `src/services/database.ts`, and `src/contexts/AuthContext.tsx`.
- Use explicit role literals for auth and access flow: `UserRole` in `src/contexts/AuthContext.tsx` and `PUBLIC_AUTH_ROLES` in `backend/main.py`.

**Types:**
- Use PascalCase for TypeScript interfaces and type aliases: `RawInput`, `SIEResult`, `ProfileType` in `src/services/impact-engine/types.ts`.
- Use Pydantic request class names with the `Request` suffix for FastAPI payloads: `LoginRequest`, `RegisterRequest`, `BuyRequest`, `CompensateRequest` in `backend/main.py`.
- Use dataclasses for dependency configuration objects that read env defaults: `StellarConfig` in `backend/services/stellar_service.py`.
- Use SQLAlchemy enum classes in PascalCase with uppercase values: `UserType` in `backend/models/user.py`.

## Code Style

**Formatting:**
- Formatter: Not detected. There is no `.prettierrc`, `biome.json`, Python formatter config, or Ruff config in the repository.
- TypeScript formatting is mixed across files. Preserve the surrounding file style and avoid whole-file formatting churn in files such as `src/App.tsx`, `src/contexts/AuthContext.tsx`, and `src/main.tsx`.
- New TypeScript modules should prefer semicolons and explicit return types for exported functions, matching `src/services/api.ts`, `src/services/database.ts`, and `src/services/impact-engine/index.ts`.
- New Python code should use 4-space indentation, type annotations on public helpers, and `dict[str, Any]` style annotations, matching `backend/main.py` and `backend/services/stellar_service.py`.

**Linting:**
- Frontend linting uses ESLint flat config in `eslint.config.js`.
- `eslint.config.js` enables `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`.
- `eslint.config.js` intentionally disables strict hygiene rules: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `no-unused-vars`, `prefer-const`, and multiple React Hooks rules.
- TypeScript compiler settings in `tsconfig.app.json` and `tsconfig.node.json` are strict, but `package.json` runs `vite build` without `tsc --build`; do not assume `npm run build` enforces all TypeScript diagnostics.
- Python linting is not configured in `pyproject.toml`. No Ruff, Black, mypy, pyright, pylint, or isort config is present.

## Import Organization

**Order:**
1. External packages first: `react`, `react-router-dom`, `lucide-react`, `fastapi`, `pydantic`, `sqlalchemy`.
2. Local assets, contexts, services, and components next: `src/assets/logo.png`, `src/contexts/AuthContext.tsx`, `src/services/database.ts`.
3. Type-only imports use `import type` in TypeScript when practical: `src/services/impact-engine/types.ts`, `src/data/mrca_db.ts`.

**Path Aliases:**
- Not detected. TypeScript imports use relative paths in `src/App.tsx`, `src/services/database.ts`, and `src/pages/Dashboard/Overview.tsx`.
- Python imports use package-qualified `backend.*` paths: `backend.main`, `backend.services.stellar_service`, `backend.core.database`.

**Backend import rules:**
- Keep standard library imports above third-party imports and `backend.*` imports, matching `backend/main.py` and `backend/services/stellar_service.py`.
- Avoid introducing imports for packages missing from `pyproject.toml`. Legacy modules import undeclared packages such as `sqlalchemy`, `python-dotenv`, `python-jose`, `passlib`, `slowapi`, `boto3`, and `stellar_sdk` in `backend/core/database.py`, `backend/core/security.py`, `backend/api/auth/auth.py`, `backend/core/limiter.py`, `backend/services/s3_services.py`, and `backend/services/stellar_service.py`.

## Error Handling

**Patterns:**
- Frontend API calls should go through `request` in `src/services/api.ts`; it attaches the bearer token, JSON-encodes object bodies, parses backend `detail` or `message`, and throws `Error`.
- Frontend auth flows catch service errors at the UI/context boundary: `src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`, and `src/pages/Dashboard/Settings.tsx`.
- Use `ErrorBoundary` in `src/ErrorBoundary.tsx` for render-time React failures; do not use it as a replacement for service-level error states.
- Backend API errors use `HTTPException` with explicit status codes and Portuguese user-facing `detail` strings in `backend/main.py`, `backend/api/auth/auth.py`, `backend/api/projects/projects.py`, and `backend/api/market/marketplace.py`.
- Backend infrastructure setup failures use `RuntimeError` in `backend/core/database.py`. Keep infrastructure errors separate from HTTP route errors.
- Validate public payload constraints with Pydantic `Field` and `Literal` types where possible, as in `InventoryDeclarationRequest`, `AuditStatusUpdateRequest`, `BuyRequest`, and `RoleFlowRequest` in `backend/main.py`.

## Logging

**Framework:** console/print

**Patterns:**
- Frontend uses `console.error` and `console.warn` in `src/ErrorBoundary.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/Dashboard/Feed.tsx`, `src/pages/Dashboard/Overview.tsx`, and `src/pages/Dashboard/ImpactLeaders.tsx`.
- Backend uses `print` in `backend/services/stellar_service.py` and `backend/data/seed.py`; no structured Python logging configuration is present.
- New backend rewrite code should introduce a single structured logger boundary instead of spreading `print` calls. Preserve existing message intent from `backend/services/stellar_service.py` when replacing the implementation.

## Comments

**When to Comment:**
- Use comments for domain flow markers and migration-sensitive behavior, matching route grouping comments in `src/App.tsx`, engine step comments in `src/services/impact-engine/index.ts`, and auth fallback comments in `src/contexts/AuthContext.tsx`.
- Keep comments close to non-obvious business rules such as role normalization in `src/contexts/AuthContext.tsx`, file upload limits in `backend/main.py`, and Stellar mock behavior in `backend/services/stellar_service.py`.
- Avoid adding comments that repeat obvious code mechanics in simple render components such as `src/components/ProtectedRoute.tsx`.

**JSDoc/TSDoc:**
- Sparse. TypeScript relies on interfaces and inline comments in `src/services/impact-engine/types.ts`.
- Python uses docstrings for service-level intent in `backend/services/stellar_service.py` and for the pytest fixture in `tests/test_api_integration.py`.

## Function Design

**Size:** Use smaller functions for new code. Large existing files concentrate routing and UI flows: `backend/main.py` has 602 lines, `src/LandingPage.tsx` has 449 lines, `src/pages/Dashboard/ApiDocs.tsx` has 431 lines, and `src/pages/Dashboard/Overview.tsx` has 411 lines.

**Parameters:** Prefer object payloads for service calls and request handlers:
- Frontend service methods use path plus optional body: `apiPost<T>(path, body)` in `src/services/api.ts`.
- FastAPI handlers accept Pydantic payloads: `buy_credit(payload: BuyRequest)` and `compensate_credit(payload: CompensateRequest)` in `backend/main.py`.
- Avoid adding positional-heavy service APIs like `comprar_credito(credit_id, buyer_id, quantidade, db)` in `backend/api/market/marketplace.py`.

**Return Values:** Use explicit envelopes for API responses:
- Backend route handlers return `{"success": True, ...}` envelopes in `backend/main.py`.
- Frontend service adapters normalize envelopes into UI-specific shapes in `src/services/database.ts`.
- Pure engine functions return primitive numbers or typed objects: `calculateScope1` in `src/services/impact-engine/engine/calculateScope1.ts`, `runSIEv11` in `src/services/impact-engine/index.ts`.

## Module Design

**Exports:**
- Pages mostly use default exports for route components: `src/pages/Login.tsx`, `src/pages/Dashboard/Overview.tsx`, `src/pages/Public/AboutSinarca.tsx`.
- Shared utilities and components often use named exports: `apiGet` in `src/services/api.ts`, `database` in `src/services/database.ts`, `ProtectedRoute` in `src/components/ProtectedRoute.tsx`, `useAuth` in `src/contexts/AuthContext.tsx`.
- Backend modules expose module-level FastAPI route functions and shared globals in `backend/main.py`; tests import those globals directly from `tests/test_api_integration.py`.

**Barrel Files:**
- `src/services/impact-engine/index.ts` is the main frontend barrel for the impact engine and re-exports `runImpactEngine`.
- `backend/models/project.py`, `backend/models/credit_transaction.py`, `backend/models/environmental_credit.py`, and `backend/models/audit.py` act as compatibility alias modules.
- Do not add broad `index.ts` barrels across `src/pages/` or `src/components/`; route imports in `src/App.tsx` are explicit and path-based.

## Frontend TypeScript Patterns

- Routing is centralized in `src/App.tsx` with `react-router-dom` `BrowserRouter`, nested `Route`, `Navigate`, and `Outlet` through `src/layouts/DashboardLayout.tsx` and `src/layouts/PublicLayout.tsx`.
- Authentication state is context-based in `src/contexts/AuthContext.tsx`, persisted in `localStorage`, and consumed through `useAuth`.
- Protected dashboard routes flow through `src/components/ProtectedRoute.tsx` and redirect unauthenticated users to `/login`.
- API access is centralized in `src/services/api.ts`; higher-level domain reads and shape adapters live in `src/services/database.ts`.
- Impact calculation logic is isolated from React under `src/services/impact-engine/` and should stay pure where possible.
- UI code relies heavily on `any` in dashboard pages and services, especially `src/services/database.ts`, `src/layouts/DashboardLayout.tsx`, `src/pages/Dashboard/UserProfile.tsx`, and `src/pages/Dashboard/ImpactLeaders.tsx`. New migration-facing code should add explicit DTO types before replacing backend contracts.

## Backend Python Patterns

- `backend/main.py` contains the active integrated FastAPI app, in-memory datasets from `backend/mock_data.py`, Pydantic request classes, auth session state, and API routes under `/api/v1`.
- `backend/api/*` contains SQLAlchemy-router style modules that are not wired from `backend/main.py`; treat them as legacy backend surface unless an entry point imports them.
- `backend/core/database.py` defines the SQLAlchemy engine/session globals and `get_db`; `backend/core/security.py` defines dependency-based user auth for SQLAlchemy routes.
- `backend/mock_data.py` is the canonical in-memory fixture source for `backend/main.py` and `tests/test_api_integration.py`.
- `backend/services/stellar_service.py` is the blockchain adapter boundary. Its mock path returns deterministic response shape fields, and the enabled path contains unreachable code after an early return in `burn_credit`.

## Migration Risks For Node Rewrite

- Preserve the `/api/v1` route prefix from `backend/main.py` because `vite.config.ts` proxies `/api` to the API server and `src/services/api.ts` defaults to `/api/v1`.
- Preserve auth response aliases from `backend/main.py`: `token`, `access_token`, `refresh_token`, `expires_at`, `expires_in_seconds`, and `user`. `src/contexts/AuthContext.tsx` accepts both `token` and `access_token`.
- Preserve mixed payload field names during the first Node backend pass. The frontend sends both `email` and `dadoLogin` from `src/contexts/AuthContext.tsx`; inventory and marketplace flows use Portuguese fields such as `escopo_1`, `escopo_2`, `escopo_3`, and `quantidade` in `backend/main.py`.
- Preserve frontend envelope expectations in `src/services/database.ts`: project lists need a top-level `projects` array, single project reads need `project`, and catalog endpoints need arrays under `certifiers`, `auditors`, `companies`, and `inventory`.
- Contract drift exists between docs and implementation: `README.md` mentions TanStack Router/React Query, but `package.json` and `src/App.tsx` use `react-router-dom` and no React Query dependency.
- Docker validation is part of quality risk: `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`, and `docker-compose.yml` exist, but `docker compose config` fails to parse `docker-compose.yml`.
- Keep secrets out of generated docs. `.gitignore` and `.dockerignore` exclude `.env` and `.env.*`.

## Verification Snapshot

- `npm ci` succeeds using `package-lock.json`; it reports audit findings from declared npm dependencies.
- `npm run lint` succeeds with one warning in `src/pages/Dashboard/Feed.tsx` for `react-hooks/exhaustive-deps`.
- `npm run build` succeeds with a Vite chunk-size warning for the main JavaScript bundle under `dist/assets/`.
- `uv run pytest -q` fails because `pytest` is not declared in `pyproject.toml`.
- `uv run --with pytest pytest -q tests/test_api_integration.py` fails during collection because `httpx` is not declared for `fastapi.testclient`.
- `uv run --with pytest --with httpx pytest -q tests/test_api_integration.py` runs and reports 6 passing tests and 3 failing tests against `backend/main.py` and `backend/services/stellar_service.py`.
- `docker compose config` fails YAML parsing for `docker-compose.yml`.

---

*Convention analysis: 2026-05-22*
