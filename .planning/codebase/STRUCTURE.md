# Codebase Structure

**Analysis Date:** 2026-05-22

## Directory Layout

```text
sinarca/
|-- .devcontainer/          # Rust/Soroban development container
|-- .planning/codebase/     # GSD codebase maps
|-- backend/                # Current Python API runtime plus legacy backend skeleton
|-- docs/                   # Product, architecture, integration, brand, and legal docs
|-- novas telas painel/     # Committed design/reference HTML and screenshots
|-- public/                 # Vite public assets
|-- soroban-contract/       # Rust Soroban smart contract crate and committed target output
|-- src/                    # React/Vite frontend application root
|-- tests/                  # Python API and GUI tests
|-- Dockerfile              # Combined frontend build + Python API runtime image
|-- Dockerfile.api          # Python-only API image
|-- Dockerfile.frontend     # Vite dev-server image
|-- docker-compose.yml      # Compose-like deployment file, currently malformed
|-- index.html              # Vite HTML entry
|-- package.json            # Frontend package manifest and scripts
|-- pyproject.toml          # Python API package manifest
|-- tsconfig*.json          # TypeScript project configs
|-- vite.config.ts          # Vite config and `/api` dev proxy
`-- uv.lock                 # Python dependency lockfile
```

## Directory Purposes

**Root (`.`):**
- Purpose: Repository root and current frontend app root.
- Contains: Vite entry files, React package manifest, Python package manifest, Dockerfiles, docs, backend, contract, tests.
- Key files: `index.html`, `package.json`, `pyproject.toml`, `Dockerfile`, `vite.config.ts`, `tsconfig.json`

**`src/`:**
- Purpose: React/Vite SPA implementation.
- Contains: App entry, route registry, pages, components, layouts, context, services, assets, styles.
- Key files: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.css`

**`src/pages/`:**
- Purpose: Route-level page components.
- Contains: Public pages under `src/pages/Public/` and dashboard pages under `src/pages/Dashboard/`.
- Key files: `src/pages/Login.tsx`, `src/pages/Dashboard/Overview.tsx`, `src/pages/Dashboard/CreditMarketplace.tsx`, `src/pages/Dashboard/AuditorReview.tsx`, `src/pages/Dashboard/CertifierReview.tsx`, `src/pages/Public/PublicMapPage.tsx`

**`src/components/`:**
- Purpose: Shared UI and domain widgets used by pages.
- Contains: Headers, footers, cards, search/filter widgets, legal page wrapper, maps, calculator.
- Key files: `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/maps/NationalMap.tsx`, `src/components/calculator/SinarcaImpactCalculator.tsx`

**`src/layouts/`:**
- Purpose: Shell components for nested route branches.
- Contains: Public shell and dashboard shell.
- Key files: `src/layouts/PublicLayout.tsx`, `src/layouts/DashboardLayout.tsx`

**`src/contexts/`:**
- Purpose: React context providers.
- Contains: Auth/session provider and `useAuth` hook.
- Key files: `src/contexts/AuthContext.tsx`

**`src/services/`:**
- Purpose: Frontend service seams and browser-side domain engines.
- Contains: HTTP helper, backend facade, SIE impact engine.
- Key files: `src/services/api.ts`, `src/services/database.ts`, `src/services/impact-engine/index.ts`

**`src/services/impact-engine/`:**
- Purpose: Local emissions calculation pipeline.
- Contains: Inputs, engine functions, factors, output translators, profile detection, unit helpers, types.
- Key files: `src/services/impact-engine/index.ts`, `src/services/impact-engine/types.ts`, `src/services/impact-engine/factors/br-fe-1.1.ts`

**`src/data/`:**
- Purpose: Frontend data types and earlier/static MRCA data source.
- Contains: MRCA/inventory type definitions and static data.
- Key files: `src/data/mrca_db.ts`

**`src/assets/`:**
- Purpose: Bundled images and logos imported by React components.
- Contains: PNG/JPG/SVG assets.
- Key files: `src/assets/logo.png`, `src/assets/sinarca-logo.png`, `src/assets/sinarca-logo-recortado.svg`, `src/assets/login_hero.png`

