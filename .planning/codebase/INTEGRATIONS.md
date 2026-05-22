# External Integrations

**Analysis Date:** 2026-05-22

## APIs & External Services

**Frontend to Backend API:**
- SINARCA REST API - frontend API client uses `/api/v1` by default in `src/services/api.ts`.
  - SDK/Client: native `fetch` in `src/services/api.ts`; no Axios dependency in `package.json`.
  - Auth: bearer token from `localStorage` key `sinarca_token` in `src/services/api.ts`.
  - Dev proxy: `/api` to `http://localhost:5680` in `vite.config.ts`.
  - Contract: `docs/BACKEND_INTEGRATION_SPEC.md` defines the expected `/api/v1/auth/login`, `/api/v1/projects`, `/api/v1/inventory/*`, and `/api/v1/audit/*` endpoints.
  - Direct bypass: `src/pages/Dashboard/RetireCredits.tsx` calls `http://127.0.0.1:5680/api/v1/marketplace/compensate` directly instead of using `src/services/api.ts`.
  - Public docs target: `src/pages/Dashboard/ApiDocs.tsx` references `https://api.sinarca.com.br/v1`.

**Backend REST API:**
- FastAPI MVP API - implemented directly in `backend/main.py`.
  - SDK/Client: FastAPI route decorators in `backend/main.py`.
  - Auth: opaque bearer token stored in module-level `ACTIVE_SESSIONS` in `backend/main.py`.
  - Prefix: `API_PREFIX = "/api/v1"` in `backend/main.py`.
  - Health endpoint: `/health` in `backend/main.py`.
  - SPA fallback: `FRONTEND_DIST_DIR` static serving in `backend/main.py`.

**Stellar / Blockchain:**
- Stellar Horizon - credit transfer and burn adapter in `backend/services/stellar_service.py`.
  - SDK/Client: mock mode uses local hashing in `backend/services/stellar_service.py`; live branch imports `stellar_sdk` and `requests` inside `backend/services/stellar_service.py`.
  - Auth: `STELLAR_ISSUER_SECRET_KEY` and `STELLAR_DISTRIBUTOR_SECRET_KEY` environment variables in `backend/services/stellar_service.py`.
  - Network: `STELLAR_NETWORK` and `STELLAR_HORIZON_URL` in `backend/services/stellar_service.py`.
  - Default external URL: `https://horizon-testnet.stellar.org` in `backend/services/stellar_service.py`.
  - Testnet funding: `https://friendbot.stellar.org/?addr=...` request path exists in `backend/services/stellar_service.py`.
- Soroban smart contract - on-chain token lifecycle contract in `soroban-contract/src/contract.rs`.
  - SDK/Client: `soroban-sdk` 26.0.0 in `soroban-contract/Cargo.toml`.
  - Auth: `Address::require_auth()` in `soroban-contract/src/contract.rs`.
  - Backend RPC wiring: not implemented in `backend/main.py`; `CHANGELOG_BLOCKCHAIN.md` records Soroban deploy/RPC integration as absent from the backend surface.
- Legacy blockchain mock - UUID-based local helper in `backend/services/blockchain_service.py`.
  - SDK/Client: Python standard library `uuid` in `backend/services/blockchain_service.py`.
  - Auth: Not applicable.

**Document/File Storage API:**
- AWS S3 helper - upload/encryption service shell in `backend/services/s3_services.py`.
  - SDK/Client: `boto3` client and `cryptography.fernet.Fernet` in `backend/services/s3_services.py`.
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `S3_BACKUP_BUCKET`, and `AES_SECRET_KEY` referenced through `settings` in `backend/services/s3_services.py`.
  - Runtime status: `settings` is not defined by `backend/core/config.py`, and `backend/main.py` does not import `S3Service`.

**Frontend External Assets:**
- Google Fonts / Material Symbols - loaded by `index.html`.
  - SDK/Client: browser stylesheet links in `index.html`.
  - Auth: Not applicable.
- UI Avatars - profile image URL template in `src/layouts/DashboardLayout.tsx`.
  - SDK/Client: browser image request to `https://ui-avatars.com/api/`.
  - Auth: Not applicable.
- External certification logos - Verra and Gold Standard image/website URLs in `src/data/mrca_db.ts`.
  - SDK/Client: browser image/link usage through frontend data.
  - Auth: Not applicable.

**Supabase:**
- Supabase - Not detected.
  - SDK/Client: no `@supabase/supabase-js` dependency in `package.json`; no source references to `supabase`.
  - Auth: Not applicable.

