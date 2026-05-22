from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from backend.main import ACTIVE_SESSIONS, app, USERS, PROJECTS, TRANSACTIONS
from backend.services.stellar_service import StellarService, StellarConfig

client = TestClient(app)
BASELINE_PROJECTS = deepcopy(PROJECTS)

@pytest.fixture(autouse=True)
def reset_state():
    """Reset dynamic datasets to prevent pollution between tests."""
    USERS[:] = [
        {"id": "admin-001", "name": "Administrador SINARCA", "email": "admin@sinarca.com.br", "document": "000.000.000-00", "role": "admin", "password": "admin"},
        {"id": "aud-005", "name": "Vinícius Monteiro", "email": "auditor@sinarca.com.br", "document": "111.111.111-11", "role": "auditor", "password": "auditor"},
    ]
    # Ensure demo users
    from backend.main import _ensure_demo_users
    _ensure_demo_users()

    PROJECTS[:] = deepcopy(BASELINE_PROJECTS)
    TRANSACTIONS.clear()
    ACTIVE_SESSIONS.clear()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "sinarca-api",
        "version": "0.2.0-integrated"
    }


def test_login_invalid_credentials():
    response = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@sinarca.com.br",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_demo_users():
    # Admin login
    res_admin = client.post("/api/v1/auth/login", json={
        "email": "admin@sinarca.com.br",
        "password": "admin"
    })
    assert res_admin.status_code == 200
    assert res_admin.json()["user"]["role"] == "admin"
    assert "token" in res_admin.json()

    # Certifier login
    res_cert = client.post("/api/v1/auth/login", json={
        "email": "certificadora@sinarca.com.br",
        "password": "certificadora"
    })
    assert res_cert.status_code == 200
    assert res_cert.json()["user"]["role"] == "certifier"


def test_register_role_constraints():
    # Attempt to register role=admin (must be blocked)
    res_admin = client.post("/api/v1/auth/register", json={
        "name": "Hacker Admin",
        "email": "hacker@sinarca.com.br",
        "password": "pass",
        "role": "admin"
    })
    assert res_admin.status_code == 400
    assert "Admin deve ser provisionado fora do cadastro público" in res_admin.json()["detail"]

    # Register valid producer
    res_prod = client.post("/api/v1/auth/register", json={
        "name": "Produtor Novo",
        "email": "novo_prod@sinarca.com.br",
        "password": "prodpassword",
        "role": "producer"
    })
    assert res_prod.status_code == 201
    assert res_prod.json()["user"]["role"] == "producer"


def test_project_retrieval():
    # List all
    res_list = client.get("/api/v1/projects")
    assert res_list.status_code == 200
    assert "projects" in res_list.json()
    assert len(res_list.json()["projects"]) > 0

    # Get single valid
    first_proj_id = res_list.json()["projects"][0]["id"]
    res_single = client.get(f"/api/v1/projects/{first_proj_id}")
    assert res_single.status_code == 200
    assert res_single.json()["project"]["id"] == first_proj_id

    # Get invalid
    res_invalid = client.get("/api/v1/projects/invalid-id-000")
    assert res_invalid.status_code == 404


def test_workflow_decision_flow():
    # Locate project with AUDITED status and release it through the auditor flow.
    audited_projects = [p for p in PROJECTS if p["status"] == "AUDITED"]
    assert len(audited_projects) > 0
    project = audited_projects[0]
    pid = project["id"]

    # Certifier decision preserves the active contract and returns the certification status.
    res_cert = client.patch(f"/api/v1/certifier/projects/{pid}/decision", json={
        "decision": "APPROVE",
        "certifier_id": "std-001",
        "notes": "Aprovado nos testes automatizados"
    })
    assert res_cert.status_code == 200
    assert res_cert.json()["new_status"] == "AUDITED"

    # Auditor approval releases the project to the marketplace.
    res_audit = client.patch(f"/api/v1/audit/verify/{pid}", json={
        "status": "APPROVED",
        "laudo_texto": "Aprovado em vistoria automatizada",
        "auditor_id": "aud-005",
    })
    assert res_audit.status_code == 200
    assert res_audit.json()["new_status"] == "AVAILABLE"

    # Marketplace verification
    res_market = client.get("/api/v1/marketplace")
    assert res_market.status_code == 200
    market_ids = [p["id"] for p in res_market.json()["credits"]]
    assert pid in market_ids

    # Purchase credits
    original_stock = project["metrics"]["carbonStock"]
    buy_qty = 10.0
    res_buy = client.post("/api/v1/marketplace/buy", json={
        "project_id": pid,
        "buyer_id": "comp-001",
        "quantidade": buy_qty,
        "unit_price_brl": 500.0
    })
    assert res_buy.status_code == 200
    assert res_buy.json()["success"] is True
    transaction = res_buy.json()["transaction"]
    assert transaction["tipo_transacao"] == "PURCHASE"
    assert transaction["totalValue"] == 5000.0
    assert transaction["hash_transacao_stellar"]

    # Stock decrement check
    assert project["metrics"]["carbonStock"] == round(original_stock - buy_qty, 6)


def test_stellar_service_mock_mode():
    svc = StellarService(StellarConfig(enabled=False))
    res = svc.transfer_credit(amount=5.0, from_account="dev-001", to_account="comp-001", memo="test")
    assert res["success"] is True
    assert res["mode"] == "mock"
    assert "stellar_mock_" in res["hash"]
    assert res["amount"] == 5.0


def test_stellar_service_missing_keys_raises():
    svc = StellarService(StellarConfig(enabled=True, issuer_public_key="", distributor_public_key=""))
    with pytest.raises(RuntimeError) as exc:
        svc.transfer_credit(amount=5.0, from_account="dev-001", to_account="comp-001", memo="test")
    assert "Configuração Stellar incompleta" in str(exc.value)
