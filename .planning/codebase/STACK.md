# Technology Stack

**Analysis Date:** 2026-05-22

## Languages

**Primary:**
- TypeScript 5.9.3 - React/Vite frontend in `src/App.tsx`, `src/main.tsx`, `src/pages/`, `src/components/`, `src/services/`, and Vite config in `vite.config.ts`.
- Python 3.11 - FastAPI backend package in `backend/`, entry point in `backend/main.py`, package metadata in `pyproject.toml`, and runtime pin in `.python-version`.

**Secondary:**
- Rust 2021 - Soroban smart contract crate in `soroban-contract/Cargo.toml`, `soroban-contract/src/lib.rs`, and `soroban-contract/src/contract.rs`.
- CSS/Tailwind - application styling in `src/index.css`, `src/App.css`, and `tailwind.config.js`.
- HTML prototypes - generated/static design references in `novas telas painel/**/code.html`.

## Runtime

**Environment:**
- Node.js 20 - Docker runtime for frontend build/dev in `Dockerfile`, `Dockerfile.frontend`.
- Python 3.11 - backend runtime in `.python-version`, `Dockerfile`, and `Dockerfile.api`.
- Rust 1.95 - Soroban/devcontainer toolchain in `.devcontainer/Dockerfile` and `.devcontainer/devcontainer.json`.
- Browser SPA - frontend bootstraps through `index.html` and `src/main.tsx`.

**Package Manager:**
- npm - frontend dependencies and scripts in `package.json`.
- Lockfile: present at `package-lock.json`.
- uv - Python package installation in `Dockerfile`, `Dockerfile.api`, and lock data in `uv.lock`.
- Lockfile: present at `uv.lock`.
- Cargo - smart contract dependencies in `soroban-contract/Cargo.toml`.
- Lockfile: present at `soroban-contract/Cargo.lock`.

## Frameworks

**Core:**
- React 19.2.0 - SPA UI in `src/`.
- React DOM 19.2.0 - browser rendering in `src/main.tsx`.
- React Router DOM 7.11.0 - route tree in `src/App.tsx`.
- Vite 7.2.4 - frontend dev server/build in `vite.config.ts`.
- Tailwind CSS 3.4.17 - utility styling configured in `tailwind.config.js` and `postcss.config.js`.
- FastAPI >=0.115.0, locked as 0.136.1 - Python API in `backend/main.py`.
- Pydantic >=2.7.0, locked as 2.13.4 - request schemas in `backend/main.py` and `backend/models/schemas.py`.
- Uvicorn >=0.30.0, locked as 0.47.0 - ASGI server command in `Dockerfile.api` and `Dockerfile`.
- Soroban SDK 26.0.0 - on-chain contract primitives in `soroban-contract/Cargo.toml`.

**Testing:**
- FastAPI TestClient - API integration tests in `tests/test_api_integration.py`.
- pytest usage detected in `tests/test_api_integration.py`; `pytest` is not declared in `pyproject.toml` or `uv.lock`.
- Playwright Python usage detected in `tests/test_gui_flows.py`; Playwright is not declared in `pyproject.toml` or `uv.lock`.
- No JavaScript test runner detected in `package.json`.

**Build/Dev:**
- TypeScript project references - root `tsconfig.json` points to `tsconfig.app.json` and `tsconfig.node.json`.
- ESLint 9 flat config - configured in `eslint.config.js`.
- PostCSS + Autoprefixer - configured in `postcss.config.js`.
- Docker - app/container surfaces in `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend`, `.dockerignore`, and `docker-compose.yml`.
- Devcontainer - Rust/Soroban environment in `.devcontainer/devcontainer.json` and `.devcontainer/Dockerfile`.

## Key Dependencies

**Critical:**
- `react` 19.2.0 - frontend component model in `src/`.
- `react-router-dom` 7.11.0 - client routing in `src/App.tsx`.
- `lucide-react` 0.562.0 - iconography across dashboard components in `src/pages/` and `src/components/`.
- `@svg-maps/brazil` 2.0.0 - Brazil map rendering in map components under `src/components/`.
- `fastapi` >=0.115.0 - backend API surface in `backend/main.py`.
- `uvicorn[standard]` >=0.30.0 - production/dev ASGI serving in `Dockerfile.api`.
- `python-multipart` >=0.0.9 - file upload handling for `UploadFile` in `backend/main.py`.
- `email-validator` >=2.1.0 - Pydantic `EmailStr` validation in `backend/main.py`.
- `soroban-sdk` 26.0.0 - contract storage/auth APIs in `soroban-contract/src/contract.rs`.

