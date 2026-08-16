from __future__ import annotations

import asyncio
import math
import random
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


# --- Plan 04.1-02: GEOF-03 write-path validation + persistence battery ---

import copy

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend_app.main import app
from backend_app.modules.projects.service import MAX_PROJECT_TAG_VERTICES, _validate_boundary_geometry, _polygon_wkt

client = TestClient(app)

# `tests/` has no __init__.py, so `from tests.test_certifier_workbench import ...`
# does not resolve as a package import under this repo's pytest configuration.
# Per plan 04.1-02's fallback instruction, the HTTP fixtures are copied verbatim
# from tests/test_certifier_workbench.py rather than imported, using the exact
# same coordinates so results are directly comparable across suites.
PRODUCER = ("produtor@sinarca.com.br", "produtor")
CERTIFIER = ("certificadora@sinarca.com.br", "certificadora")


def auth_headers(email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def tag_payload(prefix: str) -> list[dict[str, object]]:
    points = [
        ("A", -10.100000, -48.300000),
        ("B", -10.100000, -48.320000),
        ("C", -10.120000, -48.320000),
        ("D", -10.120000, -48.300000),
    ]
    return [
        {
            "tag_uid": f"{prefix}-{index}",
            "cmac": f"cmac-{prefix}-{index}",
            "latitude": latitude,
            "longitude": longitude,
            "vertex_label": label,
        }
        for index, (label, latitude, longitude) in enumerate(points, start=1)
    ]


def project_payload(prefix: str, tags: list[dict[str, object]]) -> dict[str, object]:
    return {
        "name": f"Projeto Bancada Certificadora {prefix}",
        "description": "Projeto criado pelo contrato de testes da bancada de certificacao.",
        "project_type": "reforestation",
        "producer_id": "prod-001",
        "certifier_id": "std-001",
        "image_url": f"data:image/png;base64,{prefix}",
        "location": {
            "city": "Porto Nacional",
            "state": "Tocantins",
            "stateId": "to",
            "bioma": "Cerrado",
            "coordinates": {"lat": -10.70, "lng": -48.41, "svgX": 392, "svgY": 292},
        },
        "tags": tags,
    }


def test_postgis_rejects_self_intersecting_polygon() -> None:
    """_ordered_ring sorts vertices by polar angle around the centroid, which makes
    almost any vertex set star-shaped (and therefore simple/non-self-intersecting) by
    construction -- going through the API/service ordering path can never exercise a
    genuine self-intersection. This bowtie is built BY HAND, bypassing the ordering
    entirely, to prove the PostGIS ST_IsSimple layer is actually wired and would catch
    a non-star-shaped ring if one ever reached it.
    """

    async def run() -> None:
        async with get_sessionmaker()() as session:
            await _validate_boundary_geometry(session, "POLYGON((0 0, 1 1, 1 0, 0 1, 0 0))")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(run())
    assert exc.value.status_code == 400
    assert "autointerseção" in exc.value.detail or "inválida" in exc.value.detail


def test_validate_boundary_geometry_returns_geodesic_hectares() -> None:
    """Regression guard against a missing ::geography cast, which would return a value
    near 4e-4 (square degrees) instead of a real hectare figure. The fixture rectangle
    (0.02 deg x 0.02 deg at latitude ~-10.1) is geodesically ~486 ha.
    """
    coordinates = [(point[1], point[2]) for point in [("A", -10.100000, -48.300000), ("B", -10.100000, -48.320000), ("C", -10.120000, -48.320000), ("D", -10.120000, -48.300000)]]
    wkt = _polygon_wkt(coordinates)

    async def run() -> float:
        async with get_sessionmaker()() as session:
            return await _validate_boundary_geometry(session, wkt)

    area_ha = asyncio.run(run())
    assert 400 < area_ha < 600


def test_project_create_rejects_duplicate_vertices() -> None:
    prefix = f"dupvertex-{uuid_hex()}"
    tags = tag_payload(prefix)
    tags[3]["latitude"] = tags[0]["latitude"]
    tags[3]["longitude"] = tags[0]["longitude"]

    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tags),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 400, response.text
    detail = response.json()["detail"]
    assert "repetir" in detail or "duplicados" in detail


def test_project_create_rejects_collinear_vertices() -> None:
    prefix = f"collinear-{uuid_hex()}"
    tags = tag_payload(prefix)
    lngs = [-48.300, -48.310, -48.320, -48.330]
    for tag, lng in zip(tags, lngs):
        tag["latitude"] = -10.10
        tag["longitude"] = lng

    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tags),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 400, response.text


