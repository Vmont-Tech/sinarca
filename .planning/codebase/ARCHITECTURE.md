<!-- refreshed: 2026-05-22 -->
# Architecture

**Analysis Date:** 2026-05-22

## System Overview

```text
+-------------------------------------------------------------+
| React/Vite SPA at repository root                            |
| `index.html` -> `src/main.tsx` -> `src/App.tsx`              |
| Public routes, dashboard routes, layouts, pages, components   |
+--------------------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| Frontend service seams                                        |
| `src/services/api.ts`, `src/services/database.ts`,            |
| `src/contexts/AuthContext.tsx`, `src/services/impact-engine/` |
+--------------------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| Runtime backend API                                           |
| `backend/main.py` FastAPI app with inline `/api/v1/*` routes  |
| Uses `backend/mock_data.py` in-memory datasets and             |
| `backend/services/stellar_service.py` mock/partial Stellar     |
+--------------------------+----------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| Supporting / legacy / deployment layers                       |
| `backend/api/*` APIRouter modules not mounted by runtime app   |
| `backend/models/*` SQLAlchemy models not used by `main.py`     |
| `soroban-contract/` Rust Soroban contract                      |
| `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`          |
+-------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Browser entry | Loads React into `#root` and wraps the app in the error boundary. | `src/main.tsx` |
| Route registry | Owns all current public and protected route definitions. | `src/App.tsx` |
| Public shell | Provides header/footer wrapper for `/public/*` routes. | `src/layouts/PublicLayout.tsx` |
| Dashboard shell | Provides role-aware sidebar, top bar, and `<Outlet />` for `/painel/*`. | `src/layouts/DashboardLayout.tsx` |
| Auth provider | Owns browser auth state, token persistence, session bootstrap, login/register/profile calls. | `src/contexts/AuthContext.tsx` |
| Route guard | Blocks `/painel/*` when `AuthContext` is unauthenticated. | `src/components/ProtectedRoute.tsx` |
| HTTP client | Centralizes `fetch`, `/api/v1` default base URL, `VITE_API_URL`, bearer headers, JSON/FormData handling, and error conversion. | `src/services/api.ts` |
| Data facade | Maps backend project/certifier/auditor/company/inventory shapes into UI feed/map shapes. | `src/services/database.ts` |
| Local impact engine | Computes SIE v1.1 emissions entirely in the browser; it does not call the backend. | `src/services/impact-engine/index.ts` |
| FastAPI runtime | Current backend app root and source of live `/health` and `/api/v1/*` routes. | `backend/main.py` |
| Mock data store | Current backend persistence substitute for projects, users, inventory, companies, certifiers, auditors, and transactions. | `backend/mock_data.py` |
| Stellar adapter | Gateway used by marketplace buy/compensate endpoints; mock mode is the functional path. | `backend/services/stellar_service.py` |
| SQLAlchemy skeleton | Contains database/session setup and model base for a relational backend path, but is not initialized by `backend/main.py`. | `backend/core/database.py` |
| Modular API skeleton | Contains APIRouter modules for auth/projects/audit/inventory/market that are not included in the runtime FastAPI app. | `backend/api/` |
| ORM models | Defines PostgreSQL-oriented entities for users, projects, credits, audits, documents, NFC tags, and related records. | `backend/models/` |
| Soroban contract | Rust `no_std` contract for locked mint, unlock, transfer, burn, and views. | `soroban-contract/src/contract.rs` |
| Production container | Builds Vite assets, installs Python API, starts Postgres in-container, and runs `uvicorn backend.main:app` on port 80. | `Dockerfile` |
| Split API container | Python-only API image exposing uvicorn on port 5680. | `Dockerfile.api` |
| Split frontend container | Vite dev-server image exposing port 5173. | `Dockerfile.frontend` |

## Pattern Overview

**Overall:** Monorepo SPA plus inline API MVP, with an unmounted relational backend skeleton and a separate Rust smart-contract crate.

**Key Characteristics:**
- Use `src/` as the frontend application root; there is no `frontend/` directory. The Vite entry chain is `index.html` -> `src/main.tsx` -> `src/App.tsx`.
- Treat `backend/main.py` as the current backend runtime. It owns the routes consumed by the frontend and should be the primary source when porting behavior to Node.
- Treat `backend/api/*`, `backend/core/*`, and `backend/models/*` as legacy or planned relational architecture unless they are explicitly wired into a future runtime.
- Preserve the frontend HTTP contract at `src/services/api.ts` and `src/services/database.ts` during any Python-to-Node rewrite.
- Keep the Soroban contract in `soroban-contract/` separate from the web/API runtime; the Python backend currently simulates blockchain behavior instead of invoking the contract.

## Layers

**Browser Bootstrap:**
- Purpose: Mount the React SPA and catch render-time errors.
- Location: `index.html`, `src/main.tsx`, `src/ErrorBoundary.tsx`
- Contains: DOM root, global font links, global error script, React root creation, error boundary.
- Depends on: `react`, `react-dom`, `src/index.css`, `src/App.tsx`
- Used by: Vite dev/build pipeline in `package.json` and `vite.config.ts`

**Routing and Shells:**
- Purpose: Define public and protected navigation topology.
- Location: `src/App.tsx`, `src/layouts/PublicLayout.tsx`, `src/layouts/DashboardLayout.tsx`
- Contains: `BrowserRouter`, nested `Routes`, public layout, dashboard layout, role-aware menu items.
- Depends on: `react-router-dom`, `src/contexts/AuthContext.tsx`, route page components in `src/pages/`
- Used by: All rendered frontend pages.

**Frontend Domain Pages and Components:**
- Purpose: Render dashboard workflows, public explorer pages, maps, marketplace, profiles, and calculator UI.
- Location: `src/pages/`, `src/components/`
- Contains: Route-level pages in `src/pages/Dashboard/` and `src/pages/Public/`, reusable map/cards/layout widgets in `src/components/`.
- Depends on: `src/services/database.ts`, `src/services/api.ts`, `src/contexts/AuthContext.tsx`, static assets in `src/assets/`.
- Used by: Routes declared in `src/App.tsx`.

**Frontend API/Data Facade:**
- Purpose: Isolate the browser from backend base URL, token headers, response parsing, and UI-specific mapping.
- Location: `src/services/api.ts`, `src/services/database.ts`
- Contains: `apiGet`, `apiPost`, `apiPatch`, project list mapping, search, detail lookup, certifier/auditor/company/inventory fetches.
- Depends on: Browser `fetch`, `localStorage`, `VITE_API_URL`, current backend response shapes.
- Used by: `src/contexts/AuthContext.tsx`, `src/pages/Dashboard/*`, `src/components/maps/*`, `src/components/PublicMapExperience.tsx`.

**Local Impact Engine:**
- Purpose: Compute SIE v1.1 emissions and compensation guidance in the frontend.
- Location: `src/services/impact-engine/`
- Contains: Profile detection, normalization, validation, scope 1/2/3 calculators, uncertainty/classification/scenario engines, output translators.
- Depends on: Static factors in `src/services/impact-engine/factors/`.
- Used by: `src/components/calculator/SinarcaImpactCalculator.tsx`.

**Current Backend Runtime:**
- Purpose: Serve the API contract currently used by the SPA.
- Location: `backend/main.py`
- Contains: FastAPI app, CORS, inline Pydantic request models, in-memory session map, inline endpoints for auth, workflow, projects, inventory, audit, certifier, marketplace, Stellar status, transactions, and optional SPA fallback.
- Depends on: `backend/mock_data.py`, `backend/services/stellar_service.py`, environment variables read with `os.getenv`.
- Used by: `Dockerfile`, `Dockerfile.api`, tests in `tests/test_api_integration.py`, frontend API calls.

**Backend Data State:**
- Purpose: Provide MVP data without database persistence.
- Location: `backend/mock_data.py`
- Contains: Mutable lists/dicts for `PROJECTS`, `USERS`, `TRANSACTIONS`, `INVENTORY`, and actor registries.
- Depends on: Python module import state.
- Used by: `backend/main.py`.

**Legacy Relational Backend Skeleton:**
- Purpose: Planned or earlier SQLAlchemy architecture for persistent API modules.
- Location: `backend/api/`, `backend/core/`, `backend/models/`, `backend/data/seed.py`
- Contains: APIRouter modules, JWT helpers, SQLAlchemy session setup, model definitions, seed script.
- Depends on: `DATABASE_URL`, SQLAlchemy, Pydantic, passlib, jose, brutils, dotenv.
- Used by: Not mounted by `backend/main.py`; do not assume these routes are live.

**Blockchain Contract and Adapter:**
- Purpose: Model token lifecycle and provide API-facing blockchain operation results.
- Location: `soroban-contract/src/contract.rs`, `backend/services/stellar_service.py`, `backend/services/blockchain_service.py`
- Contains: Soroban contract state and methods; Python Stellar adapter with mock transfer/burn paths; older UUID-only blockchain service.
- Depends on: `soroban-sdk` in `soroban-contract/Cargo.toml`, Python environment variables for Stellar config.
- Used by: `backend/main.py` uses `StellarService`; the Rust contract is not invoked by the runtime backend.

**Deployment:**
- Purpose: Build and run the combined or split application.
- Location: `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`, `docker-compose.yml`, `.devcontainer/`
- Contains: Combined Vite+Python image, split API image, split Vite dev image, Rust/Soroban devcontainer.
- Depends on: Node 20, Python 3.11, uv, uvicorn, optional Postgres, Rust toolchain for contract work.
- Used by: Local/container deployment flows. No Dokploy-specific file was detected.

## Data Flow

### Primary Request Path

1. Browser loads `index.html`, which points to `/src/main.tsx` (`index.html:32`).
2. React mounts `<App />` under `#root` through `createRoot` (`src/main.tsx:7`).
3. `App` wraps routes in `<AuthProvider>` and `<BrowserRouter>` (`src/App.tsx:59`).
4. Public pages render directly; `/painel/*` enters `ProtectedRoute` first (`src/App.tsx:101`, `src/components/ProtectedRoute.tsx:4`).
5. Data-consuming pages call `database.*` or `api*` helpers (`src/services/database.ts:61`, `src/services/api.ts:43`).
6. `request()` adds bearer token from `localStorage`, serializes JSON/FormData, and fetches `${API_BASE_URL}${path}` (`src/services/api.ts:9`, `src/services/api.ts:23`).
7. `backend/main.py` handles the matching inline route under `/api/v1` and reads/mutates `backend/mock_data.py` module state (`backend/main.py:27`, `backend/main.py:309`).
8. The frontend facade maps response shapes for feed/maps/details before route components render (`src/services/database.ts:24`, `src/services/database.ts:81`).

### Authentication Flow

1. `AuthProvider` checks `localStorage` for `sinarca_token` and expiry during bootstrap (`src/contexts/AuthContext.tsx:58`).
2. A valid local token triggers `GET /auth/me` through `apiGet` (`src/contexts/AuthContext.tsx:65`).
3. Login posts `{ email, dadoLogin, password, role }` to `/auth/login` (`src/contexts/AuthContext.tsx:99`).
4. `backend/main.py` checks the mutable `USERS` list and returns a generated opaque token in `_auth_response` (`backend/main.py:187`, `backend/main.py:225`).
5. `AuthProvider` persists `sinarca_user`, `sinarca_token`, and `sinarca_token_expires_at` (`src/contexts/AuthContext.tsx:91`).
6. `ProtectedRoute` gates `/painel/*` using `isAuthenticated` from context (`src/components/ProtectedRoute.tsx:4`).

**State Management:**
- Frontend state is local React state and context. Authentication/session state is persisted in browser `localStorage` by `src/contexts/AuthContext.tsx`.
- Backend runtime state is module-level mutable memory: `ACTIVE_SESSIONS` in `backend/main.py` and `PROJECTS`, `USERS`, `TRANSACTIONS` in `backend/mock_data.py`.
- SQLAlchemy persistence exists in `backend/core/database.py` and `backend/models/*` but is not part of the current runtime path.

### Marketplace and Credit Flow

1. `CreditMarketplace` loads available credits from `GET /marketplace` (`src/pages/Dashboard/CreditMarketplace.tsx:36`).
2. Buy actions post to `/marketplace/buy` through `apiPost` (`src/pages/Dashboard/CreditMarketplace.tsx:50`).
3. `backend/main.py` validates project stock, calls `StellarService.transfer_credit`, appends a transaction, and decrements `project["metrics"]["carbonStock"]` (`backend/main.py:478`).
4. `RetireCredits` bypasses the shared API helper and posts directly to `http://127.0.0.1:5680/api/v1/marketplace/compensate` (`src/pages/Dashboard/RetireCredits.tsx:169`).
5. `backend/main.py` calls `StellarService.burn_credit`, appends burn metadata, and returns certificate data (`backend/main.py:515`).

### Certifier and Audit Flow

1. `CertifierReview` loads `/certifier/queue` and patches `/certifier/projects/:id/decision` (`src/pages/Dashboard/CertifierReview.tsx:21`, `src/pages/Dashboard/CertifierReview.tsx:35`).
2. `backend/main.py` transitions project status between `AUDITED`, `SUSPENDED`, and `CREATED` and appends timeline events (`backend/main.py:423`, `backend/main.py:429`).
3. `AuditorReview` loads `/audit/queue` and patches `/audit/verify/:projectId` (`src/pages/Dashboard/AuditorReview.tsx:21`, `src/pages/Dashboard/AuditorReview.tsx:35`).
4. `backend/main.py` transitions project status between `AVAILABLE`, `SUSPENDED`, and `CREATED` and appends timeline events (`backend/main.py:386`, `backend/main.py:392`).

### Calculator Flow

1. `SinarcaImpactCalculator` collects browser-side inputs and calls `runSIEv11` (`src/components/calculator/SinarcaImpactCalculator.tsx:50`).
2. `runSIEv11` detects profile, normalizes input, validates ranges, computes scopes, uncertainty, classification, scenarios, compensation, and a mock hash (`src/services/impact-engine/index.ts:14`).
3. The result page links the user toward `/public/consulta`; no backend write occurs from the calculator result path (`src/components/calculator/SinarcaImpactCalculator.tsx:325`).

### Static SPA Serving Flow

1. The combined `Dockerfile` builds the frontend with Node and copies `dist` into `/app/frontend/dist` (`Dockerfile:4`, `Dockerfile:53`).
2. The Python image sets `FRONTEND_DIST_DIR` and starts `uvicorn backend.main:app` (`Dockerfile:70`, `Dockerfile:75`).
3. `backend/main.py` mounts `/assets` and returns `index.html` for non-API paths when `FRONTEND_DIST_DIR` exists (`backend/main.py:589`).

## Key Abstractions

**API Helpers:**
- Purpose: Keep HTTP base URL, auth header, body serialization, and error extraction in one place.
- Examples: `src/services/api.ts`
- Pattern: Thin typed wrapper around browser `fetch`; all new frontend API calls should use this helper.

**Database Facade:**
- Purpose: Hide backend response shape and expose UI-oriented project/search/map accessors.
- Examples: `src/services/database.ts`
- Pattern: Service object with async methods and mapping helpers; add new read models here when multiple pages consume the same API shape.

**Auth Context:**
- Purpose: Expose `user`, `isAuthenticated`, loading state, login, register, update profile, gov.br fallback, and logout.
- Examples: `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`
- Pattern: React context plus `localStorage`; keep route guards dependent on context rather than direct storage reads.

**Inline FastAPI Contract:**
- Purpose: Current source of truth for live backend behavior and response shape.
- Examples: `backend/main.py`
- Pattern: Single-file API MVP using Pydantic request models and mutable module-level collections.

**Legacy Router/ORM Skeleton:**
- Purpose: Earlier or planned persistent backend modules.
- Examples: `backend/api/auth/auth.py`, `backend/api/projects/projects.py`, `backend/models/projeto.py`, `backend/core/database.py`
- Pattern: APIRouter + SQLAlchemy models, but not included by the runtime app. Wire deliberately or port selectively; do not add isolated code here expecting the current API to change.

**Impact Engine Pipeline:**
- Purpose: Deterministic client-side emissions estimate pipeline.
- Examples: `src/services/impact-engine/index.ts`, `src/services/impact-engine/engine/*`, `src/services/impact-engine/factors/*`
- Pattern: Small pure functions composed by `runSIEv11`.

**Blockchain Adapter:**
- Purpose: Return blockchain-like transaction hashes/modes to API consumers.
- Examples: `backend/services/stellar_service.py`, `soroban-contract/src/contract.rs`
- Pattern: Runtime API uses the Python adapter; the Soroban contract defines intended on-chain behavior but is not called by the API.

## Entry Points

**Frontend SPA:**
- Location: `index.html`, `src/main.tsx`, `src/App.tsx`
- Triggers: Vite dev server or built static asset load.
- Responsibilities: Boot React, register route tree, apply auth provider, render public/dashboard shells.

**Current Backend API:**
- Location: `backend/main.py`
- Triggers: `uvicorn backend.main:app` from `Dockerfile`, `Dockerfile.api`, or local CLI.
- Responsibilities: Serve `/health`, `/api/v1/*`, optional static SPA fallback, and current MVP business flows.

**Frontend API Seams:**
- Location: `src/services/api.ts`, `src/services/database.ts`, `src/contexts/AuthContext.tsx`
- Triggers: Route components and context lifecycle.
- Responsibilities: Construct API requests, persist token/user state, map backend data for UI consumption.

**Soroban Contract:**
- Location: `soroban-contract/src/lib.rs`, `soroban-contract/src/contract.rs`
- Triggers: Cargo/Soroban build and deployment tooling.
- Responsibilities: Define locked mint, unlock, transfer, burn, and query methods.

**Container Runtime:**
- Location: `Dockerfile`
- Triggers: Docker/Dokploy-style image build/run.
- Responsibilities: Build frontend assets, install Python API, provide static asset fallback through FastAPI, expose the combined app on port 80.

**Split Dev Containers:**
- Location: `Dockerfile.api`, `Dockerfile.frontend`
- Triggers: Manual Docker builds or compose-like local flows.
- Responsibilities: Run API on port 5680 or Vite dev server on port 5173.

## Architectural Constraints

- **Threading:** The browser runs React on the normal single-threaded UI event loop. FastAPI runs under uvicorn; module-level mutable globals in `backend/main.py` and `backend/mock_data.py` are not durable and are not safe as production persistence across process restarts or multiple workers.
- **Global state:** `backend/main.py` owns `ACTIVE_SESSIONS`; `backend/mock_data.py` owns mutable `PROJECTS`, `USERS`, and `TRANSACTIONS`; `src/contexts/AuthContext.tsx` owns browser auth context and `localStorage` persistence.
- **Circular imports:** No runtime circular import chain was detected in the mounted app. `backend/models/project.py`, `backend/models/audit.py`, `backend/models/environmental_credit.py`, and `backend/models/credit_transaction.py` are alias modules that re-export Portuguese-named model modules.
- **Backend route ownership:** `backend/main.py` is the current live app. `backend/api/*` routers are not mounted because no `include_router` call exists under `backend/`.
- **Database state:** `backend/core/database.py` can initialize SQLAlchemy from `DATABASE_URL`, but `backend/main.py` does not call `init_db()` or `create_tables()`.
- **Docker/Dokploy:** No `dokploy.yml`, `nixpacks.toml`, or Dokploy-specific config file was detected. The root `Dockerfile` is the practical combined deployment entry. `docker-compose.yml` exists but contains malformed fenced content and inline environment defaults; do not treat it as a reliable compose contract without cleanup.
- **Node rewrite impact:** A Python-to-Node rewrite must port the live contract from `backend/main.py`, `backend/mock_data.py`, and `backend/services/stellar_service.py`; update `pyproject.toml`, `uv.lock`, `Dockerfile`, `Dockerfile.api`, and `docker-compose.yml`; and preserve consumers in `src/services/api.ts`, `src/services/database.ts`, `src/contexts/AuthContext.tsx`, `src/pages/Dashboard/CreditMarketplace.tsx`, `src/pages/Dashboard/AuditorReview.tsx`, `src/pages/Dashboard/CertifierReview.tsx`, and `src/pages/Dashboard/RetireCredits.tsx`.

## Anti-Patterns

### Adding Runtime Endpoints To Unmounted Routers

**What happens:** New endpoints are added under `backend/api/*` while `backend/main.py` remains the only mounted FastAPI app.
**Why it's wrong:** The frontend and containers call `backend.main:app`, so unmounted routers do not change runtime behavior.
**Do this instead:** For the current Python runtime, add or port behavior in `backend/main.py`. For the Node rewrite, port the live endpoint set from `backend/main.py` into the new Node router and then retire or explicitly migrate `backend/api/*`.

### Bypassing The Frontend API Helper

**What happens:** `src/pages/Dashboard/RetireCredits.tsx` calls `fetch("http://127.0.0.1:5680/api/v1/...")` directly.
**Why it's wrong:** It bypasses `VITE_API_URL`, relative `/api/v1`, bearer token injection, and container/static fallback compatibility.
**Do this instead:** Use `apiPost('/marketplace/compensate', ...)` from `src/services/api.ts`, following `src/pages/Dashboard/CreditMarketplace.tsx`.

### Assuming PostgreSQL Is The Active Backend Store

**What happens:** SQLAlchemy models in `backend/models/*` and routers in `backend/api/*` are treated as the current backend.
**Why it's wrong:** `backend/main.py` never initializes the database or includes those routers, and current API data comes from `backend/mock_data.py`.
**Do this instead:** During planning, classify SQLAlchemy files as reference/legacy. Port current response shapes first; reintroduce persistence as an explicit phase.

### Treating Documentation As Current Code Shape

**What happens:** `README.md` describes TanStack Router and React Query, while `src/App.tsx` uses `react-router-dom` and service-level fetch helpers.
**Why it's wrong:** Planning from the README alone points new work to directories and libraries that are not present.
**Do this instead:** Use `src/App.tsx`, `src/services/api.ts`, and `src/services/database.ts` as the current frontend architecture source.

## Error Handling

**Strategy:** Frontend HTTP errors are converted to thrown `Error` values by `src/services/api.ts`; backend API errors are FastAPI `HTTPException` responses; React render errors are handled by `src/ErrorBoundary.tsx`.

**Patterns:**
- `src/services/api.ts` reads `detail`, `message`, response text, or `HTTP <status>` and throws an `Error`.
- `src/contexts/AuthContext.tsx` clears local auth state when `/auth/me` fails and has a gated local fallback for simulated gov.br/register flows.
- `backend/main.py` uses Pydantic `Field` validation and `HTTPException` for status-specific API failures.
- Several route pages call `api*` helpers without local error UI; new user-facing mutations should add page-level error state near the call site.

## Cross-Cutting Concerns

**Logging:** Frontend uses `console.error` and `console.warn` in `src/contexts/AuthContext.tsx`; backend has no centralized logger and uses exceptions/return values.
**Validation:** Frontend has TypeScript types and some local form constraints; backend runtime uses Pydantic models inside `backend/main.py`; legacy routers have separate Pydantic schemas under `backend/models/schemas.py`.
**Authentication:** Current auth is opaque in-memory bearer tokens in `backend/main.py` plus browser `localStorage`; legacy JWT helpers exist in `backend/core/jwt.py` and `backend/core/security.py` but are not used by the current runtime app.
**Configuration:** Frontend API URL uses `VITE_API_URL` with `/api/v1` default; backend uses `os.getenv` values in `backend/main.py` and `backend/services/stellar_service.py`; `.env` files are ignored by `.gitignore` and no `.env` file was present during this scan.
**Deployment:** The combined deployment serves built SPA assets from FastAPI when `FRONTEND_DIST_DIR` is set. Preserve this behavior or replace it with an equivalent Node static-serving/reverse-proxy path during the rewrite.

---

*Architecture analysis: 2026-05-22*
