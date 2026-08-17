from __future__ import annotations

# Phase 05 / SATM-05 -- testes do CopernicusProvider sem credenciais reais e
# sem rede: httpx.MockTransport (parte do proprio httpx, zero dependencia nova).
#
# O repo nao tem pytest-asyncio: cada teste envolve todas as chamadas
# assincronas (incluindo aclose()) em uma unica corrotina e usa um unico
# asyncio.run(...) por teste, para nunca reusar o mesmo asyncio.Lock/
# asyncio.Semaphore em dois event loops diferentes.

import asyncio
import json
from datetime import datetime, timezone

import httpx
import pytest

from backend_app.adapters.copernicus import CopernicusAdapterConfig, CopernicusProvider
from backend_app.adapters.satellite import CopernicusUsageRecord

CLIENT_SECRET = "segredo-que-nunca-pode-vazar"

CONFIGURED = CopernicusAdapterConfig(client_id="cli-123", client_secret=CLIENT_SECRET)
UNCONFIGURED = CopernicusAdapterConfig(client_id=None, client_secret=None)

AOI = {"type": "Polygon", "coordinates": [[[-47.9, -15.8], [-47.8, -15.8], [-47.8, -15.7], [-47.9, -15.7], [-47.9, -15.8]]]}
DATE_FROM = datetime(2024, 1, 1, tzinfo=timezone.utc)
DATE_TO = datetime(2024, 6, 1, tzinfo=timezone.utc)


def _token_response(access_token: str = "tok", expires_in: int = 600) -> httpx.Response:
    return httpx.Response(200, json={"access_token": access_token, "expires_in": expires_in})


# --- Fail-closed (SATM-05) --------------------------------------------------


def test_copernicus_search_scenes_fails_closed_without_credentials() -> None:
    calls: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"features": []})

    provider = CopernicusProvider(UNCONFIGURED, transport=httpx.MockTransport(handler))

    async def _run() -> None:
        try:
            await provider.search_scenes(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO, max_cloud_coverage=20.0)
        finally:
            await provider.aclose()

    with pytest.raises(RuntimeError, match="Configuração Copernicus incompleta"):
        asyncio.run(_run())
    assert calls == []


def test_copernicus_get_statistics_fails_closed_without_credentials() -> None:
    calls: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"data": []})

    provider = CopernicusProvider(UNCONFIGURED, transport=httpx.MockTransport(handler))

    async def _run() -> None:
        try:
            await provider.get_statistics(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO)
        finally:
            await provider.aclose()

    with pytest.raises(RuntimeError, match="Configuração Copernicus incompleta"):
        asyncio.run(_run())
    assert calls == []


def test_copernicus_get_image_fails_closed_without_credentials() -> None:
    calls: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, content=b"png-bytes")

    provider = CopernicusProvider(UNCONFIGURED, transport=httpx.MockTransport(handler))

    async def _run() -> None:
        try:
            await provider.get_image(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO)
        finally:
            await provider.aclose()

    with pytest.raises(RuntimeError, match="Configuração Copernicus incompleta"):
        asyncio.run(_run())
    assert calls == []


# --- Token caching / refresh (D-08) -----------------------------------------


def test_token_is_cached_between_calls() -> None:
    calls: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if "token" in str(request.url):
            return _token_response()
        return httpx.Response(200, json={"features": []})

    provider = CopernicusProvider(CONFIGURED, transport=httpx.MockTransport(handler))

    async def _run() -> None:
        await provider.search_scenes(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO, max_cloud_coverage=20.0)
        await provider.search_scenes(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO, max_cloud_coverage=20.0)
        await provider.aclose()

    asyncio.run(_run())
    # token (1) + STAC search (2) = 3, nao 4 -- o token nao e refeito.
    assert len(calls) == 3, len(calls)


def test_token_is_refreshed_when_close_to_expiry() -> None:
    token_calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal token_calls
        if "token" in str(request.url):
            token_calls += 1
            return _token_response(access_token=f"tok-{token_calls}", expires_in=20)
        return httpx.Response(200, json={"features": []})

    provider = CopernicusProvider(CONFIGURED, transport=httpx.MockTransport(handler))

    async def _run() -> None:
        await provider.search_scenes(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO, max_cloud_coverage=20.0)
        await provider.search_scenes(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO, max_cloud_coverage=20.0)
        await provider.aclose()

    asyncio.run(_run())
    # expires_in=20 < margem de 30s -- token e tratado como ja expirado, logo
    # cada busca de cena refaz o token.
    assert token_calls == 2, token_calls


# --- Parsing via metodos publicos -------------------------------------------