def test_project_create_rejects_excess_vertices() -> None:
    prefix = f"excess-{uuid_hex()}"
    center_lat, center_lng, radius = -10.11, -48.31, 0.01
    count = MAX_PROJECT_TAG_VERTICES + 1
    tags = []
    for index in range(count):
        angle = 2 * math.pi * index / count
        tags.append(
            {
                "tag_uid": f"{prefix}-{index}",
                "cmac": f"cmac-{prefix}-{index}",
                "latitude": center_lat + radius * math.sin(angle),
                "longitude": center_lng + radius * math.cos(angle),
                "vertex_label": f"V{index + 1:04d}",
            }
        )

    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tags),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 400, response.text
    assert "limite técnico" in response.json()["detail"]


def test_project_create_persists_declared_and_active_boundary() -> None:
    prefix = f"persist-{uuid_hex()}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]

    async def evaluate() -> dict[str, object]:
        async with get_sessionmaker()() as session:
            row = (
                await session.execute(
                    text(
                        """
                        select ST_NPoints(b.declared_boundary) as npoints,
                               ST_IsValid(b.declared_boundary) as is_valid,
                               ST_Equals(b.declared_boundary, b.active_boundary) as mirrors,
                               b.active_boundary_tier, b.declared_vertex_count, b.declared_source,
                               b.declared_area_ha, b.declared_area_divergence_pct, b.declared_area_divergence_flagged,
                               ST_X(ST_PointN(ST_ExteriorRing(b.declared_boundary), 1)) as first_x,
                               ST_Y(ST_PointN(ST_ExteriorRing(b.declared_boundary), 1)) as first_y
                        from project_boundaries b join projects p on p.id = b.project_id
                        where p.friendly_id = :friendly_id
                        """
                    ),
                    {"friendly_id": friendly_id},
                )
            ).mappings().one()
            return dict(row)

    row = asyncio.run(evaluate())
    assert row["npoints"] == 5
    assert row["is_valid"] is True
    assert row["mirrors"] is True
    assert row["active_boundary_tier"] == "DECLARED"
    assert row["declared_vertex_count"] == 4
    assert row["declared_source"] == "api_v1_project_write"
    assert 400 < float(row["declared_area_ha"]) < 600

    # Coordinate-order guard: X is longitude (~-48), Y is latitude (~-10).
    # If these were swapped this assertion fails.
    assert -49.0 < row["first_x"] < -48.0
    assert -11.0 < row["first_y"] < -10.0


def test_area_divergence_is_flagged_but_not_blocking() -> None:
    """D-GEO-02: projects.area_hectares comes from the crude _area_from_tags()
    bounding-box heuristic (~104.93 ha for this rectangle), while ST_Area(::geography)
    is the real geodesic area (~486 ha) -- a divergence of ~363%. This must be flagged,
    never blocked: the create request itself returns HTTP 201.
    """
    prefix = f"divergence-{uuid_hex()}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]

    async def evaluate() -> dict[str, object]:
        async with get_sessionmaker()() as session:
            row = (
                await session.execute(
                    text(
                        """
                        select b.declared_area_divergence_pct, b.declared_area_divergence_flagged
                        from project_boundaries b join projects p on p.id = b.project_id
                        where p.friendly_id = :friendly_id
                        """
                    ),
                    {"friendly_id": friendly_id},
                )
            ).mappings().one()
            return dict(row)

    row = asyncio.run(evaluate())
    assert float(row["declared_area_divergence_pct"]) > 10.0
    assert row["declared_area_divergence_flagged"] is True


def test_project_update_replaces_boundary_without_duplicating_row() -> None:
    prefix = f"update-{uuid_hex()}"
    original_tags = tag_payload(prefix)
    create_response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=original_tags),
        headers=auth_headers(*PRODUCER),
    )
    assert create_response.status_code == 201, create_response.text
    friendly_id = create_response.json()["project"]["friendlyId"]

    shifted_tags = copy.deepcopy(original_tags)
    for tag in shifted_tags:
        tag["latitude"] = round(tag["latitude"] + 0.01, 6)

    patch_response = client.patch(
        f"/api/v1/projects/{friendly_id}",
        json=project_payload(prefix, tags=shifted_tags),
        headers=auth_headers(*PRODUCER),
    )
    assert patch_response.status_code == 200, patch_response.text

    async def evaluate() -> dict[str, object]:
        async with get_sessionmaker()() as session:
            count_row = (
                await session.execute(
                    text(
                        """
                        select count(*) from project_boundaries b
                        join projects p on p.id = b.project_id
                        where p.friendly_id = :friendly_id
                        """
                    ),
                    {"friendly_id": friendly_id},
                )
            ).scalar_one()
            ymin_row = (
                await session.execute(
                    text(
                        """
                        select ST_YMin(b.declared_boundary) as ymin
                        from project_boundaries b join projects p on p.id = b.project_id
                        where p.friendly_id = :friendly_id
                        """
                    ),
                    {"friendly_id": friendly_id},
                )
            ).mappings().one()
            return {"count": count_row, "ymin": float(ymin_row["ymin"])}

    result = asyncio.run(evaluate())
    assert result["count"] == 1
    original_ymin = min(point["latitude"] for point in original_tags)
    assert math.isclose(result["ymin"] - original_ymin, 0.01, abs_tol=1e-6)


