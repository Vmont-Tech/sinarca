from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_frontend_profile_contract_keeps_editable_fields() -> None:
    auth_context = read("src/contexts/AuthContext.tsx")
    settings = read("src/pages/Dashboard/Settings.tsx")

    assert "organization?: string;" in auth_context
    assert "phone?: string;" in auth_context
    assert "organization: raw?.organization" in auth_context
    assert "phone: raw?.phone" in auth_context
    assert "useState(user?.organization || '')" in settings
    assert "useState(user?.phone || '')" in settings
    assert "await updateProfile({ name, email, organization: company, phone }" in settings


def test_frontend_auth_does_not_keep_local_user_database_fallback() -> None:
    auth_context = read("src/contexts/AuthContext.tsx")
    login_page = read("src/pages/Login.tsx")
    user_profile = read("src/pages/Dashboard/UserProfile.tsx")
    monitoring = read("src/pages/Dashboard/MonitoringNDVI.tsx")
    transaction_details = read("src/pages/Dashboard/TransactionDetails.tsx")
    mrca_db = read("src/data/mrca_db.ts")

    assert "sinarca_users_db" not in auth_context
    assert "ALLOW_LOCAL_AUTH_FALLBACK" not in auth_context
    assert "loginWithGovBr" not in auth_context
    assert "loginWithGovBr" not in login_page
    assert "MOCK_DB" not in user_profile
    assert "PROJECTS_DB" not in mrca_db
    assert "CERTIFIERS_DB" not in mrca_db
    assert "AUDITORS_DB" not in mrca_db
    assert "COMPANIES_DB" not in mrca_db
    assert "INVENTORY_DB" not in mrca_db
    assert "PROJECT_INFO" not in monitoring
    assert "QTAGS_STATUS" not in monitoring
    assert "based on hash" not in transaction_details