def test_search_scenes_parses_and_sorts_scenes() -> None:
    calls: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if "token" in str(request.url):
            return _token_response()
        return httpx.Response(
            200,
            json={
                "features": [
                    {"id": "S2B", "properties": {"datetime": "2024-03-15T00:00:00Z", "eo:cloud_cover": 4.2}},
                    {"id": "S2A", "properties": {"datetime": "2024-02-20T00:00:00Z", "eo:cloud_cover": 18.0}},
                ]
            },
        )

    provider = CopernicusProvider(CONFIGURED, transport=httpx.MockTransport(handler))

    async def _run() -> list[str]:
        scenes = await provider.search_scenes(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO, max_cloud_coverage=20.0)
        await provider.aclose()
        return [scene.scene_id for scene in scenes]

    scene_ids = asyncio.run(_run())
    assert scene_ids == ["S2A", "S2B"]
    assert len(calls) == 2, len(calls)  # token + STAC search


def test_get_statistics_skips_intervals_with_error() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if "token" in str(request.url):
            return _token_response()
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "interval": {"from": "2024-01-01T00:00:00Z", "to": "2024-02-01T00:00:00Z"},
                        "outputs": {"ndvi": {"bands": {"B0": {"stats": {"mean": 0.5}}}}},
                    },
                    {
                        "interval": {"from": "2024-02-01T00:00:00Z", "to": "2024-03-01T00:00:00Z"},
                        "error": {"type": "EXECUTION_ERROR"},
                    },
                ]
            },
        )

    provider = CopernicusProvider(CONFIGURED, transport=httpx.MockTransport(handler))

    async def _run():
        stats = await provider.get_statistics(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO)
        await provider.aclose()
        return stats

    stats = asyncio.run(_run())
    assert len(stats) == 1
    assert stats[0].ndvi_mean == 0.5


def test_get_image_returns_png_bytes() -> None:
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"conteudo-fake-do-mock"

    async def handler(request: httpx.Request) -> httpx.Response:
        if "token" in str(request.url):
            return _token_response()
        return httpx.Response(200, content=png_bytes, headers={"content-type": "image/png"})

    provider = CopernicusProvider(CONFIGURED, transport=httpx.MockTransport(handler))

    async def _run():
        image = await provider.get_image(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO)
        await provider.aclose()
        return image

    image = asyncio.run(_run())
    assert image.mime_type == "image/png"
    assert image.content == png_bytes


# --- Nunca simular dado ------------------------------------------------------


def test_statistics_http_error_never_returns_simulated_data() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if "token" in str(request.url):
            return _token_response()
        return httpx.Response(500, json={"detail": "erro interno simulado"})

    provider = CopernicusProvider(CONFIGURED, transport=httpx.MockTransport(handler))

    async def _run() -> None:
        try:
            with pytest.raises(httpx.HTTPStatusError):
                await provider.get_statistics(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO)
        finally:
            await provider.aclose()

    asyncio.run(_run())


# --- Observabilidade (D-26) --------------------------------------------------


def test_usage_records_never_contain_client_secret() -> None:
    records: list[CopernicusUsageRecord] = []

    async def recorder(record: CopernicusUsageRecord) -> None:
        records.append(record)

    async def handler(request: httpx.Request) -> httpx.Response:
        if "token" in str(request.url):
            return _token_response()
        if "statistics" in str(request.url):
            return httpx.Response(500, json={"detail": "erro interno simulado"})
        return httpx.Response(200, json={"features": []})

    provider = CopernicusProvider(CONFIGURED, transport=httpx.MockTransport(handler), usage_recorder=recorder)

    async def _run() -> None:
        try:
            await provider.search_scenes(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO, max_cloud_coverage=20.0)
            with pytest.raises(httpx.HTTPStatusError):
                await provider.get_statistics(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO)
        finally:
            await provider.aclose()

    asyncio.run(_run())

    assert records, "esperava pelo menos um CopernicusUsageRecord"
    for record in records:
        serialized = json.dumps(record.__dict__, default=str)
        assert CLIENT_SECRET not in serialized


def test_concurrency_never_exceeds_two_in_flight() -> None:
    in_flight = 0
    max_in_flight = 0
    guard = asyncio.Lock()

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal in_flight, max_in_flight
        if "token" in str(request.url):
            return _token_response()
        async with guard:
            in_flight += 1
            max_in_flight = max(max_in_flight, in_flight)
        await asyncio.sleep(0.05)
        async with guard:
            in_flight -= 1
        return httpx.Response(200, json={"data": []})

    provider = CopernicusProvider(
        CopernicusAdapterConfig(client_id="cli-123", client_secret=CLIENT_SECRET, max_concurrent_requests=2),
        transport=httpx.MockTransport(handler),
    )

    async def _run() -> None:
        try:
            await asyncio.gather(
                *[
                    provider.get_statistics(aoi=AOI, date_from=DATE_FROM, date_to=DATE_TO)
                    for _ in range(5)
                ]
            )
        finally:
            await provider.aclose()

    asyncio.run(_run())
    assert max_in_flight <= 2, max_in_flight
