from __future__ import annotations

from pathlib import Path

from backend_app.modules.satellite.constants import (
    COPERNICUS_USAGE_ENDPOINTS,
    CREDIT_ADJUSTMENT_PENDENCY_STATUSES,
    PROJECT_EVENT_SEVERITIES,
    PROJECT_EVENT_STATUSES,
    PROJECT_EVENT_TYPES,
    SATELLITE_ANOMALY_STATUSES,
    SATELLITE_EVIDENCE_KINDS,
    SATELLITE_JOB_STATUSES,
    SATELLITE_JOB_TYPES,
)

ROOT = Path(__file__).resolve().parents[2]
CORE_SQL = ROOT / "supabase/migrations/202608180001_satellite_observations_anomalies_events.sql"
JOBS_SQL = ROOT / "supabase/migrations/202608180002_satellite_jobs_copernicus_usage.sql"
CREDIT_SQL = ROOT / "supabase/migrations/202608180003_credit_adjustment_pendencies.sql"


def sql_without_comments(path: Path) -> str:
    return "\n".join(
        line for line in path.read_text(encoding="utf-8").splitlines()
        if not line.strip().startswith("--")
    ).lower()


def test_satellite_core_tables_exist() -> None:
    sql = sql_without_comments(CORE_SQL)
    assert "create table if not exists satellite_observations" in sql
    assert "create table if not exists satellite_anomalies" in sql
    assert "create table if not exists project_events" in sql
    assert "create table if not exists satellite_evidence" in sql


def test_satellite_jobs_and_usage_tables_exist() -> None:
    sql = sql_without_comments(JOBS_SQL)
    assert "create table if not exists satellite_jobs" in sql
    assert "create table if not exists copernicus_api_usage" in sql


def test_credit_adjustment_pendencies_table_exists() -> None:
    sql = sql_without_comments(CREDIT_SQL)
    assert "create table if not exists credit_adjustment_pendencies" in sql


def test_observation_idempotency_index_matches_d15() -> None:
    sql = sql_without_comments(CORE_SQL)
    assert "create unique index if not exists satellite_observations_idempotency_idx" in sql
    assert "(project_id, satellite, scene_id, processing_version)" in sql


def test_project_event_vocabulary_mirrors_constants() -> None:
    sql = sql_without_comments(CORE_SQL)
    for vocab in (PROJECT_EVENT_TYPES, PROJECT_EVENT_STATUSES, PROJECT_EVENT_SEVERITIES):
        for value in vocab:
            assert f"'{value.lower()}'" in sql, f"{value} missing from core SQL"


def test_anomaly_and_evidence_vocabulary_mirrors_constants() -> None:
    sql = sql_without_comments(CORE_SQL)
    for vocab in (SATELLITE_ANOMALY_STATUSES, SATELLITE_EVIDENCE_KINDS):
        for value in vocab:
            assert f"'{value.lower()}'" in sql, f"{value} missing from core SQL"


def test_job_and_usage_vocabulary_mirrors_constants() -> None:
    jobs_sql = sql_without_comments(JOBS_SQL)
    for vocab in (SATELLITE_JOB_TYPES, SATELLITE_JOB_STATUSES, COPERNICUS_USAGE_ENDPOINTS):
        for value in vocab:
            assert f"'{value.lower()}'" in jobs_sql, f"{value} missing from jobs SQL"

    credit_sql = sql_without_comments(CREDIT_SQL)
    for value in CREDIT_ADJUSTMENT_PENDENCY_STATUSES:
        assert f"'{value.lower()}'" in credit_sql, f"{value} missing from credit SQL"


def test_no_enum_type_is_created() -> None:
    for path in (CORE_SQL, JOBS_SQL, CREDIT_SQL):
        assert "create type" not in sql_without_comments(path)


def test_deforestation_is_never_a_valid_event_type() -> None:
    for path in (CORE_SQL, JOBS_SQL, CREDIT_SQL):
        assert "deforestation" not in sql_without_comments(path)


def test_rls_enabled_without_select_policy() -> None:
    for path in (CORE_SQL, JOBS_SQL, CREDIT_SQL):
        sql = sql_without_comments(path)
        assert "enable row level security" in sql
        assert "revoke insert, update, delete" in sql
        assert "create policy" not in sql
