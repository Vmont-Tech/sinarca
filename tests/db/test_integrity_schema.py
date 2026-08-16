from __future__ import annotations

from pathlib import Path

from backend_app.modules.integrity.constants import (
    CLAIM_STATUSES,
    CLAIM_TYPES,
    CONFLICT_SEVERITIES,
    CONFLICT_STATUSES,
    CONFLICT_TYPES,
    EVIDENCE_SOURCE_TYPES,
    EVIDENCE_VALIDATION_METHODS,
    EVIDENCE_VALIDATION_STATUSES,
    INTEGRITY_STATUSES,
    RISK_CLASSES,
)

ROOT = Path(__file__).resolve().parents[2]
CORE_SQL = ROOT / "supabase/migrations/202608170001_integrity_claims_evidence_conflicts.sql"
RISK_SQL = ROOT / "supabase/migrations/202608170002_integrity_risk_assessments.sql"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def sql_without_comments(path: Path) -> str:
    return "\n".join(line for line in read(path).splitlines() if not line.strip().startswith("--")).lower()


def test_integrity_core_tables_exist() -> None:
    sql = sql_without_comments(CORE_SQL)
    assert "create table if not exists claims" in sql
    assert "create table if not exists evidence" in sql
    assert "create table if not exists conflicts" in sql


def test_risk_tables_exist() -> None:
    sql = sql_without_comments(RISK_SQL)
    assert "create table if not exists risk_assessments" in sql
    assert "create table if not exists risk_signals" in sql


def test_no_new_postgres_enum_types() -> None:
    for path in (CORE_SQL, RISK_SQL):
        assert "create type" not in sql_without_comments(path)


def test_check_constraints_mirror_constants() -> None:
    core_sql = sql_without_comments(CORE_SQL)
    risk_sql = sql_without_comments(RISK_SQL)
    for vocab in (
        CLAIM_TYPES,
        CLAIM_STATUSES,
        EVIDENCE_SOURCE_TYPES,
        EVIDENCE_VALIDATION_METHODS,
        EVIDENCE_VALIDATION_STATUSES,
        CONFLICT_TYPES,
        CONFLICT_SEVERITIES,
        CONFLICT_STATUSES,
    ):
        for value in vocab:
            assert f"'{value.lower()}'" in core_sql, f"{value} missing from core SQL"
    for vocab in (INTEGRITY_STATUSES, RISK_CLASSES):
        for value in vocab:
            assert f"'{value.lower()}'" in risk_sql, f"{value} missing from risk SQL"
    for value in INTEGRITY_STATUSES:
        assert f"'{value.lower()}'" in core_sql, f"{value} missing from core SQL (projects.integrity_status)"


def test_evidence_validation_method_is_capped_to_two_methods() -> None:
    sql = sql_without_comments(CORE_SQL)
    assert "check (validation_method in ('hash_integrity', 'structural_completeness'))" in sql


def test_integrity_tables_are_backend_only() -> None:
    core_sql = sql_without_comments(CORE_SQL)
    assert core_sql.count("enable row level security") == 3
    assert "revoke insert, update, delete on claims, evidence, conflicts from anon, authenticated" in core_sql
    assert "create policy" not in core_sql

    risk_sql = sql_without_comments(RISK_SQL)
    assert risk_sql.count("enable row level security") == 2
    assert "revoke insert, update, delete on risk_assessments, risk_signals from anon, authenticated" in risk_sql
    assert "create policy" not in risk_sql


def test_conflicts_have_unique_pair_index_for_resync() -> None:
    assert "create unique index if not exists conflicts_project_related_type_idx" in sql_without_comments(CORE_SQL)


def test_claims_have_unique_project_type_index() -> None:
    assert "create unique index if not exists claims_project_type_idx" in sql_without_comments(CORE_SQL)


def test_risk_assessments_are_append_only() -> None:
    sql = sql_without_comments(RISK_SQL)
    assert "risk_assessments_project_created_idx" in sql
    for line in sql.splitlines():
        if "risk_assessments" in line:
            assert "unique" not in line, f"unexpected unique constraint on risk_assessments: {line}"


def test_projects_columns_are_additive_only() -> None:
    sql = sql_without_comments(CORE_SQL)
    assert "alter table projects add column if not exists integrity_status" in sql
    assert "alter table projects add column if not exists risk_score" in sql
    assert "drop column" not in sql
    assert "alter table projects alter column status" not in sql


def test_existing_tables_are_not_dropped() -> None:
    for path in (CORE_SQL, RISK_SQL):
        assert "drop table" not in sql_without_comments(path)
