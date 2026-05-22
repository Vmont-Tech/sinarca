# Testing Patterns

**Analysis Date:** 2026-05-22

## Test Framework

**Runner:**
- Python API tests use pytest style in `tests/test_api_integration.py`.
- FastAPI integration tests use `fastapi.testclient.TestClient` against `backend.main.app`.
- Frontend unit/integration runner: Not detected. `package.json` has no `test` script, no Vitest, no Jest, and no React Testing Library dependency.
- Browser automation exists as a standalone Playwright script in `tests/test_gui_flows.py`, but it is not integrated with pytest or an npm script.

**Assertion Library:**
- Python tests use plain `assert` and `pytest.raises` in `tests/test_api_integration.py`.
- GUI script uses Playwright actions and screenshots but no assertions in `tests/test_gui_flows.py`.

**Run Commands:**
```bash
npm run lint                                      # Frontend lint; succeeds with one hook warning
npm run build                                     # Vite production build; succeeds with chunk-size warning
uv run pytest -q                                  # Intended Python test command; fails because pytest is not declared
uv run --with pytest --with httpx pytest -q tests/test_api_integration.py
python tests/test_gui_flows.py                    # Manual GUI script; requires frontend running on localhost:5174
docker compose config                             # Docker compose validation; fails YAML parsing
```

## Test File Organization

**Location:**
- Tests are in a top-level `tests/` directory.
- API integration coverage lives in `tests/test_api_integration.py`.
- Manual GUI coverage lives in `tests/test_gui_flows.py`.
- No co-located frontend tests exist under `src/`.
- No backend package-level tests exist under `backend/`.

**Naming:**
- Pytest-compatible files use `test_*.py`: `tests/test_api_integration.py`.
- The GUI script uses a `test_*.py` filename but exposes `run_gui_tests()` instead of pytest `test_*` functions: `tests/test_gui_flows.py`.
- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files are present.

**Structure:**
```text
tests/
├── test_api_integration.py   # FastAPI TestClient tests against backend.main
└── test_gui_flows.py         # Standalone Playwright screenshot flow
```

## Test Structure

**Suite Organization:**
```python
from fastapi.testclient import TestClient
from backend.main import app, USERS, PROJECTS, TRANSACTIONS

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_state():
    USERS[:] = [...]
    from backend.main import _ensure_demo_users
    _ensure_demo_users()
    TRANSACTIONS.clear()

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
```

**Patterns:**
- Use one module-level `TestClient(app)` in `tests/test_api_integration.py`.
- Reset in-memory global data with an autouse fixture before every API test in `tests/test_api_integration.py`.
- Assert HTTP status codes, exact response fields, and side effects on imported in-memory data such as `PROJECTS` and `TRANSACTIONS`.
- Use direct service instantiation for narrow service behavior: `StellarService(StellarConfig(enabled=False))` in `tests/test_api_integration.py`.
- Avoid adding test state that survives between tests; the API uses mutable globals in `backend/main.py`.

## Mocking

**Framework:** Not detected

**Patterns:**
```python
def test_stellar_service_mock_mode():
    svc = StellarService(StellarConfig(enabled=False))
    res = svc.transfer_credit(
        amount=5.0,
        from_account="dev-001",
        to_account="comp-001",
        memo="test",
    )
    assert res["success"] is True
    assert res["mode"] == "mock"
```

**What to Mock:**
- Mock blockchain/network behavior through `StellarConfig(enabled=False)` in `backend/services/stellar_service.py`.
- Mock or fake browser storage and API responses when adding frontend tests for `src/contexts/AuthContext.tsx`, `src/services/api.ts`, and `src/services/database.ts`.
- Mock file uploads around `upload_inventory_document` in `backend/main.py` with in-memory files.

**What NOT to Mock:**
- Do not mock the `/api/v1` contract boundary when testing the Node rewrite. Preserve real request/response assertions for routes represented in `backend/main.py` and `tests/test_api_integration.py`.
- Do not mock `src/services/api.ts` in contract tests that verify frontend/backend integration; mock lower-level `fetch` only for frontend unit tests.
- Do not bypass `ProtectedRoute` and `AuthProvider` when testing auth navigation for `/painel` routes in `src/App.tsx`.

## Fixtures and Factories

**Test Data:**
```python
@pytest.fixture(autouse=True)
def reset_state():
    USERS[:] = [
        {"id": "admin-001", "role": "admin", "password": "admin"},
        {"id": "aud-005", "role": "auditor", "password": "auditor"},
    ]
    from backend.main import _ensure_demo_users
    _ensure_demo_users()
    TRANSACTIONS.clear()
```

