from __future__ import annotations

# Phase 05 / D-07/D-08/D-09/D-11 -- CopernicusProvider: primeiro adapter
# assincrono do repositorio, implementando SatelliteProvider sobre o
# Copernicus Data Space Ecosystem (CDSE).
#
# Fail-closed como backend_app/adapters/stellar.py: sem credenciais, todo
# metodo publico levanta RuntimeError ANTES de qualquer request HTTP. Nunca
# devolve NDVI/NDMI/NBR simulado ou derivado de hash.

import asyncio
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable

import httpx

from backend_app.adapters.satellite import CopernicusUsageRecord
from backend_app.core.config import Settings, get_settings

UsageRecorder = Callable[[CopernicusUsageRecord], Awaitable[None]]


# T-05-16 (SSRF, ASVS V10): as tres URLs abaixo sao constantes de config do
# dataclass, nunca parametro de request/rota. Nenhum metodo publico deste
# adapter aceita host/URL vindo de fora -- os hosts do CDSE sao fixos.
@dataclass(frozen=True)
class CopernicusAdapterConfig:
    client_id: str | None = None
    client_secret: str | None = None
    base_url: str = "https://sh.dataspace.copernicus.eu"
    stac_url: str = "https://stac.dataspace.copernicus.eu/v1"
    token_url: str = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    timeout_seconds: float = 30.0
    max_concurrent_requests: int = 2

    @classmethod
    def from_env(cls, settings: Settings | None = None) -> "CopernicusAdapterConfig":
        config = settings or get_settings()
        return cls(
            client_id=os.getenv("COPERNICUS_CLIENT_ID"),
            client_secret=os.getenv("COPERNICUS_CLIENT_SECRET"),
            timeout_seconds=config.copernicus_request_timeout_seconds,
            max_concurrent_requests=config.copernicus_max_concurrent_requests,
        )

    def assert_ready(self) -> None:
        missing: list[str] = []
        if not self.client_id:
            missing.append("COPERNICUS_CLIENT_ID")
        if not self.client_secret:
            missing.append("COPERNICUS_CLIENT_SECRET")
        if missing:
            raise RuntimeError(f"Configuração Copernicus incompleta: {', '.join(missing)}")


def _status_of(exc: httpx.HTTPError) -> int | None:
    response = getattr(exc, "response", None)
    return response.status_code if response is not None else None


class CopernicusProvider:
    """SatelliteProvider real (D-07/D-08/D-09/D-11).

    Fail-closed: sem credenciais, todo metodo publico levanta RuntimeError
    ANTES de qualquer request. NUNCA devolve indice simulado -- e o mesmo
    principio de backend_app/adapters/stellar.py.
    """

    def __init__(
        self,
        config: CopernicusAdapterConfig | None = None,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        usage_recorder: UsageRecorder | None = None,
    ) -> None:
        self.config = config or CopernicusAdapterConfig.from_env()
        self._client = httpx.AsyncClient(timeout=self.config.timeout_seconds, transport=transport)
        self._token: str | None = None
        self._token_expires_at: datetime | None = None
        self._token_lock = asyncio.Lock()
        # D-11: quota gratuita CDSE permite apenas 2 requests concorrentes.
        # O semaforo fica AQUI, no adapter, nunca espalhado pelos call sites.
        self._concurrency = asyncio.Semaphore(self.config.max_concurrent_requests)
        self._usage_recorder = usage_recorder

    async def _get_token(self) -> str:
        self.config.assert_ready()
        async with self._token_lock:
            now = datetime.now(timezone.utc)
            if self._token and self._token_expires_at and now < self._token_expires_at:
                return self._token
            started = time.perf_counter()
            try:
                resp = await self._client.post(
                    self.config.token_url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.config.client_id,
                        "client_secret": self.config.client_secret,
                    },
                )
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                # NUNCA logar/propagar o corpo da resposta nem o payload da
                # request de token: ambos podem conter o client secret.
                await self._record_usage("TOKEN", "ERROR", _status_of(exc), started, error_code=type(exc).__name__)
                raise RuntimeError("Falha ao autenticar no Copernicus Data Space Ecosystem") from None
            body = resp.json()
            self._token = body["access_token"]
            self._token_expires_at = now + timedelta(seconds=int(body["expires_in"]) - 30)
            await self._record_usage("TOKEN", "SUCCESS", resp.status_code, started)
            return self._token

    async def _record_usage(
        self,
        endpoint: str,
        outcome: str,
        http_status: int | None,
        started: float,
        *,
        processing_units: float | None = None,
        error_code: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if self._usage_recorder is None:
            return
        try:
            record = CopernicusUsageRecord(
                endpoint=endpoint,
                outcome=outcome,
                http_status=http_status,
                duration_ms=int((time.perf_counter() - started) * 1000),
                processing_units=processing_units,
                error_code=error_code,
                metadata=metadata or {},
            )
            await self._usage_recorder(record)
        except Exception:
            # Falha de observabilidade nunca pode derrubar o job de
            # monitoramento -- registrar consumo e best-effort.
            pass

    async def _authorized_post(
        self,
        url: str,
        *,
        endpoint: str,
        json_body: dict[str, Any],
        expect_json: bool = True,
    ) -> tuple[int, Any]:
        token = await self._get_token()
        started = time.perf_counter()
        async with self._concurrency:
            try:
                resp = await self._client.post(
                    url,
                    json=json_body,
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 401:
                    # O token pode ter expirado entre a checagem em cache e o
                    # envio da request. Invalida e tenta exatamente uma vez.
                    self._token = None
                    token = await self._get_token()
                    resp = await self._client.post(
                        url,
                        json=json_body,
                        headers={"Authorization": f"Bearer {token}"},
                    )
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                await self._record_usage(endpoint, "ERROR", _status_of(exc), started, error_code=type(exc).__name__)
                raise

            processing_units = _parse_processing_units(resp.headers.get("x-processingunits-spent"))
            await self._record_usage(endpoint, "SUCCESS", resp.status_code, started, processing_units=processing_units)
            return resp.status_code, (resp.json() if expect_json else resp.content)

    async def search_scenes(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        max_cloud_coverage: float, limit: int = 500,
    ) -> list[Any]:
        # Gate fail-closed visivel no proprio metodo publico, como em
        # stellar.py:56-57 -- mesmo que _get_token tambem chame assert_ready.
        self.config.assert_ready()
        raise NotImplementedError  # implementado na Task 2

    async def get_statistics(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        aggregation_interval: str = "P1M", max_cloud_coverage: float = 20.0,
    ) -> list[Any]:
        self.config.assert_ready()
        raise NotImplementedError  # implementado na Task 2

    async def get_image(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        max_cloud_coverage: float = 20.0, width: int = 512, height: int = 512,
    ) -> Any:
        self.config.assert_ready()
        raise NotImplementedError  # implementado na Task 2

    async def aclose(self) -> None:
        await self._client.aclose()


def _parse_processing_units(raw: str | None) -> float | None:
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def build_copernicus_provider(usage_recorder: UsageRecorder | None = None) -> CopernicusProvider:
    return CopernicusProvider(usage_recorder=usage_recorder)
