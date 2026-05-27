from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_SQL = ROOT / "supabase/migrations/202605220001_initial_schema.sql"
RLS_SQL = ROOT / "supabase/migrations/202605220002_rls_policies.sql"
SEED_SQL = ROOT / "supabase/seed.sql"
INVENTORY_UF_MIGRATION_SQL = ROOT / "supabase/migrations/202605260001_inventory_regions_brazil_ufs.sql"
PROJECT_DRAFTS_MIGRATION_SQL = ROOT / "supabase/migrations/202605260003_project_drafts.sql"
PROJECT_PUBLIC_MARKETPLACE_MIGRATION_SQL = ROOT / "supabase/migrations/202605260004_project_public_marketplace.sql"
PROJECT_OPTIONAL_QTAGS_MIGRATION_SQL = ROOT / "supabase/migrations/202605260005_project_vertices_optional_qtags.sql"
SUPABASE_STORAGE_MIGRATION_SQL = ROOT / "supabase/migrations/202605260006_supabase_storage_buckets.sql"

BRAZIL_UFS = {
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
    "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
    "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
}


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
        "projects": ["public_marketplace"],
        "documents": ["storage_bucket", "storage_object_path"],
        "project_tags": ["project_id", "has_qtag", "tag_uid", "cmac", "latitude", "longitude", "vertex_label", "status", "first_seen_at"],
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
        "projects_public_marketplace_ready_idx",
        "projects",
        "project_baselines_baseline_hash_idx",
        "chain_events_source_tx_hash_idx",
        "external_chain_projects_source_tx_hash_idx",
    ]:
        assert marker in sql


def test_projects_have_explicit_public_marketplace_flag_defaulting_false() -> None:
    schema_sql = read(SCHEMA_SQL).lower()
    migration_sql = read(PROJECT_PUBLIC_MARKETPLACE_MIGRATION_SQL).lower()
    seed_sql = read(SEED_SQL).lower()

    projects_block = table_block(schema_sql, "projects")
    assert "public_marketplace boolean not null default false" in projects_block

    assert "add column if not exists public_marketplace boolean not null default false" in migration_sql
    assert "projects_public_marketplace_ready_idx" in migration_sql
    assert "where public_marketplace is true" in migration_sql
    assert "status in ('active', 'available')" in migration_sql

    assert "public_marketplace" in seed_sql
    assert "'prc-2024-002'" in seed_sql
    assert "true" in seed_sql


def test_project_tags_schema_supports_variable_qtag_count_per_project() -> None:
    sql = read(SCHEMA_SQL).lower()
    migration_sql = read(PROJECT_OPTIONAL_QTAGS_MIGRATION_SQL).lower()
    block = table_block(sql, "project_tags")

    assert "project_id" in block
    assert "vertex_label" in block
    assert "has_qtag boolean not null default false" in block
    assert "tag_uid text not null" not in block
    assert "cmac text not null" not in block
    assert "vertex_a" not in block
    assert "vertex_b" not in block
    assert "vertex_c" not in block
    assert "vertex_d" not in block
    assert "project_tags_project_id_idx" in sql
    assert "project_tags_tag_uid_idx" in sql
    assert "where tag_uid is not null" in sql
    assert "add column if not exists has_qtag boolean not null default true" in migration_sql
    assert "alter column tag_uid drop not null" in migration_sql
    assert "alter column cmac drop not null" in migration_sql
    assert "where tag_uid is not null" in migration_sql


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


def test_seed_contains_all_brazilian_ufs_for_inventory_catalog() -> None:
    sql = read(SEED_SQL)
    match = re.search(
        r"insert into inventory_regions .*?values\n(?P<values>.*?)\non conflict",
        sql,
        flags=re.IGNORECASE | re.DOTALL,
    )
    assert match is not None

    seeded_ufs = set(re.findall(r"\('[a-z]{2}', '([A-Z]{2})',", match.group("values")))
    assert seeded_ufs == BRAZIL_UFS