**Infrastructure:**
- PostgreSQL - Docker-provisioned database in `Dockerfile` and `docker-compose.yml`, SQLAlchemy connection helper in `backend/core/database.py`.
- SQLAlchemy imports - model/data layer in `backend/models/` and `backend/core/database.py`, but SQLAlchemy is not declared in `pyproject.toml` or `uv.lock`.
- `python-dotenv` imports - environment loading in `backend/core/config.py`, `backend/core/database.py`, and `backend/data/seed.py`; not declared by `pyproject.toml`.
- `python-jose` imports - JWT helpers in `backend/core/jwt.py`, `backend/core/security.py`, and `backend/api/auth/auth.py`; not declared by `pyproject.toml` or `uv.lock`.
- `passlib`, `brutils`, and SQLAlchemy auth routers - DB-backed auth paths in `backend/api/auth/auth.py` and `backend/api/auth/auth_admin.py`; not declared by `pyproject.toml` or `uv.lock`.
- `slowapi` import - rate limiter helper in `backend/core/limiter.py`; not declared by `pyproject.toml` or `uv.lock`.
- `boto3` and `cryptography` imports - dormant S3/encryption helper in `backend/services/s3_services.py`; not declared by `pyproject.toml` or `uv.lock`.
- `stellar_sdk` and `requests` imports - Stellar live-transfer branch in `backend/services/stellar_service.py`; not declared by `pyproject.toml` or `uv.lock`.

## Configuration

**Environment:**
- Frontend API base URL uses `VITE_API_URL` with default `/api/v1` in `src/services/api.ts`.
- Frontend auth/session toggles use `VITE_SESSION_TTL_MS` and `VITE_ALLOW_LOCAL_AUTH_FALLBACK` in `src/contexts/AuthContext.tsx`.
- Vite development proxy maps `/api` to `http://localhost:5680` in `vite.config.ts`.
- Backend CORS allowlist comes from `CORS_ORIGINS` with localhost defaults in `backend/main.py`.
- Backend MVP settings use `SESSION_TTL_HOURS`, `ALLOW_DEMO_AUTH_FALLBACK`, `MERCHANT_TRANSACTION_FEE_RATE`, `ISSUER_FUND_YIELD_RATE`, `MAX_UPLOAD_BYTES`, and `FRONTEND_DIST_DIR` in `backend/main.py`.
- SQLAlchemy path requires `DATABASE_URL` in `backend/core/database.py`.
- JWT/seed path uses `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_ROLE`, `ADMIN_EMAIL`, `ACCESS_TOKEN_EXPIRE_MINUTES`, and `REFRESH_TOKEN_EXPIRE_DAYS` in `backend/core/config.py`.
- Redis host/port/db variables are defined in `backend/core/config.py`, but no Redis client dependency or runtime usage is detected.
- Stellar integration settings use `STELLAR_NETWORK`, `STELLAR_HORIZON_URL`, `STELLAR_ISSUER_PUBLIC_KEY`, `STELLAR_ISSUER_SECRET_KEY`, `STELLAR_DISTRIBUTOR_PUBLIC_KEY`, `STELLAR_DISTRIBUTOR_SECRET_KEY`, `STELLAR_ASSET_CODE`, and `STELLAR_ENABLED` in `backend/services/stellar_service.py`.
- S3 helper expects `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `S3_BACKUP_BUCKET`, and `AES_SECRET_KEY` through a missing `settings` object in `backend/services/s3_services.py`.
- `.env` loading is referenced by `backend/core/config.py`, `backend/core/database.py`, `backend/data/seed.py`, and `docker-compose.yml`; no `.env*` file is present in the repository scan.
- Supabase is not detected: no `@supabase/supabase-js` dependency in `package.json`, no Supabase package in `pyproject.toml`, and no source references to `supabase`.

**Build:**
- Frontend build: `npm run build` runs `vite build` from `package.json`.
- Frontend dev: `npm run dev` runs Vite from `package.json`.
- Frontend preview: `npm run preview` runs `vite preview` from `package.json`.
- Frontend lint: `npm run lint` runs `eslint .` from `package.json`.
- Backend package build metadata: setuptools backend in `pyproject.toml`.
- API container command: `uvicorn backend.main:app --host 0.0.0.0 --port 5680` in `Dockerfile.api`.
- All-in-one container command: starts local PostgreSQL then serves `backend.main:app` on port 80 in `Dockerfile`.
- Frontend dev container command: `npm run dev -- --host` in `Dockerfile.frontend`.
- Docker compose surface exists in `docker-compose.yml`; the file includes inline local database credentials and markdown fence artifacts, so validate before using it as production compose input.

## Platform Requirements

**Development:**
- Install frontend dependencies with `npm install` using `package.json` and `package-lock.json`.
- Run frontend locally with `npm run dev`; Vite serves the SPA and proxies `/api` to port 5680 via `vite.config.ts`.
- Install backend package with `uv pip install --system .` or an equivalent virtual environment install using `pyproject.toml`.
- Run backend locally with `uvicorn backend.main:app --host 0.0.0.0 --port 5680`.
- Build Soroban contract with Cargo under `soroban-contract/`; the devcontainer installs `wasm32-unknown-unknown` in `.devcontainer/devcontainer.json`.

**Production:**
- Main deploy artifact is Docker-based: `Dockerfile` builds the frontend, installs Python backend, provisions local PostgreSQL, and serves the SPA through FastAPI static fallback in `backend/main.py`.
- API-only deploy artifact is `Dockerfile.api`.
- Frontend-only dev/deploy artifact is `Dockerfile.frontend`.
- Dokploy-specific configuration is not detected; deployment depends on generic Dockerfile selection and runtime env configuration.
- Sibling/prior API contract is documented in `.planning/docs/BACKEND_INTEGRATION_SPEC.md`; it defines `/api/v1` endpoints consumed by `src/services/api.ts` and `src/services/database.ts`.

---

*Stack analysis: 2026-05-22*
