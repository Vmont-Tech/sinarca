from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from backend_app.main import app
from backend_app.modules.profiles.repository import reset_profile_repository

client = TestClient(app)


def setup_function() -> None:
    reset_profile_repository()


def auth_headers(email: str = "produtor@sinarca.com.br", password: str = "produtor") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def tag_payload(prefix: str) -> list[dict[str, object]]:
    return [
        {
            "tag_uid": f"{prefix}-{index}",
            "cmac": f"cmac-{prefix}-{index}",
            "latitude": -10.10 - (index * 0.01),
            "longitude": -48.30 - (index * 0.01),
            "vertex_label": label,
        }
        for index, label in enumerate(["A", "B", "C", "D"], start=1)
    ]


def project_payload(prefix: str, tags: list[dict[str, object]] | None = None) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": f"Projeto Teste {prefix}",
        "description": "Projeto criado pelo contrato persistente da API v1.",
        "project_type": "reforestation",
        "producer_id": "prod-001",
        "certifier_id": "std-001",
        "location": {
            "city": "Porto Nacional",
            "state": "Tocantins",
            "stateId": "to",
            "bioma": "Cerrado",
            "coordinates": {"lat": -10.70, "lng": -48.41, "svgX": 392, "svgY": 292},
        },
    }
    if tags is not None:
        payload["tags"] = tags
    return payload


def test_projects_collection_detail_catalogs_and_creation_use_persistent_api() -> None:
    collection_response = client.get("/api/v1/projects?limit=1000")

    assert collection_response.status_code == 200
    collection = collection_response.json()
    assert collection["success"] is True
    assert isinstance(collection["total"], int)
    assert collection["projects"]

    project = collection["projects"][0]
    for key in ["id", "friendlyId", "name", "description", "status", "methodology", "location", "metrics", "entities", "blockchain", "image", "timeline"]:
        assert key in project

    detail_response = client.get(f"/api/v1/projects/{project['friendlyId']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["project"]["friendlyId"] == project["friendlyId"]

    for route, key in [
        ("/api/v1/certifiers", "certifiers"),
        ("/api/v1/auditors", "auditors"),
        ("/api/v1/companies", "companies"),
    ]:
        response = client.get(route)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data[key]

    unique_prefix = f"contract-{uuid.uuid4().hex[:10]}"
    invalid_response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)[:2]),
        headers=auth_headers(),
    )
    assert invalid_response.status_code == 400
    assert "4 tags" in invalid_response.json()["detail"]

    create_response = client.post(
        "/api/v1/projects",
        json=project_payload(unique_prefix, tags=tag_payload(unique_prefix)),
        headers=auth_headers(),
    )
    assert create_response.status_code == 201
    created = create_response.json()["project"]
    assert created["name"] == f"Projeto Teste {unique_prefix}"
    assert created["status"] == "AWAITING_CERTIFICATION"
    assert created["metrics"]["carbonStock"] > 0
    assert created["blockchain"]["initialHash"].startswith("baseline-")