def test_inventory_catalog_descriptions_and_source_are_environmental() -> None:
    sql = read(SEED_SQL)
    migration_sql = read(INVENTORY_UF_MIGRATION_SQL)
    source = "SEEG 13.0 (17/12/2025) - https://seeg.eco.br/dados/"

    assert "Catálogo nacional de UFs" not in sql
    assert "Catálogo nacional de UFs" not in migration_sql
    assert "Seed demonstrativo SINARCA" not in sql

    assert sql.count(source) >= 27
    assert migration_sql.count(source) == 27
    assert "source = excluded.source" in migration_sql


def test_seed_demo_project_copy_uses_pt_br_accents() -> None:
    sql = read(SEED_SQL)

    for expected in [
        "Projeto demonstrativo de restauração ambiental",
        "catálogo local do SINARCA",
        "Área de exemplo com passivo de recomposição florestal",
        "conectividade ecológica",
        "demonstração",
        "áreas e iniciativas públicas de restauração",
        "certificação oficial",
        "Código Florestal",
    ]:
        assert expected in sql

    for forbidden in [
        "restauracao",
        "catalogo",
        "Area de exemplo",
        "recomposicao",
        "ecologica",
        "demonstracao",
        "publicas de restauracao",
        "certificacao oficial",
        "Codigo Florestal",
    ]:
        assert forbidden not in sql


def test_project_drafts_schema_keeps_incomplete_origination_out_of_projects() -> None:
    sql = read(PROJECT_DRAFTS_MIGRATION_SQL).lower()

    drafts_block = table_block(sql, "project_drafts")
    documents_block = table_block(sql, "project_draft_documents")

    for column in [
        "owner_profile_id",
        "producer_organization_id",
        "draft_kind",
        "target_project_id",
        "current_step",
        "status",
        "payload jsonb",
        "submitted_project_id",
        "submitted_at",
        "created_at",
        "updated_at",
    ]:
        assert column in drafts_block

    for marker in [
        "check (status in ('draft', 'submitted', 'discarded'))",
        "check (draft_kind in ('create', 'edit'))",
        "project_drafts_owner_status_idx",
        "project_drafts_producer_status_idx",
        "project_drafts_target_project_idx",
    ]:
        assert marker in sql

    for column in [
        "draft_id",
        "owner_profile_id",
        "document_type",
        "storage_bucket",
        "storage_object_path",
        "storage_path",
        "sha256_hash",
        "mime_type",
        "size_bytes",
        "uploaded_at",
        "metadata jsonb",
    ]:
        assert column in documents_block

    for marker in [
        "references project_drafts(id) on delete cascade",
        "project_draft_documents_sha256_hash_idx",
        "project_draft_documents_draft_idx",
        "alter table project_drafts enable row level security",
        "alter table project_draft_documents enable row level security",
    ]:
        assert marker in sql


def test_supabase_storage_buckets_and_document_paths_are_standardized() -> None:
    schema_sql = read(SCHEMA_SQL).lower()
    migration_sql = read(SUPABASE_STORAGE_MIGRATION_SQL).lower()

    documents_block = table_block(schema_sql, "documents")
    assert "storage_bucket text not null default 'projects'" in documents_block
    assert "storage_object_path text" in documents_block

    for bucket, public_value in [
        ("projects", "false"),
        ("profiles", "true"),
        ("user-documents", "false"),
    ]:
        assert f"'{bucket}', '{bucket}', {public_value}" in migration_sql

    for marker in [
        "alter table documents add column if not exists storage_bucket",
        "alter table documents add column if not exists storage_object_path",
        "alter table project_draft_documents add column if not exists storage_bucket",
        "alter table project_draft_documents add column if not exists storage_object_path",
        "documents_storage_bucket_object_path_idx",
        "project_draft_documents_storage_bucket_object_path_idx",
        "projects/{project_friendly_id}/documents/{document_type}/{sha256}.{ext}",
        "projects/drafts/{draft_id}/documents/{document_type}/{sha256}.{ext}",
        "profiles/{profile_id}/avatar/{sha256}.{ext}",
        "user-documents/{profile_id}/documents/{document_type}/{sha256}.{ext}",
    ]:
        assert marker in migration_sql