**`backend/`:**
- Purpose: Current Python backend runtime plus unused/legacy backend modules.
- Contains: Runtime app, mock data, API routers, core config/db/security, SQLAlchemy models, services, validators.
- Key files: `backend/main.py`, `backend/mock_data.py`, `backend/services/stellar_service.py`

**`backend/api/`:**
- Purpose: APIRouter modules for a persistent backend architecture.
- Contains: Auth, project, audit, inventory, and marketplace routers.
- Key files: `backend/api/auth/auth.py`, `backend/api/projects/projects.py`, `backend/api/audit/audit.py`, `backend/api/inventory/inventory.py`, `backend/api/market/marketplace.py`

**`backend/core/`:**
- Purpose: Backend infrastructure helpers.
- Contains: Environment config, SQLAlchemy setup, JWT helpers, security dependencies, event dispatcher, rate limiter.
- Key files: `backend/core/config.py`, `backend/core/database.py`, `backend/core/jwt.py`, `backend/core/security.py`, `backend/core/events.py`, `backend/core/limiter.py`

**`backend/models/`:**
- Purpose: SQLAlchemy and Pydantic models for the planned/persistent backend.
- Contains: Users, projects, audits, credits, transactions, documents, NFC tags, return/request schemas, alias modules.
- Key files: `backend/models/user.py`, `backend/models/projeto.py`, `backend/models/auditoria.py`, `backend/models/credito_ambiental.py`, `backend/models/transacao_credito.py`, `backend/models/schemas.py`, `backend/models/return_schemas.py`

**`backend/services/`:**
- Purpose: Backend integration/service adapters.
- Contains: Stellar adapter, older blockchain stub, S3/encryption service.
- Key files: `backend/services/stellar_service.py`, `backend/services/blockchain_service.py`, `backend/services/s3_services.py`

**`backend/data/`:**
- Purpose: Backend seed helper area.
- Contains: Admin seed script.
- Key files: `backend/data/seed.py`

**`backend/events/`:**
- Purpose: Event registration placeholder.
- Contains: Event registration module.
- Key files: `backend/events/register_events.py`

**`backend/validators/`:**
- Purpose: Backend validation helpers.
- Contains: File extension/size/hash helpers.
- Key files: `backend/validators/file_validator.py`

**`soroban-contract/`:**
- Purpose: Rust smart contract workspace for SINARCA token behavior.
- Contains: Cargo manifest, source contract, template contract file, lockfile, generated target output.
- Key files: `soroban-contract/Cargo.toml`, `soroban-contract/src/lib.rs`, `soroban-contract/src/contract.rs`, `soroban-contract/contract.rs`

**`tests/`:**
- Purpose: Python integration and GUI flow tests.
- Contains: FastAPI TestClient tests and Playwright GUI script.
- Key files: `tests/test_api_integration.py`, `tests/test_gui_flows.py`

**`docs/`:**
- Purpose: Product, integration, architecture, lifecycle, manifesto, brand, and legal docs.
- Contains: Backend integration spec, blueprint, bible docs, branding docs, PDFs.
- Key files: `docs/BACKEND_INTEGRATION_SPEC.md`, `docs/bible/03_Arquitetura_Tecnica_Detalhada.md`, `docs/bible/04_Modelagem_de_Dados_e_Entidades.md`, `docs/branding/01_Manual_da_Marca.md`

**`novas telas painel/`:**
- Purpose: Reference UI screens produced outside the app source tree.
- Contains: Multiple `code.html` and `screen.png` pairs.
- Key files: `novas telas painel/stitch_dashboard_de_vis_o_geral/code.html`, `novas telas painel/stitch_dashboard_de_vis_o_geral/screen.png`

**`.devcontainer/`:**
- Purpose: Rust/Soroban devcontainer setup.
- Contains: Dockerfile and VS Code devcontainer config.
- Key files: `.devcontainer/Dockerfile`, `.devcontainer/devcontainer.json`

