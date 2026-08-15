from __future__ import annotations

import asyncio

from backend_app.core.config import get_settings
from backend_app.modules.storage.service import SupabaseStorageService


def test_public_profile_upload_returns_browser_reachable_public_url(monkeypatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "http://host.docker.internal:54321")
    monkeypatch.setenv("SUPABASE_PUBLIC_URL", "http://127.0.0.1:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-for-test")
    get_settings.cache_clear()

    service = SupabaseStorageService()
    uploaded: list[tuple[str, str, bytes, str]] = []
    monkeypatch.setattr(
        service,
        "_upload_sync",
        lambda bucket, object_path, content, mime_type: uploaded.append((bucket, object_path, content, mime_type)),
    )

    storage_object = asyncio.run(
        service.upload(
            bucket="profiles",
            object_path="profile-123/avatar/avatar.png",
            content=b"avatar-bytes",
            mime_type="image/png",
            public=True,
        )
    )

    assert storage_object.uploaded is True
    assert storage_object.storage_path == (
        "http://127.0.0.1:54321/storage/v1/object/public/profiles/profile-123/avatar/avatar.png"
    )
    assert uploaded == [("profiles", "profile-123/avatar/avatar.png", b"avatar-bytes", "image/png")]
    get_settings.cache_clear()
