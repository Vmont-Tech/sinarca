from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_SQL = ROOT / "supabase/migrations/202605220001_initial_schema.sql"
RLS_SQL = ROOT / "supabase/migrations/202605220002_rls_policies.sql"
SEED_SQL = ROOT / "supabase/seed.sql"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def table_block(sql: str, table_name: str) -> str:
    match = re.search(rf"create table {table_name} \((.*?)\n\);", sql, flags=re.IGNORECASE | re.DOTALL)
    assert match is not None, f"missing table {table_name}"
    return match.group(1).lower()


def test_schema_contains_operational_tables_and_required_columns() -> None:
    sql = read(SCHEMA_SQL).lower()

    for table in [
        "profiles",
        "organizations",
        "inventory_regions",
        "projects",
        "project_tags",
        "project_baselines",
        "certifications",
        "audits",
        "environmental_credits",
        "ledger_accounts",
        "ledger_entries",
        "purchases",
        "retirements",
        "treasury_positions",
        "yield_distributions",
        "chain_events",
        "external_chain_projects",
        "documents",
        "audit_events",
        "idempotency_keys",
    ]:
        assert f"create table {table}" in sql

    expected_columns = {
        "project_tags": ["project_id", "tag_uid", "cmac", "latitude", "longitude", "vertex_label", "status", "first_seen_at"],
        "project_baselines": [
            "project_id",
            "sentinel_scene_id",
            "baseline_hash",
            "points_analyzed",
            "vegetation_cover_pct",
            "ndvi_mean",
            "captured_at",
        ],
        "ledger_entries": [
            "account_id",
            "entry_type",
            "amount",
            "unit",
            "project_id",
            "purchase_id",
            "retirement_id",
            "idempotency_key",
            "created_at",
        ],
        "treasury_positions": ["project_id", "provider", "principal_brl", "instrument", "external_reference", "status"],
        "yield_distributions": ["treasury_position_id", "gross_yield_brl", "operational_brl", "social_vault_brl", "distribution_month"],
        "external_chain_projects": ["chain", "vault_address", "source_token_address", "source_tx_hash", "wrapped_stellar_asset", "status"],
    }

    for table, columns in expected_columns.items():
        block = table_block(sql, table)
        for column in columns:
            assert column in block, f"missing {table}.{column}"


def test_schema_has_required_uniqueness_for_idempotency_and_external_refs() -> None:
    sql = read(SCHEMA_SQL).lower()

    for marker in [
        "purchases_idempotency_key_idx",
        "retirements_idempotency_key_idx",
        "ledger_entries_idempotency_key_idx",
        "idempotency_keys_key_scope_idx",
        "project_tags_tag_uid_idx",
        "projects",
        "project_baselines_baseline_hash_idx",
        "chain_events_source_tx_hash_idx",
        "external_chain_projects_source_tx_hash_idx",
    ]:
        assert marker in sql


def test_rls_uses_public_read_and_backend_service_role_without_supabase_auth_claims() -> None:
    sql = read(RLS_SQL).lower()

    for table in ["profiles", "projects", "ledger_entries", "purchases", "retirements", "treasury_positions", "chain_events"]:
        assert f"alter table {table} enable row level security" in sql

    assert "service role" in sql
    assert "auth própria" in sql
    forbidden = ["auth.uid", "request.jwt.claim", "jwt()"]
    for marker in forbidden:
        assert marker not in sql


def test_seed_consolidates_backend_and_frontend_mocks_idempotently() -> None:
    sql = read(SEED_SQL)

    for marker in [
        "legacy-mvp-seed",
        "src/data/mrca_db.ts",
        "Transactions.tsx",
        "AuditorReview",
        "CertifierReview",
        "PRC-2024-002",
        "PRC-2024-882",
        "PRC-2026-010",
        "PRC-2026-011",
        "tx-001",
        "tx-002",
        "tx-003",
        "tx-004",
        "tx-005",
        "inventory_regions",
        "on conflict",
    ]:
        assert marker in sql
