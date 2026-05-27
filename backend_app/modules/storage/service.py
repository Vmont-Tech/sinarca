from __future__ import annotations

import asyncio
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from backend_app.core.config import get_settings


@dataclass(frozen=True)
class StorageObject:
    bucket: str
    object_path: str
    storage_path: str
    uploaded: bool


class StorageUploadError(RuntimeError):
    pass


class SupabaseStorageService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def upload(self, *, bucket: str, object_path: str, content: bytes, mime_type: str, public: bool = False) -> StorageObject:
        normalized_path = object_path.strip("/")
        uploaded = False
        if self._is_configured:
            await asyncio.to_thread(self._upload_sync, bucket, normalized_path, content, mime_type)
            uploaded = True

        return StorageObject(
            bucket=bucket,
            object_path=normalized_path,
            storage_path=self._storage_path(bucket, normalized_path, public=public),
            uploaded=uploaded,
        )

    @property
    def _is_configured(self) -> bool:
        url = (self.settings.supabase_url or "").strip()
        key = (self.settings.supabase_service_role_key or "").strip()
        return url.startswith("http") and bool(key) and not key.startswith("replace-")

    def _upload_sync(self, bucket: str, object_path: str, content: bytes, mime_type: str) -> None:
        base_url = (self.settings.supabase_url or "").rstrip("/")
        service_key = self.settings.supabase_service_role_key or ""
        quoted_path = quote(object_path, safe="/")
        request = Request(
            f"{base_url}/storage/v1/object/{bucket}/{quoted_path}",
            data=content,
            method="POST",
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": mime_type,
                "Cache-Control": "3600",
                "x-upsert": "true",
            },
        )
        try:
            with urlopen(request, timeout=20) as response:
                if response.status not in {200, 201}:
                    raise StorageUploadError(f"Supabase Storage retornou HTTP {response.status}")
        except HTTPError as exc:
            detail = exc.read(400).decode("utf-8", errors="replace")
            raise StorageUploadError(f"Supabase Storage retornou HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise StorageUploadError("Supabase Storage indisponível") from exc

    def _storage_path(self, bucket: str, object_path: str, *, public: bool) -> str:
        base_url = (self.settings.supabase_url or "").rstrip("/")
        if public and base_url.startswith("http"):
            return f"{base_url}/storage/v1/object/public/{bucket}/{quote(object_path, safe='/')}"
        return f"supabase://{bucket}/{object_path}"