**`.planning/codebase/`:**
- Purpose: Generated GSD codebase intelligence documents.
- Contains: Architecture and structure maps from this run.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`

## Key File Locations

**Entry Points:**
- `index.html`: Vite HTML shell and `#root` container.
- `src/main.tsx`: React root creation and error boundary wrapper.
- `src/App.tsx`: Complete route tree for `/`, `/login`, `/public/*`, and `/painel/*`.
- `backend/main.py`: Current live API app (`uvicorn backend.main:app`).
- `soroban-contract/src/lib.rs`: Rust contract crate entry.
- `soroban-contract/src/contract.rs`: Current contract implementation.

**Configuration:**
- `package.json`: Frontend scripts and dependencies.
- `vite.config.ts`: Vite React plugin and `/api` dev proxy to `http://localhost:5680`.
- `tsconfig.json`: TypeScript project references.
- `tsconfig.app.json`: Browser TypeScript compiler options.
- `tsconfig.node.json`: Vite config TypeScript compiler options.
- `eslint.config.js`: ESLint flat config with relaxed MVP rules.
- `tailwind.config.js`: Tailwind scan paths and SINARCA theme tokens.
- `pyproject.toml`: Python FastAPI package metadata and dependencies.
- `uv.lock`: Python dependency lockfile.
- `.python-version`: Python version hint.
- `.gitignore`: Ignores `.env`, build outputs, virtualenvs, caches, and local scratch files.

**Core Logic:**
- `src/services/api.ts`: Use for every frontend HTTP call.
- `src/services/database.ts`: Use for shared frontend data access and response mapping.
- `src/contexts/AuthContext.tsx`: Use for login/register/profile/session behavior.
- `src/components/ProtectedRoute.tsx`: Use for protected route gating.
- `src/services/impact-engine/index.ts`: Use for calculator pipeline entry.
- `backend/main.py`: Current backend behavior to port or replace during Node rewrite.
- `backend/mock_data.py`: Current backend data shapes and seed state.
- `backend/services/stellar_service.py`: Current blockchain-facing API adapter.
- `soroban-contract/src/contract.rs`: On-chain token lifecycle contract.

**Testing:**
- `tests/test_api_integration.py`: FastAPI TestClient integration tests.
- `tests/test_gui_flows.py`: Playwright GUI workflow script.

**Deployment:**
- `Dockerfile`: Combined build/run path for Vite assets plus FastAPI.
- `Dockerfile.api`: API-only Python runtime.
- `Dockerfile.frontend`: Frontend-only Vite dev runtime.
- `docker-compose.yml`: Existing compose-like file; clean before relying on it.
- `.devcontainer/Dockerfile`: Rust/Soroban development image.

**Documentation:**
- `docs/BACKEND_INTEGRATION_SPEC.md`: Frontend/backend integration contract notes.
- `docs/bible/03_Arquitetura_Tecnica_Detalhada.md`: Target architecture narrative.
- `README.md`: Project overview, but verify claims against source files before planning.
- `README_SINARCA.md`: Documentation index for bible and branding docs.

## Naming Conventions

**Files:**
- React components and route pages use PascalCase `.tsx`: `src/pages/Dashboard/CreditMarketplace.tsx`, `src/components/ProtectedRoute.tsx`.
- React services use lower camelCase `.ts`: `src/services/api.ts`, `src/services/database.ts`.
- Impact engine modules use descriptive camelCase: `src/services/impact-engine/inputs/normalizeInputs.ts`, `src/services/impact-engine/engine/calculateScope1.ts`.
- Python backend files use snake_case: `backend/services/stellar_service.py`, `backend/core/database.py`, `backend/validators/file_validator.py`.
- Some backend model modules keep Portuguese domain names with English alias wrappers: `backend/models/projeto.py` plus `backend/models/project.py`, `backend/models/auditoria.py` plus `backend/models/audit.py`.
- Dockerfiles are root-level and role-specific: `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`.

**Directories:**
- Frontend routes are grouped by route audience: `src/pages/Public/`, `src/pages/Dashboard/`.
- Shared frontend widgets are grouped by feature when useful: `src/components/maps/`, `src/components/calculator/`, `src/components/legal/`.
- Frontend services are grouped by integration/domain: `src/services/api.ts`, `src/services/database.ts`, `src/services/impact-engine/`.
- Backend modules are grouped by layer: `backend/api/`, `backend/core/`, `backend/models/`, `backend/services/`, `backend/validators/`.
- Documentation is split between active integration docs at `docs/` and broader narrative docs at `docs/bible/` and `docs/branding/`.

