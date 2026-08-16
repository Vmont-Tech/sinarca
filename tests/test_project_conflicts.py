from __future__ import annotations

import asyncio
import copy
import random
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text

from backend_app.db.session import get_sessionmaker
from backend_app.main import app

# `tests/` has no __init__.py, so `from tests.test_project_boundaries import ...`
# does not resolve as a package import under this repo's pytest configuration.
# Per plan 04.2-03's fallback instruction (same fallback already documented in
# Phase 04.1), the HTTP fixtures below are copied verbatim from
# tests/test_project_boundaries.py rather than imported.

client = TestClient(app)

PRODUCER = ("produtor@sinarca.com.br", "produtor")


def auth_headers(email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


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


def uuid_hex() -> str:
    return uuid.uuid4().hex[:10]


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


def _create_project(prefix: str, tags: list[dict[str, object]]) -> str:
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tags),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    return response.json()["project"]["friendlyId"]


def _project_uuid(friendly_id: str) -> str:
    """Looks up the raw projects.id (uuid) by friendly_id.

    The `id` field in the ProjectMRCA HTTP response is `source_hash or
    str(project.id)` (a legacy contract), so it cannot be used to match
    `Conflict.related_project_id`, which always stores the raw uuid.
    """

    async def evaluate() -> str:
        async with get_sessionmaker()() as session:
            row = (
                await session.execute(
                    text("select id::text as id from projects where friendly_id = :friendly_id"),
                    {"friendly_id": friendly_id},
                )
            ).mappings().one()
            return row["id"]

    return asyncio.run(evaluate())