**Location:**
- Canonical in-memory application data lives in `backend/mock_data.py`.
- API tests mutate imported globals from `backend/main.py`.
- GUI test credentials and flow steps are inline in `tests/test_gui_flows.py`.
- No reusable factory module is present.

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not configured. Add pytest-cov or a JS coverage runner before relying on coverage numbers.
```

**Observed Coverage Gaps:**
- No frontend unit tests for `src/services/api.ts`, `src/services/database.ts`, `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, or dashboard pages under `src/pages/Dashboard/`.
- No tests for the pure impact engine under `src/services/impact-engine/`, even though those functions are good candidates for deterministic unit tests.
- No contract tests that start the frontend and backend together through `vite.config.ts` proxy configuration.
- No Docker build tests for `Dockerfile`, `Dockerfile.api`, or `Dockerfile.frontend`.
- No passing compose validation because `docker-compose.yml` fails YAML parsing.
- No tests for legacy SQLAlchemy routers under `backend/api/auth/`, `backend/api/projects/`, `backend/api/audit/`, `backend/api/inventory/`, or `backend/api/market/`.

## Test Types

**Unit Tests:**
- Minimal service-level coverage exists for `backend/services/stellar_service.py` through `test_stellar_service_mock_mode` and `test_stellar_service_missing_keys_raises` in `tests/test_api_integration.py`.
- No TypeScript unit tests exist for `src/services/impact-engine/` or frontend services.

**Integration Tests:**
- `tests/test_api_integration.py` exercises FastAPI routes from `backend/main.py`: `/health`, `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/projects`, `/api/v1/certifier/projects/{project_id}/decision`, `/api/v1/marketplace`, and `/api/v1/marketplace/buy`.
- Tests run against in-memory data and do not require a database server.
- `tests/test_api_integration.py` imports and mutates module globals from `backend/main.py`, so parallel test execution is unsafe.

**E2E Tests:**
- Playwright is used only in `tests/test_gui_flows.py`.
- The script assumes a browser-accessible app at `http://localhost:5174/login` and navigates dashboard routes such as `/painel/marketplace`, `/painel/aposentar`, `/painel/auditoria`, and `/painel/certificadora`.
- The script writes screenshots to a hardcoded Windows path in `tests/test_gui_flows.py`, so it is not portable in the macOS project checkout.
- No Playwright config file is present.

## Common Patterns

**Async Testing:**
```python
# Async FastAPI routes are tested synchronously through TestClient.
res_buy = client.post("/api/v1/marketplace/buy", json={
    "project_id": pid,
    "buyer_id": "comp-001",
    "quantidade": 10.0,
    "unit_price_brl": 500.0,
})
assert res_buy.status_code == 200
```

**Error Testing:**
```python
def test_login_invalid_credentials():
    response = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@sinarca.com.br",
        "password": "wrongpassword",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciais inválidas"

def test_stellar_service_missing_keys_raises():
    svc = StellarService(StellarConfig(enabled=True, issuer_public_key="", distributor_public_key=""))
    with pytest.raises(RuntimeError):
        svc.transfer_credit(amount=5.0, from_account="dev-001", to_account="comp-001")
```

## Current Verification Results

- `npm ci`: passes with dependencies from `package-lock.json`; reports npm audit findings.
- `npm run lint`: passes with one `react-hooks/exhaustive-deps` warning in `src/pages/Dashboard/Feed.tsx`.
- `npm run build`: passes; Vite emits a chunk-size warning for the main JavaScript bundle.
- `uv run pytest -q`: fails before collection because `pytest` is not declared in `pyproject.toml`.
- `uv run --with pytest pytest -q tests/test_api_integration.py`: fails before collection because `httpx` is not declared for `fastapi.testclient`.
- `uv run --with pytest --with httpx pytest -q tests/test_api_integration.py`: runs 9 tests with 6 passing and 3 failing.
- `docker compose config`: fails YAML parsing for `docker-compose.yml`.

## Failing API Test Contracts

- `tests/test_api_integration.py::test_workflow_decision_flow` expects certifier approval to return `new_status == "AVAILABLE"`, while `backend/main.py` returns `AUDITED`.
- `tests/test_api_integration.py::test_monetization_endpoints` expects `GET /api/v1/monetization`, but `backend/main.py` has that endpoint removed.
- `tests/test_api_integration.py::test_stellar_service_missing_keys_raises` expects missing Stellar keys to raise `RuntimeError`, but `backend/services/stellar_service.py` does not raise for `StellarConfig(enabled=True, issuer_public_key="", distributor_public_key="")` on `transfer_credit`.

## Backend Rewrite Test Priorities

- Convert `tests/test_api_integration.py` into a contract suite for the Node backend before replacing `backend/main.py`.
- Add dev/test dependencies to the backend manifest equivalent: pytest runner, `httpx` for FastAPI compatibility while Python remains, and a Node test runner for the rewrite.
- Add response-shape contract tests for `src/services/database.ts`: project list, project detail, certifier list, auditor list, company list, inventory list, marketplace buy, and auth login.
- Add frontend integration tests for auth persistence in `src/contexts/AuthContext.tsx`, token handling in `src/services/api.ts`, and protected routing in `src/components/ProtectedRoute.tsx`.
- Replace `tests/test_gui_flows.py` with a portable Playwright config and assertions, or move it outside the canonical test suite if it remains screenshot-only.
- Add Docker validation commands to CI: parse compose config, build `Dockerfile.api`, build `Dockerfile.frontend`, and build the combined `Dockerfile`.

---

*Testing analysis: 2026-05-22*
