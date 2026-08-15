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
    assert "if (normalized === 'admin') return 'company';" not in auth_context
    assert "useState(user?.organization || '')" in settings
    assert "useState(user?.phone || '')" in settings
    assert "useState(user?.document || '')" in settings
    assert "uploadAvatar: (file: File) => Promise<void>;" in auth_context
    assert "uploadUserDocument: (file: File, documentType: string) => Promise<UserDocumentUpload | null>;" in auth_context
    assert "new FormData()" in auth_context
    assert "apiPost<any>('/auth/me/avatar', formData)" in auth_context
    assert "apiPost<UserDocumentUpload>('/auth/me/documents', formData)" in auth_context
    assert 'accept="image/png,image/jpeg,image/webp"' in settings
    assert 'accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"' in settings
    assert "handleAvatarSelected" in settings
    assert "handleUserDocumentSelected" in settings
    assert "Avatar / Logo URL" not in settings
    assert "await updateProfile({ name, email, organization: company, phone, document }" in settings


def test_profile_avatar_falls_back_to_local_initials_without_external_service() -> None:
    avatar_component = read("src/components/UserAvatar.tsx")
    settings = read("src/pages/Dashboard/Settings.tsx")
    dashboard_layout = read("src/layouts/DashboardLayout.tsx")

    assert "function initialsFromName" in avatar_component
    assert "return initials || 'S';" in avatar_component
    assert "onError={() => setImageFailed(true)}" in avatar_component
    assert "ui-avatars.com" not in settings
    assert "ui-avatars.com" not in dashboard_layout
    assert "<UserAvatar" in settings
    assert "<UserAvatar" in dashboard_layout


def test_login_registration_has_profile_specific_fields() -> None:
    login_page = read("src/pages/Login.tsx")

    assert "const REGISTRATION_PROFILE_CONFIG" in login_page
    assert "registrationProfile = REGISTRATION_PROFILE_CONFIG[role]" in login_page
    assert "regOrganization" in login_page
    assert "regPhone" in login_page
    assert "organization: regOrganization" in login_page
    assert "phone: regPhone" in login_page
    assert "Dados do perfil {registrationProfile.title}" in login_page
    assert "registrationProfile.organizationLabel" in login_page
    assert "registrationProfile.documentLabel" in login_page
    assert "registrationProfile.phoneLabel" in login_page


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


def test_certifier_navigation_keeps_single_traceability_item() -> None:
    dashboard_layout = read("src/layouts/DashboardLayout.tsx")
    certifier_block = dashboard_layout.split("{isCertifier && (", 1)[1].split("{isAuditor && (", 1)[0]

    assert 'label="Ledger"' not in certifier_block
    assert dashboard_layout.count('to="/painel/transacoes" icon={History}') == 1
    assert 'label="Rastreabilidade"' in dashboard_layout