def _create_project_full(prefix: str, tags: list[dict[str, object]]) -> dict[str, str]:
    response = client.post(
        "/api/v1/projects",
        json=project_payload(prefix, tags=tags),
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 201, response.text
    friendly_id = response.json()["project"]["friendlyId"]
    return {"id": _project_uuid(friendly_id), "friendlyId": friendly_id}


def _get_conflicts(friendly_id: str) -> list[dict[str, object]]:
    response = client.get(
        f"/api/v1/projects/{friendly_id}/conflicts",
        headers=auth_headers(*PRODUCER),
    )
    assert response.status_code == 200, response.text
    return response.json()["conflicts"]


def test_overlap_generates_conflict_with_medium_severity() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-hi-a-{uuid_hex()}"
    prefix_b = f"conflict-hi-b-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    # Shifted half a span (0.01) in each axis: intersection is exactly one
    # quarter of each rectangle's area (25%), same fixture as GEOF-04.
    tags_b = rectangle_tags(prefix_b, base_lat - 0.01, base_lng + 0.01, span=0.02)

    friendly_id_a = _create_project(prefix_a, tags_a)
    friendly_id_b = _create_project(prefix_b, tags_b)

    conflicts_a = _get_conflicts(friendly_id_a)
    entry = next((c for c in conflicts_a if c["relatedProjectFriendlyId"] == friendly_id_b), None)
    assert entry is not None, conflicts_a
    assert entry["type"] == "GEOSPATIAL_OVERLAP"
    assert entry["status"] == "OPEN"
    assert entry["severity"] == "HIGH"
    assert 24.0 < entry["overlapPercentage"] < 26.0


def test_conflict_is_mirrored_on_the_related_project() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-mirror-a-{uuid_hex()}"
    prefix_b = f"conflict-mirror-b-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    tags_b = rectangle_tags(prefix_b, base_lat - 0.01, base_lng + 0.01, span=0.02)

    friendly_id_a = _create_project(prefix_a, tags_a)
    friendly_id_b = _create_project(prefix_b, tags_b)

    conflicts_b = _get_conflicts(friendly_id_b)
    entry = next((c for c in conflicts_b if c["relatedProjectFriendlyId"] == friendly_id_a), None)
    assert entry is not None, conflicts_b
    assert entry["type"] == "GEOSPATIAL_OVERLAP"
    assert entry["status"] == "OPEN"


def test_full_overlap_is_critical() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-full-a-{uuid_hex()}"
    prefix_b = f"conflict-full-b-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    tags_b = rectangle_tags(prefix_b, base_lat, base_lng, span=0.02)

    friendly_id_a = _create_project(prefix_a, tags_a)
    friendly_id_b = _create_project(prefix_b, tags_b)

    conflicts_a = _get_conflicts(friendly_id_a)
    entry = next((c for c in conflicts_a if c["relatedProjectFriendlyId"] == friendly_id_b), None)
    assert entry is not None, conflicts_a
    assert entry["severity"] == "CRITICAL"
    assert entry["overlapPercentage"] > 99


def test_disjoint_projects_generate_no_conflict() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-disjoint-a-{uuid_hex()}"
    prefix_c = f"conflict-disjoint-c-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    # ~550 km away: no possible intersection.
    tags_c = rectangle_tags(prefix_c, base_lat + 5.0, base_lng + 5.0, span=0.02)

    friendly_id_a = _create_project(prefix_a, tags_a)
    friendly_id_c = _create_project(prefix_c, tags_c)

    conflicts_a = _get_conflicts(friendly_id_a)
    assert not any(c["relatedProjectFriendlyId"] == friendly_id_c for c in conflicts_a)


def test_conflict_is_resolved_when_geometry_moves_away() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-resolve-a-{uuid_hex()}"
    prefix_b = f"conflict-resolve-b-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    tags_b = rectangle_tags(prefix_b, base_lat - 0.01, base_lng + 0.01, span=0.02)

    friendly_id_a = _create_project(prefix_a, tags_a)
    friendly_id_b = _create_project(prefix_b, tags_b)

    conflicts_a = _get_conflicts(friendly_id_a)
    entry = next((c for c in conflicts_a if c["relatedProjectFriendlyId"] == friendly_id_b), None)
    assert entry is not None and entry["status"] == "OPEN"

    # Move A far away: it no longer overlaps B.
    far_tags = rectangle_tags(prefix_a, base_lat + 5.0, base_lng + 5.0, span=0.02)
    patch_response = client.patch(
        f"/api/v1/projects/{friendly_id_a}",
        json=project_payload(prefix_a, tags=far_tags),
        headers=auth_headers(*PRODUCER),
    )
    assert patch_response.status_code == 200, patch_response.text

    conflicts_a_after = _get_conflicts(friendly_id_a)
    matches = [c for c in conflicts_a_after if c["relatedProjectFriendlyId"] == friendly_id_b]
    assert len(matches) == 1, matches
    assert matches[0]["status"] == "RESOLVED"
    assert matches[0]["resolvedAt"] is not None


def test_conflict_resync_is_idempotent() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-idem-a-{uuid_hex()}"
    prefix_b = f"conflict-idem-b-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    tags_b = rectangle_tags(prefix_b, base_lat - 0.01, base_lng + 0.01, span=0.02)

    friendly_id_a = _create_project(prefix_a, tags_a)
    _create_project(prefix_b, tags_b)

    same_tags = copy.deepcopy(tags_a)
    patch_payload = project_payload(prefix_a, tags=same_tags)

    first_response = client.patch(
        f"/api/v1/projects/{friendly_id_a}", json=patch_payload, headers=auth_headers(*PRODUCER)
    )
    assert first_response.status_code == 200, first_response.text
    count_after_first = len(_get_conflicts(friendly_id_a))

    second_response = client.patch(
        f"/api/v1/projects/{friendly_id_a}", json=patch_payload, headers=auth_headers(*PRODUCER)
    )
    assert second_response.status_code == 200, second_response.text
    count_after_second = len(_get_conflicts(friendly_id_a))

    assert count_after_first == count_after_second


def test_double_claim_only_for_overlapping_pairs() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-dc-a-{uuid_hex()}"
    prefix_b = f"conflict-dc-b-{uuid_hex()}"
    prefix_c = f"conflict-dc-c-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    tags_b = rectangle_tags(prefix_b, base_lat - 0.01, base_lng + 0.01, span=0.02)
    # ~550 km away: disjoint from A, same project_type/vintage.
    tags_c = rectangle_tags(prefix_c, base_lat + 5.0, base_lng + 5.0, span=0.02)

    project_a = _create_project_full(prefix_a, tags_a)
    project_b = _create_project_full(prefix_b, tags_b)
    project_c = _create_project_full(prefix_c, tags_c)

    conflicts_a = _get_conflicts(project_a["friendlyId"])
    # relatedProjectFriendlyId is only populated for GEOSPATIAL_OVERLAP rows
    # (metadata_.related_friendly_id); DOUBLE_CLAIM rows are matched by
    # relatedProjectId, which is always populated from the Conflict row.
    double_claim = [
        c for c in conflicts_a if c["type"] == "DOUBLE_CLAIM" and c["relatedProjectId"] == project_b["id"]
    ]
    assert len(double_claim) == 1, conflicts_a
    assert not any(c["type"] == "DOUBLE_CLAIM" and c["relatedProjectId"] == project_c["id"] for c in conflicts_a)

    conflicts_c = _get_conflicts(project_c["friendlyId"])
    assert not any(c["type"] == "DOUBLE_CLAIM" for c in conflicts_c)


def test_boundary_overlaps_contract_is_unchanged() -> None:
    base_lat = -10.0 - random.random()
    base_lng = -48.0 - random.random()

    prefix_a = f"conflict-contract-a-{uuid_hex()}"
    prefix_b = f"conflict-contract-b-{uuid_hex()}"

    tags_a = rectangle_tags(prefix_a, base_lat, base_lng, span=0.02)
    tags_b = rectangle_tags(prefix_b, base_lat - 0.01, base_lng + 0.01, span=0.02)

    friendly_id_a = _create_project(prefix_a, tags_a)
    _create_project(prefix_b, tags_b)

    overlaps_response = client.get(
        f"/api/v1/projects/{friendly_id_a}/boundary-overlaps",
        headers=auth_headers(*PRODUCER),
    )
    assert overlaps_response.status_code == 200, overlaps_response.text
    overlaps = overlaps_response.json()["overlaps"]
    assert overlaps

    expected_keys = {
        "relatedProjectId",
        "relatedProjectFriendlyId",
        "relatedProjectName",
        "overlapAreaHa",
        "overlapPercentage",
        "overlapPercentageOfRelated",
    }
    for entry in overlaps:
        assert set(entry.keys()) == expected_keys
        assert "severity" not in entry


def test_conflicts_endpoint_requires_authentication() -> None:
    prefix = f"conflict-auth-{uuid_hex()}"
    friendly_id = _create_project(prefix, rectangle_tags(prefix, -10.0 - random.random(), -48.0 - random.random()))

    response = client.get(f"/api/v1/projects/{friendly_id}/conflicts")
    assert response.status_code in (401, 403)
    assert response.status_code != 200
