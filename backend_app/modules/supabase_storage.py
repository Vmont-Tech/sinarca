from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from fastapi import HTTPException, status

from backend_app.core.config import Settings, get_settings

LOCAL_SUPABASE_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long"
PLACEHOLDER_KEYS = {"replace-with-supabase-service-role-key", "change-me"}
HOST_DOCKER_INTERNAL = "host.docker.internal"
LOCALHOST_FALLBACK = "127.0.0.1"


class SupabaseStorageError(RuntimeError):
    pass


@dataclass(frozen=True)
class SupabaseStorageClient:
    supabase_url: str
    service_role_key: str
    public_url: str | None = None

    def upload_object(self, bucket: str, object_path: str, content: bytes, content_type: str | None) -> None:
        url = self._object_url(bucket, object_path)
        request = urllib.request.Request(
            url,
            data=content,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.service_role_key}",
                "Apikey": self.service_role_key,
                "Content-type": content_type or "application/octet-stream",
                "X-upsert": "true",
            },
        )
        self._open(request)

    def copy_object(self, bucket: str, source_object_path: str, destination_object_path: str) -> None:
        payload = {
            "bucketId": bucket,
            "sourceKey": source_object_path,
            "destinationKey": destination_object_path,
        }
        request = urllib.request.Request(
            f"{self.supabase_url.rstrip('/')}/storage/v1/object/copy",
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Authorization": f"Bearer {self.service_role_key}",
                "Apikey": self.service_role_key,
                "Content-type": "application/json",
            },
        )
        self._open(request)

    def download_object(self, bucket: str, object_path: str) -> bytes:
        request = urllib.request.Request(
            self._object_url(bucket, object_path),
            method="GET",
            headers={
                "Authorization": f"Bearer {self.service_role_key}",
                "Apikey": self.service_role_key,
            },
        )
        return self._read(request)

    def public_object_url(self, bucket: str, object_path: str) -> str:
        quoted_path = urllib.parse.quote(object_path, safe="/")
        public_base_url = (self.public_url or self.supabase_url).rstrip("/")
        return f"{public_base_url}/storage/v1/object/public/{bucket}/{quoted_path}"

    def _object_url(self, bucket: str, object_path: str) -> str:
        quoted_path = urllib.parse.quote(object_path, safe="/")
        return f"{self.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{quoted_path}"

    def _open(self, request: urllib.request.Request) -> None:
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                response.read()
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise SupabaseStorageError(f"Supabase Storage respondeu {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise SupabaseStorageError(f"Supabase Storage indisponível: {exc.reason}") from exc

    def _read(self, request: urllib.request.Request) -> bytes:
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise SupabaseStorageError(f"Supabase Storage respondeu {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise SupabaseStorageError(f"Supabase Storage indisponível: {exc.reason}") from exc


def get_supabase_storage_client(settings: Settings | None = None) -> SupabaseStorageClient | None:
    settings = settings or get_settings()
    supabase_url = _clean_setting(settings.supabase_url)
    if not supabase_url:
        return None
    supabase_url = _host_reachable_url(supabase_url, settings)

    service_role_key = _storage_service_key(settings)
    if not service_role_key:
        return None

    return SupabaseStorageClient(supabase_url, service_role_key, _clean_setting(settings.supabase_public_url))


def _host_reachable_url(supabase_url: str, settings: Settings) -> str:
    if settings.app_env.strip().lower() == "production":
        return supabase_url

    parsed = urllib.parse.urlsplit(supabase_url)
    if parsed.hostname != HOST_DOCKER_INTERNAL or _hostname_resolves(HOST_DOCKER_INTERNAL):
        return supabase_url

    netloc = LOCALHOST_FALLBACK
    if parsed.port is not None:
        netloc = f"{netloc}:{parsed.port}"
    return urllib.parse.urlunsplit(parsed._replace(netloc=netloc))


def _hostname_resolves(hostname: str) -> bool:
    try:
        socket.gethostbyname(hostname)
    except OSError:
        return False
    return True


async def upload_storage_object(bucket: str, object_path: str, content: bytes, content_type: str | None) -> bool:
    client = get_supabase_storage_client()
    if client is None:
        return False
    try:
        await asyncio.to_thread(client.upload_object, bucket, object_path, content, content_type)
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível gravar o arquivo no Supabase Storage.",
        ) from exc
    return True


async def download_storage_object(bucket: str, object_path: str) -> bytes | None:
    """Le um objeto privado usando a service role. Devolve None quando nao ha credenciais."""
    client = get_supabase_storage_client()
    if client is None:
        return None
    try:
        return await asyncio.to_thread(client.download_object, bucket, object_path)
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível ler o certificado no Supabase Storage.",
        ) from exc


async def copy_storage_object(bucket: str, source_object_path: str | None, destination_object_path: str | None) -> bool:
    if not source_object_path or not destination_object_path:
        return False
    client = get_supabase_storage_client()
    if client is None:
        return False
    try:
        await asyncio.to_thread(client.copy_object, bucket, source_object_path, destination_object_path)
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível copiar o arquivo do rascunho para o projeto no Supabase Storage.",
        ) from exc
    return True


def storage_public_object_url(bucket: str, object_path: str) -> str | None:
    client = get_supabase_storage_client()
    if client is None:
        return None
    return client.public_object_url(bucket, object_path)


def _storage_service_key(settings: Settings) -> str | None:
    configured_key = _clean_setting(settings.supabase_service_role_key)
    if configured_key and configured_key not in PLACEHOLDER_KEYS:
        return configured_key

    if settings.app_env.strip().lower() == "production":
        return None

    jwt_secret = _clean_setting(settings.supabase_jwt_secret) or LOCAL_SUPABASE_JWT_SECRET
    return _sign_service_role_jwt(jwt_secret)


def _sign_service_role_jwt(jwt_secret: str) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "iss": "supabase",
        "ref": "local",
        "role": "service_role",
        "iat": now,
        "exp": now + 10 * 365 * 24 * 60 * 60,
    }
    signing_input = f"{_base64url_json(header)}.{_base64url_json(payload)}"
    signature = hmac.new(jwt_secret.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest()
    return f"{signing_input}.{_base64url(signature)}"


def _base64url_json(payload: dict[str, object]) -> str:
    return _base64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))


def _base64url(content: bytes) -> str:
    return base64.urlsafe_b64encode(content).rstrip(b"=").decode("ascii")


def _clean_setting(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip().strip('"').strip("'")
    return cleaned or None
