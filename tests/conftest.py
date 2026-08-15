from __future__ import annotations

import os

import pytest

from backend_app.core.config import get_settings


os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres",
)

SUPABASE_STORAGE_ENV_KEYS = (
    "SUPABASE_URL",
    "SUPABASE_PUBLIC_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
)


@pytest.fixture(autouse=True)
def isolate_optional_storage_env(monkeypatch: pytest.MonkeyPatch):
    for key in SUPABASE_STORAGE_ENV_KEYS:
        monkeypatch.setenv(key, "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