## Where to Add New Code

**New Frontend Route:**
- Primary code: `src/pages/Public/` for public pages or `src/pages/Dashboard/` for protected dashboard pages.
- Route registration: `src/App.tsx`.
- Shared shell changes: `src/layouts/PublicLayout.tsx` or `src/layouts/DashboardLayout.tsx`.

**New Frontend Component:**
- Reusable UI: `src/components/`.
- Map-specific UI: `src/components/maps/`.
- Calculator-specific UI: `src/components/calculator/`.
- Legal/public-content wrapper: `src/components/legal/`.

**New Frontend API Call:**
- HTTP primitive: `src/services/api.ts`.
- Shared domain accessor or mapper: `src/services/database.ts`.
- Route-local one-off mutation: page component may call `apiPost`/`apiPatch`, following `src/pages/Dashboard/CreditMarketplace.tsx`, `src/pages/Dashboard/AuditorReview.tsx`, and `src/pages/Dashboard/CertifierReview.tsx`.
- Do not add hardcoded absolute API URLs in pages; replace the existing direct call in `src/pages/Dashboard/RetireCredits.tsx` when touching that flow.

**Current Python Backend Feature:**
- Runtime endpoint: `backend/main.py`.
- Current in-memory data shape: `backend/mock_data.py`.
- Current blockchain-like result behavior: `backend/services/stellar_service.py`.
- Do not add behavior only under `backend/api/*` unless `backend/main.py` is updated to include those routers.

**Node Backend Rewrite:**
- Contract source to port: `backend/main.py`, `backend/mock_data.py`, `backend/services/stellar_service.py`.
- Frontend contract to preserve: `src/services/api.ts`, `src/services/database.ts`, `src/contexts/AuthContext.tsx`.
- Deployment files to update: `Dockerfile`, `Dockerfile.api`, `docker-compose.yml`, `package.json`.
- Keep `src/` as the frontend root. If replacing Python in place, make `backend/` the Node backend root only as part of a deliberate conversion; if Node must coexist temporarily, use a separate runtime directory such as `server/` and document the transition in deployment scripts.

**New Persistent Data Model:**
- Current reference models: `backend/models/`.
- Current runtime has no live persistence. Add persistence as an explicit backend rewrite/persistence phase rather than silently extending `backend/models/*`.

**New Soroban Contract Logic:**
- Implementation: `soroban-contract/src/contract.rs`.
- Crate exports: `soroban-contract/src/lib.rs`.
- Cargo dependencies/config: `soroban-contract/Cargo.toml`.

**Utilities:**
- Frontend shared helpers: `src/services/` for domain/API helpers or `src/components/` for reusable UI helpers.
- Backend service adapters: `backend/services/` for current Python runtime, or the equivalent service layer in the future Node backend.
- Backend validation helpers: `backend/validators/` for current Python runtime.

**Tests:**
- API integration: `tests/test_api_integration.py`.
- GUI flow scripts: `tests/test_gui_flows.py`.
- Add Node rewrite tests next to the chosen Node runtime and keep API contract tests aligned with endpoints consumed by `src/services/*`.

## Special Directories

**`soroban-contract/target/`:**
- Purpose: Rust/Cargo generated build output for the Soroban contract.
- Generated: Yes.
- Committed: Yes, files under this directory are tracked.

**`novas telas painel/`:**
- Purpose: Reference dashboard screen exports.
- Generated: Yes, likely design/prototype artifacts.
- Committed: Yes.

**`.planning/codebase/`:**
- Purpose: GSD-generated codebase maps for future planning/execution agents.
- Generated: Yes.
- Committed: Not yet tracked at the time of this mapping run.

**`public/`:**
- Purpose: Static assets copied by Vite without import processing.
- Generated: No.
- Committed: Yes.

**`.devcontainer/`:**
- Purpose: Reproducible Rust/Soroban development container.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-05-22*
