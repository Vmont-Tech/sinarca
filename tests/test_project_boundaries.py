from __future__ import annotations

import asyncio
import math
from pathlib import Path

from sqlalchemy import text

from backend_app.db.session import get_sessionmaker
from backend_app.modules.projects.service import _polygon_area

ROOT = Path(__file__).resolve().parents[1]
BACKFILL_SQL = ROOT / "supabase/migrations/202608150004_backfill_declared_boundaries.sql"


def test_postgis_extension_is_enabled() -> None:
    async def evaluate() -> str:
        async with get_sessionmaker()() as session:
            row = (await session.execute(text("select postgis_full_version() as v"))).mappings().one()
            return row["v"]

    version = asyncio.run(evaluate())
    assert version
    assert "POSTGIS" in version.upper()


def test_project_boundaries_columns_are_polygon_4326() -> None:
    async def evaluate() -> list[dict[str, object]]:
        async with get_sessionmaker()() as session:
            rows = (
                await session.execute(
                    text(
                        """
                        select f_geometry_column, type, srid, coord_dimension
                        from geometry_columns
                        where f_table_name = 'project_boundaries'
                        """
                    )
                )
            ).mappings().all()
            return [dict(row) for row in rows]

    rows = asyncio.run(evaluate())
    columns = {row["f_geometry_column"] for row in rows}
    assert columns == {"declared_boundary", "field_verified_boundary", "certified_boundary", "active_boundary"}
    for row in rows:
        assert row["type"] == "POLYGON"
        assert row["srid"] == 4326


def test_backfill_declared_boundary_matches_shoelace() -> None:
    async def evaluate() -> dict[str, object]:
        async with get_sessionmaker()() as session:
            boundary_row = (
                await session.execute(
                    text(
                        """
                        select p.friendly_id,
                               b.declared_vertex_count,
                               ST_NPoints(b.declared_boundary) as npoints,
                               ST_IsValid(b.declared_boundary) as is_valid,
                               ST_AsText(b.declared_boundary) as wkt,
                               ST_Equals(b.declared_boundary, b.active_boundary) as active_mirrors_declared,
                               b.active_boundary_tier
                        from project_boundaries b
                        join projects p on p.id = b.project_id
                        where p.friendly_id = 'PRC-2024-002'
                        """
                    )
                )
            ).mappings().all()

            tag_rows = (
                await session.execute(
                    text(
                        """
                        select t.latitude, t.longitude
                        from project_tags t
                        join projects p on p.id = t.project_id
                        where p.friendly_id = 'PRC-2024-002'
                        """
                    )
                )
            ).mappings().all()

            return {"boundary_rows": [dict(r) for r in boundary_row], "tag_rows": [dict(r) for r in tag_rows]}

    result = asyncio.run(evaluate())
    boundary_rows = result["boundary_rows"]
    tag_rows = result["tag_rows"]

    assert len(boundary_rows) == 1
    row = boundary_rows[0]
    assert row["is_valid"] is True
    assert row["declared_vertex_count"] == 4
    assert row["npoints"] == 5
    assert row["active_mirrors_declared"] is True
    assert row["active_boundary_tier"] == "DECLARED"

    # WKT is POLYGON((lng lat, lng lat, ...)) — reverse to (lat, lng) tuples.
    wkt = row["wkt"]
    inner = wkt[wkt.index("((") + 2 : wkt.rindex("))")]
    raw_points = [p.strip() for p in inner.split(",")]
    ring_tuples = []
    for point in raw_points:
        lng_str, lat_str = point.split()
        ring_tuples.append((float(lat_str), float(lng_str)))
    ring_tuples = ring_tuples[:-1]  # drop repeated closing point

    tag_tuples = [(float(t["latitude"]), float(t["longitude"])) for t in tag_rows]

    assert set(ring_tuples) == set(tag_tuples)
    assert math.isclose(_polygon_area(ring_tuples), _polygon_area(tag_tuples), rel_tol=0, abs_tol=1e-12)


def test_backfill_is_idempotent() -> None:
    """Re-running the backfill migration must not duplicate a row for a
    project that is already backfilled.

    NOTE: this test asserts row-count stability scoped to PRC-2024-002, not
    the global project_boundaries table count. Under `uv run pytest -q` other
    tests in the suite create additional projects with project_tags (via the
    API) that this plan's scope does not yet backfill at write time (that is
    plan 04.1-02's job) -- so re-running the migration's SQL body legitimately
    inserts NEW rows for those other projects, without duplicating anything
    for PRC-2024-002. Scoping the assertion to one project_id is what the
    idempotency guarantee (`on conflict (project_id) do update`) actually
    means -- see must_haves: "Re-running the backfill migration a second time
    does not create a duplicate project_boundaries row" for THIS project.
    """
    sql = BACKFILL_SQL.read_text(encoding="utf-8")

    async def evaluate() -> dict[str, object]:
        async with get_sessionmaker()() as session:
            count_sql = text(
                """
                select count(*)
                from project_boundaries b
                join projects p on p.id = b.project_id
                where p.friendly_id = 'PRC-2024-002'
                """
            )
            before_count = (await session.execute(count_sql)).scalar_one()
            await session.execute(text(sql))
            await session.commit()
            after_count = (await session.execute(count_sql)).scalar_one()
            npoints = (
                await session.execute(
                    text(
                        """
                        select ST_NPoints(b.declared_boundary)
                        from project_boundaries b
                        join projects p on p.id = b.project_id
                        where p.friendly_id = 'PRC-2024-002'
                        """
                    )
                )
            ).scalar_one()
            return {"before_count": before_count, "after_count": after_count, "npoints": npoints}

    result = asyncio.run(evaluate())
    assert result["before_count"] == 1
    assert result["after_count"] == 1
    assert result["npoints"] == 5
