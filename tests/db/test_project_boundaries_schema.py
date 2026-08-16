from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POSTGIS_SQL = ROOT / "supabase/migrations/202608150002_enable_postgis.sql"
BOUNDARIES_SQL = ROOT / "supabase/migrations/202608150003_project_boundaries.sql"
BACKFILL_SQL = ROOT / "supabase/migrations/202608150004_backfill_declared_boundaries.sql"
INITIAL_SCHEMA_SQL = ROOT / "supabase/migrations/202605220001_initial_schema.sql"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def sql_without_comments(path: Path) -> str:
    return "\n".join(line for line in read(path).splitlines() if not line.strip().startswith("--")).lower()


def test_postgis_extension_migration_exists() -> None:
    assert "create extension if not exists postgis" in sql_without_comments(POSTGIS_SQL)


def test_project_boundaries_has_four_geometry_columns() -> None:
    sql = sql_without_comments(BOUNDARIES_SQL)
    for name in ["declared_boundary", "field_verified_boundary", "certified_boundary", "active_boundary"]:
        assert f"{name} geometry(polygon, 4326)" in sql


def test_project_boundaries_has_unique_project_index_and_gist_index() -> None:
    sql = sql_without_comments(BOUNDARIES_SQL)
    assert "create unique index if not exists project_boundaries_project_id_idx" in sql
    assert "using gist (active_boundary)" in sql


def test_project_boundaries_is_backend_only_operational_table() -> None:
    sql = sql_without_comments(BOUNDARIES_SQL)
    assert "enable row level security" in sql
    assert "revoke insert, update, delete on project_boundaries from anon, authenticated" in sql
    assert "create policy" not in sql


def test_backfill_is_idempotent_upsert() -> None:
    assert "on conflict (project_id) do update" in sql_without_comments(BACKFILL_SQL)


def test_backfill_reuses_polar_angle_ordering() -> None:
    assert "atan2(t.latitude - c.c_lat, t.longitude - c.c_lng)" in sql_without_comments(BACKFILL_SQL)


def test_backfill_uses_lng_lat_point_order() -> None:
    assert "st_makepoint(o.longitude::float8, o.latitude::float8)" in sql_without_comments(BACKFILL_SQL)


def test_backfill_area_uses_geography_cast() -> None:
    assert "st_area(p.boundary::geography)" in sql_without_comments(BACKFILL_SQL)


def test_backfill_mirrors_active_boundary() -> None:
    sql = sql_without_comments(BACKFILL_SQL)
    assert "active_boundary_tier = excluded.active_boundary_tier" in sql
    assert "'declared'" in sql


def test_project_tags_table_is_untouched() -> None:
    assert "create table project_tags" in read(INITIAL_SCHEMA_SQL).lower()
    for sql in [sql_without_comments(BOUNDARIES_SQL), sql_without_comments(BACKFILL_SQL)]:
        assert "drop table" not in sql
        assert "alter table project_tags" not in sql