def uuid_hex() -> str:
    import uuid

    return uuid.uuid4().hex[:10]


# --- Plan 04.1-03: GEOF-04 overlap detection integration test ---


def rectangle_tags(prefix: str, base_lat: float, base_lng: float, span: float = 0.02) -> list[dict[str, object]]:
    """Retangulo axis-aligned: A(NO) B(NE) C(SE) D(SO). Coordenadas em (lat, lng)."""
    points = [
        ("A", base_lat, base_lng),
        ("B", base_lat, base_lng + span),
        ("C", base_lat - span, base_lng + span),
        ("D", base_lat - span, base_lng),
    ]
    return [
        {
            "tag_uid": f"{prefix}-{index}",
            "cmac": f"cmac-{prefix}-{index}",
            "latitude": latitude,
            "longitude": longitude,
            "vertex_label": label,
        }
        for index, (label, latitude, longitude) in enumerate(points, start=1)
    ]


def test_boundary_overlap_detection() -> None:
    """GEOF-04 acceptance: two projects shifted half a span in each axis overlap in
    exactly one quarter of each rectangle's area (25%), computed over HTTP via
    ST_Intersects (GiST pre-filter) + ST_Area(ST_Intersection(...)::geography).
    """
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"overlap-a-{uuid_hex()}"
    prefix_b = f"overlap-b-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    # Shifted half a span (0.01) in each axis: the intersection is exactly one
    # quarter of each rectangle's area (the overlapping sub-rectangle is
    # span/2 x span/2 out of a span x span rectangle).
    tags_b = rectangle_tags(prefix_b, base_lat - 0.01, base_lng + 0.01, span=0.02)

    response_a = client.post(
        "/api/v1/projects",
        json=project_payload(prefix_a, tags=tags_a),
        headers=auth_headers(*PRODUCER),
    )
    assert response_a.status_code == 201, response_a.text
    friendly_id_a = response_a.json()["project"]["friendlyId"]

    response_b = client.post(
        "/api/v1/projects",
        json=project_payload(prefix_b, tags=tags_b),
        headers=auth_headers(*PRODUCER),
    )
    assert response_b.status_code == 201, response_b.text
    friendly_id_b = response_b.json()["project"]["friendlyId"]

    overlaps_response = client.get(
        f"/api/v1/projects/{friendly_id_a}/boundary-overlaps",
        headers=auth_headers(*PRODUCER),
    )
    assert overlaps_response.status_code == 200, overlaps_response.text
    overlaps = overlaps_response.json()["overlaps"]

    # Filter by id, never by list length: many prior test projects share
    # tag_payload()'s fixed rectangle and overlap each other at 100%.
    entry = next((item for item in overlaps if item["relatedProjectFriendlyId"] == friendly_id_b), None)
    assert entry is not None, overlaps

    assert 24.0 < entry["overlapPercentage"] < 26.0
    assert 24.0 < entry["overlapPercentageOfRelated"] < 26.0
    assert entry["overlapAreaHa"] > 0


def test_boundary_overlap_excludes_disjoint_projects() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"overlap-disjoint-a-{uuid_hex()}"
    prefix_c = f"overlap-disjoint-c-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    # ~550 km away: no possible intersection.
    tags_c = rectangle_tags(prefix_c, base_lat + 5.0, base_lng + 5.0, span=0.02)

    response_a = client.post(
        "/api/v1/projects",
        json=project_payload(prefix_a, tags=tags_a),
        headers=auth_headers(*PRODUCER),
    )
    assert response_a.status_code == 201, response_a.text
    friendly_id_a = response_a.json()["project"]["friendlyId"]

    response_c = client.post(
        "/api/v1/projects",
        json=project_payload(prefix_c, tags=tags_c),
        headers=auth_headers(*PRODUCER),
    )
    assert response_c.status_code == 201, response_c.text
    friendly_id_c = response_c.json()["project"]["friendlyId"]

    overlaps_response = client.get(
        f"/api/v1/projects/{friendly_id_a}/boundary-overlaps",
        headers=auth_headers(*PRODUCER),
    )
    assert overlaps_response.status_code == 200, overlaps_response.text
    overlaps = overlaps_response.json()["overlaps"]

    assert not any(item["relatedProjectFriendlyId"] == friendly_id_c for item in overlaps)
    # A project never overlaps itself.
    assert not any(item["relatedProjectFriendlyId"] == friendly_id_a for item in overlaps)