**Prior/Sibling API Contracts:**
- Backend integration contract - `docs/BACKEND_INTEGRATION_SPEC.md` documents the desired backend API shape consumed by `src/services/database.ts`.
  - SDK/Client: native `fetch` abstraction in `src/services/api.ts`.
  - Auth: JWT-style response contract in `docs/BACKEND_INTEGRATION_SPEC.md`; opaque token implementation in `backend/main.py`.
  - Note: `docs/BACKEND_INTEGRATION_SPEC.md` references Algorand as blockchain middleware, while implemented backend and contract code use Stellar/Soroban in `backend/services/stellar_service.py` and `soroban-contract/src/contract.rs`.
- Sibling backend repository reference - Not detected.
  - SDK/Client: no repo-local path or package reference to a sibling backend checkout found in scanned source/docs.
  - Auth: Not applicable.

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` in `backend/core/database.py`, `Dockerfile`, and `docker-compose.yml`.
  - Client: SQLAlchemy engine/session helpers in `backend/core/database.py`, model definitions in `backend/models/`, and router dependencies in `backend/api/**`.
  - Schema: SQLAlchemy declarative base in `backend/core/database.py`; models include `backend/models/user.py`, `backend/models/projeto.py`, `backend/models/transacao_credito.py`, and `backend/models/auditoria.py`.
  - Extension: `CREATE EXTENSION IF NOT EXISTS vector` is executed by `create_tables()` in `backend/core/database.py`.
  - Runtime status: `backend/main.py` uses in-memory mock collections from `backend/mock_data.py` and does not initialize `backend/core/database.py`.

**File Storage:**
- Local upload handling only in active API.
  - Upload endpoint: `POST /api/v1/inventory/upload` reads `UploadFile` and returns metadata in `backend/main.py`.
  - Storage: uploaded bytes are not persisted by `backend/main.py`.
  - Docker volume: `uploads_data` is declared in `docker-compose.yml`.
  - S3 path: dormant helper in `backend/services/s3_services.py`.

**Caching:**
- Redis - configuration variables exist in `backend/core/config.py`; no Redis client or cache usage detected in `backend/`.
- Browser storage - frontend auth state uses `localStorage` keys `sinarca_token`, `sinarca_user`, `sinarca_token_expires_at`, and `sinarca_users_db` in `src/contexts/AuthContext.tsx`.
- In-memory backend state - `ACTIVE_SESSIONS`, `USERS`, `PROJECTS`, and `TRANSACTIONS` live in `backend/main.py` and `backend/mock_data.py`.

## Authentication & Identity

**Auth Provider:**
- Custom in-memory auth for active MVP API.
  - Implementation: `backend/main.py` validates users in `backend/mock_data.py`, creates opaque `secrets.token_urlsafe` bearer tokens, and stores token-to-user mappings in `ACTIVE_SESSIONS`.
  - Frontend: `src/contexts/AuthContext.tsx` calls `/auth/login`, `/auth/me`, `/auth/register`, and stores the bearer token in `localStorage`.
  - Roles: `producer`, `auditor`, `company`, `certifier`, and `admin` in `src/contexts/AuthContext.tsx`, `backend/main.py`, and `docs/BACKEND_INTEGRATION_SPEC.md`.
- JWT/OAuth2 path exists but is not wired into active app.
  - Implementation: JWT helpers in `backend/core/jwt.py`, OAuth2 bearer dependency in `backend/core/security.py`, and DB-backed auth routers in `backend/api/auth/auth.py`, `backend/api/auth/auth_admin.py`.
  - Secret: `SECRET_KEY` in `backend/core/config.py`.
  - Runtime status: `backend/main.py` has no `include_router(...)` calls for `backend/api/auth/*`.
- Gov.br is simulated only.
  - Implementation: `loginWithGovBr()` creates a local demo user when `VITE_ALLOW_LOCAL_AUTH_FALLBACK` is enabled in `src/contexts/AuthContext.tsx`.
  - External OAuth provider: Not detected.
- Supabase Auth - Not detected.

## Monitoring & Observability

**Error Tracking:**
- None detected.

**Logs:**
- Browser console logging in `src/contexts/AuthContext.tsx`.
- Backend uses default Uvicorn/FastAPI logging through `Dockerfile.api` and `Dockerfile`.
- Stellar helper prints operational messages in `backend/services/stellar_service.py`.
- No Sentry, OpenTelemetry, Datadog, Logtail, or structured logging dependency detected in `package.json`, `pyproject.toml`, or `uv.lock`.

## CI/CD & Deployment

**Hosting:**
- Docker all-in-one deployment via `Dockerfile`.
  - Frontend build stage: Node 20 builds Vite output from `package.json`.
  - Backend/runtime stage: Python 3.11 installs app with uv, installs PostgreSQL and Nginx packages, starts local PostgreSQL, and serves `backend.main:app`.
  - Static frontend: `FRONTEND_DIST_DIR` enables FastAPI SPA fallback in `backend/main.py`.
- API-only deployment via `Dockerfile.api`.
  - Command: Uvicorn serving `backend.main:app` on port 5680.
- Frontend dev container via `Dockerfile.frontend`.
  - Command: Vite dev server on port 5173.
- Docker Compose surface via `docker-compose.yml`.
  - Uses `env_file: .env`, publishes ports 80, 5680, and 5432, declares `postgres_data` and `uploads_data`.
  - Contains inline local database credential values and markdown fence artifacts; validate/sanitize before using it as a production Compose file.
- Dokploy-specific files are not detected.

**CI Pipeline:**
- None detected.
  - No GitHub Actions workflows detected under `.github/workflows/`.
  - No GitLab CI, CircleCI, or Dokploy config detected in scanned repo files.

## Environment Configuration

**Required env vars:**
- Frontend API/session:
  - `VITE_API_URL` - API base URL in `src/services/api.ts`.
  - `VITE_SESSION_TTL_MS` - frontend session TTL in `src/contexts/AuthContext.tsx`.
  - `VITE_ALLOW_LOCAL_AUTH_FALLBACK` - local Gov.br/register fallback toggle in `src/contexts/AuthContext.tsx`.
- Backend MVP:
  - `CORS_ORIGINS` - CORS allowlist in `backend/main.py`.
  - `SESSION_TTL_HOURS` - active session duration in `backend/main.py`.
  - `ALLOW_DEMO_AUTH_FALLBACK` - demo auth fallback toggle in `backend/main.py`.
  - `MERCHANT_TRANSACTION_FEE_RATE` - marketplace fee setting in `backend/main.py`.
  - `ISSUER_FUND_YIELD_RATE` - issuer fund setting in `backend/main.py`.
  - `MAX_UPLOAD_BYTES` - upload limit in `backend/main.py`.
  - `FRONTEND_DIST_DIR` - SPA static serving path in `backend/main.py`.
- Database/JWT/seed path:
  - `DATABASE_URL` - SQLAlchemy connection in `backend/core/database.py`.
  - `SECRET_KEY` - JWT signing in `backend/core/jwt.py` and `backend/core/security.py`.
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_ROLE`, `ADMIN_EMAIL` - seed/admin config in `backend/core/config.py` and `backend/data/seed.py`.
  - `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` - JWT expiration in `backend/core/config.py`.
- Stellar:
  - `STELLAR_ENABLED` - live/mock mode in `backend/services/stellar_service.py`.
  - `STELLAR_NETWORK` - Stellar network name in `backend/services/stellar_service.py`.
  - `STELLAR_HORIZON_URL` - Horizon endpoint in `backend/services/stellar_service.py`.
  - `STELLAR_ISSUER_PUBLIC_KEY`, `STELLAR_ISSUER_SECRET_KEY` - issuer account in `backend/services/stellar_service.py`.
  - `STELLAR_DISTRIBUTOR_PUBLIC_KEY`, `STELLAR_DISTRIBUTOR_SECRET_KEY` - distributor account in `backend/services/stellar_service.py`.
  - `STELLAR_ASSET_CODE` - asset code in `backend/services/stellar_service.py`.
- S3 helper:
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `S3_BACKUP_BUCKET`, `AES_SECRET_KEY` - expected by `backend/services/s3_services.py`.
- Redis config only:
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` - defined in `backend/core/config.py`, with no detected Redis client usage.

**Secrets location:**
- `.env` file is referenced by `docker-compose.yml`, `backend/core/config.py`, `backend/core/database.py`, and `backend/data/seed.py`.
- No `.env*` files are present in the repository scan.
- `Dockerfile` and `docker-compose.yml` contain inline local PostgreSQL credential values; do not reuse these values for production secrets.

## Webhooks & Callbacks

**Incoming:**
- None detected.
  - Active API routes in `backend/main.py` are synchronous REST endpoints under `/api/v1`; no webhook-specific endpoints found.

**Outgoing:**
- Stellar Horizon/Friendbot requests are present in `backend/services/stellar_service.py` live-transfer branch.
- S3 upload request path is present in `backend/services/s3_services.py`.
- No outgoing webhooks or callback registration logic detected in `backend/` or `src/`.

---

*Integration audit: 2026-05-22*
