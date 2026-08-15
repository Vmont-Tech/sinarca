from __future__ import annotations

import json
from io import BytesIO
from typing import Any

from backend_app.modules.supabase_storage import SupabaseStorageClient


class _Response:
    def __enter__(self) -> "_Response":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self) -> bytes:
        return b"{}"


def test_supabase_storage_client_uploads_object_with_service_credentials(monkeypatch: Any) -> None:
    requests: list[Any] = []

    def fake_urlopen(request: Any, timeout: int) -> _Response:
        requests.append(request)
        assert timeout == 30
        return _Response()

    monkeypatch.setattr("backend_app.modules.supabase_storage.urllib.request.urlopen", fake_urlopen)

    client = SupabaseStorageClient("http://supabase.local", "service-role-token")
    client.upload_object(
        "projects",
        "projects/drafts/draft-1/documents/legal_ownership/hash.pdf",
        b"%PDF-1.4\nconteudo",
        "application/pdf",
    )

    assert len(requests) == 1
    request = requests[0]
    assert request.full_url == "http://supabase.local/storage/v1/object/projects/projects/drafts/draft-1/documents/legal_ownership/hash.pdf"
    assert request.get_method() == "POST"
    assert request.headers["Authorization"] == "Bearer service-role-token"
    assert request.headers["Apikey"] == "service-role-token"
    assert request.headers["Content-type"] == "application/pdf"
    assert request.headers["X-upsert"] == "true"
    assert request.data == b"%PDF-1.4\nconteudo"


def test_supabase_storage_client_copies_draft_object_to_project_path(monkeypatch: Any) -> None:
    requests: list[Any] = []

    def fake_urlopen(request: Any, timeout: int) -> _Response:
        requests.append(request)
        assert timeout == 30
        return _Response()

    monkeypatch.setattr("backend_app.modules.supabase_storage.urllib.request.urlopen", fake_urlopen)

    client = SupabaseStorageClient("http://supabase.local", "service-role-token")
    client.copy_object(
        "projects",
        "projects/drafts/draft-1/documents/legal_ownership/hash.pdf",
        "projects/PRC-2026-001/documents/legal_ownership/hash.pdf",
    )

    assert len(requests) == 1
    request = requests[0]
    assert request.full_url == "http://supabase.local/storage/v1/object/copy"
    assert request.get_method() == "POST"
    assert request.headers["Authorization"] == "Bearer service-role-token"
    assert request.headers["Apikey"] == "service-role-token"
    payload = json.loads(request.data.decode())
    assert payload == {
        "bucketId": "projects",
        "sourceKey": "projects/drafts/draft-1/documents/legal_ownership/hash.pdf",
        "destinationKey": "projects/PRC-2026-001/documents/legal_ownership/hash.pdf",
    }


def test_supabase_storage_client_builds_public_object_url() -> None:
    client = SupabaseStorageClient("http://supabase.internal", "service-role-token", "http://supabase.public")

    assert (
        client.public_object_url("profiles", "projects/PRC-2026-001/images/hash.png")
        == "http://supabase.public/storage/v1/object/public/profiles/projects/PRC-2026-001/images/hash.png"
    )