def test_boundary_overlaps_requires_authentication() -> None:
    prefix = f"overlap-auth-{uuid_hex()}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]

    overlaps_response = client.get(f"/api/v1/projects/{friendly_id}/boundary-overlaps")
    assert overlaps_response.status_code in (401, 403)
    assert overlaps_response.status_code != 200


def test_detect_boundary_overlaps_uses_gist_index() -> None:
    async def evaluate() -> list[dict[str, object]]:
        async with get_sessionmaker()() as session:
            rows = (
                await session.execute(
                    text(
                        """
                        select indexdef from pg_indexes
                        where tablename = 'project_boundaries'
                          and indexname = 'project_boundaries_active_boundary_gix'
                        """
                    )
                )
            ).mappings().all()
            return [dict(row) for row in rows]

    rows = asyncio.run(evaluate())
    assert len(rows) == 1
    indexdef = rows[0]["indexdef"].lower()
    assert "gist" in indexdef


# --- Plan 04.1-04: GEOF-05 payload contract (boundary served as GeoJSON) ---


def test_public_dossier_includes_persisted_boundary() -> None:
    prefix = f"boundary-payload-{uuid_hex()}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]

    dossier_response = client.get(f"/api/v1/projects/{friendly_id}/public-dossier")
    assert dossier_response.status_code == 200, dossier_response.text
    payload = dossier_response.json()

    assert payload["boundary"] is not None
    assert payload["boundary"]["declared"]["type"] == "Polygon"
    assert payload["boundary"]["active"]["type"] == "Polygon"
    assert payload["boundary"]["activeTier"] == "DECLARED"
    assert payload["boundary"]["declaredVertexCount"] == 4

    ring = payload["boundary"]["declared"]["coordinates"][0]
    assert len(ring) == 5
    assert ring[0] == ring[-1]

    # GeoJSON coordinate order is [longitude, latitude] (X, Y) -- the OPPOSITE of
    # this codebase's and Leaflet's [latitude, longitude] convention. x is checked
    # against the longitude range, y against the latitude range.
    for x, y in ring:
        assert -49.5 < x < -47.5
        assert -11.5 < y < -9.5


def test_public_dossier_boundary_omits_internal_validation_metadata() -> None:
    """D-20/D-22 minimization: declaredSource and area-divergence telemetry are
    internal validation metadata and must not reach the anonymous public dossier."""
    prefix = f"boundary-minimize-{uuid_hex()}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]

    dossier_response = client.get(f"/api/v1/projects/{friendly_id}/public-dossier")
    assert dossier_response.status_code == 200, dossier_response.text
    boundary = dossier_response.json()["boundary"]

    assert "declaredSource" not in boundary
    assert "areaDivergencePct" not in boundary
    assert "areaDivergenceFlagged" not in boundary


def test_review_includes_persisted_boundary() -> None:
    prefix = f"boundary-review-{uuid_hex()}"
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tag_payload(prefix)),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]

    review_response = client.get(
        f"/api/v1/certifier/projects/{friendly_id}/review",
        headers=auth_headers(*CERTIFIER),
    )
    assert review_response.status_code == 200, review_response.text
    boundary = review_response.json()["boundary"]

    assert boundary["declared"]["type"] == "Polygon"
    assert boundary["declaredSource"] == "api_v1_project_write"
    # D-GEO-02: the fixture rectangle diverges ~363% from _area_from_tags(); the
    # flag is set while the project is still created successfully (never blocking).
    assert "areaDivergencePct" in boundary
    assert boundary["areaDivergenceFlagged"] is True


def test_boundary_is_null_when_project_has_no_geometry() -> None:
    async def find_project_without_tags() -> str | None:
        async with get_sessionmaker()() as session:
            row = (
                await session.execute(
                    text(
                        """
                        select p.friendly_id
                        from projects p
                        left join project_tags t on t.project_id = p.id
                        group by p.friendly_id
                        having count(t.id) = 0
                        limit 1
                        """
                    )
                )
            ).mappings().one_or_none()
            return row["friendly_id"] if row is not None else None

    friendly_id = asyncio.run(find_project_without_tags())
    if friendly_id is None:
        pytest.skip("nenhum projeto sem project_tags no banco atual")

    dossier_response = client.get(f"/api/v1/projects/{friendly_id}/public-dossier")
    assert dossier_response.status_code == 200, dossier_response.text
    assert dossier_response.json()["boundary"] is None
