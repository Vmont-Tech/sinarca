from __future__ import annotations

# Phase 05 / D-07/D-08/D-09/D-11 -- CopernicusProvider: primeiro adapter
# assincrono do repositorio, implementando SatelliteProvider sobre o
# Copernicus Data Space Ecosystem (CDSE).
#
# Fail-closed como backend_app/adapters/stellar.py: sem credenciais, todo
# metodo publico levanta RuntimeError ANTES de qualquer request HTTP. Nunca
# devolve NDVI/NDMI/NBR simulado ou derivado de hash.

import asyncio
import math
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable

import httpx

from backend_app.adapters.satellite import (
    CopernicusUsageRecord,
    IndexStatisticsDTO,
    SatelliteImageDTO,
    SceneDTO,
)
from backend_app.core.config import Settings, get_settings

UsageRecorder = Callable[[CopernicusUsageRecord], Awaitable[None]]

# D-09: evalscript unico para NDVI/NDMI/NBR. O calculo acontece no lado do
# provedor -- o backend so faz parsing de JSON, sem nenhuma biblioteca de
# processamento de raster/array cientifico local.
SENTINEL2_INDICES_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "B11", "B12", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndmi", bands: 1, sampleType: "FLOAT32" },
      { id: "nbr", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  // SCL 3=sombra de nuvem, 8/9=nuvem media/alta, 10=cirrus
  let valid = (s.dataMask === 1 && s.SCL !== 3 && s.SCL !== 8 && s.SCL !== 9 && s.SCL !== 10) ? 1 : 0;
  return {
    ndvi: [index(s.B08, s.B04)],
    ndmi: [index(s.B08, s.B11)],
    nbr:  [index(s.B08, s.B12)],
    dataMask: [valid]
  };
}
"""

# D-19: evalscript RGB simples para before/after (Process API).
SENTINEL2_TRUE_COLOR_EVALSCRIPT = """//VERSION=3
function setup() {
  return { input: ["B02", "B03", "B04"], output: { bands: 3 } };
}
function evaluatePixel(s) {
  return [2.5 * s.B04, 2.5 * s.B03, 2.5 * s.B02];
}
"""


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


def _iso_z(value: datetime) -> str:
    """Normaliza para UTC e emite '...Z' -- o Sentinel Hub rejeita offsets '+00:00'."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def parse_stac_response(payload: dict[str, Any]) -> list[SceneDTO]:
    """Helper puro e testavel: parsing da resposta STAC search, sem HTTP."""
    scenes: list[SceneDTO] = []
    for feature in payload.get("features", []):
        scene_id = feature.get("id")
        properties = feature.get("properties") or {}
        observed_raw = properties.get("datetime")
        if not scene_id or not observed_raw:
            # Descartar features sem id ou sem datetime -- nunca inventar valor.
            continue
        observed_at = _parse_iso(observed_raw)
        if observed_at is None:
            continue
        processing_version = (
            properties.get("processing:version")
            or properties.get("s2:processing_baseline")
            or "v1"
        )
        scenes.append(
            SceneDTO(
                scene_id=scene_id,
                observed_at=observed_at,
                cloud_coverage=properties.get("eo:cloud_cover"),
                processing_version=str(processing_version),
                metadata={"collection": feature.get("collection"), "platform": properties.get("platform")},
            )
        )
    scenes.sort(key=lambda scene: scene.observed_at)
    return scenes


def _band_stats(output: dict[str, Any] | None) -> dict[str, Any] | None:
    if not output:
        return None
    bands = output.get("bands") or {}
    band = bands.get("B0")
    if not band:
        return None
    return band.get("stats") or {}


# BUGFIX (validacao critica pos-checkpoint 05-09): a Statistical API do CDSE
# pode devolver "mean"/"min"/"max" como NaN (nao um {"error": ...} de
# intervalo, que ja e tratado acima) quando poucos pixels validos entram no
# calculo de um mes. `numeric` do Postgres aceita NaN, mas o audit_events em
# create_audit_event serializa o valor como JSON puro (nao numeric), e JSON
# nunca aceita o token NaN -- INSERT falhava com InvalidTextRepresentationError
# em apply_baseline_from_observations toda vez que uma observacao NaN entrava
# na media. Mesmo principio do resto do parser: ausencia de dado vira None,
# nunca um numero (nem 0.0, nem NaN).
def _finite_or_none(value: Any) -> float | None:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    return float(value) if math.isfinite(value) else None


def parse_statistics_response(payload: dict[str, Any]) -> list[IndexStatisticsDTO]:
    """Helper puro e testavel: parsing da resposta Statistical API, sem HTTP."""
    results: list[IndexStatisticsDTO] = []
    for item in payload.get("data", []):
        if "error" in item:
            # A Statistical API devolve {"interval": ..., "error": {...}} quando
            # nao ha dado no periodo -- nunca inventar valor, pular o intervalo.
            continue
        interval = item.get("interval") or {}
        interval_from = _parse_iso(interval.get("from"))
        interval_to = _parse_iso(interval.get("to"))
        if interval_from is None or interval_to is None:
            continue
        outputs = item.get("outputs") or {}
        ndvi_stats = _band_stats(outputs.get("ndvi"))
        ndmi_stats = _band_stats(outputs.get("ndmi"))
        nbr_stats = _band_stats(outputs.get("nbr"))

        valid_pixel_percentage: float | None = None
        sample_count = ndvi_stats.get("sampleCount") if ndvi_stats else None
        no_data_count = ndvi_stats.get("noDataCount") if ndvi_stats else None
        if sample_count is not None and no_data_count is not None:
            total = sample_count + no_data_count
            if total > 0:
                # Nunca substituir None por 0.0 -- indice ausente e ausencia de
                # dado, nao zero. Aqui o total existe, entao calculamos direto.
                valid_pixel_percentage = round(100.0 * sample_count / total, 2)

        results.append(
            IndexStatisticsDTO(
                interval_from=interval_from,
                interval_to=interval_to,
                ndvi_mean=_finite_or_none(ndvi_stats.get("mean")) if ndvi_stats else None,
                ndvi_min=_finite_or_none(ndvi_stats.get("min")) if ndvi_stats else None,
                ndvi_max=_finite_or_none(ndvi_stats.get("max")) if ndvi_stats else None,
                ndmi_mean=_finite_or_none(ndmi_stats.get("mean")) if ndmi_stats else None,
                nbr_mean=_finite_or_none(nbr_stats.get("mean")) if nbr_stats else None,
                valid_pixel_percentage=valid_pixel_percentage,
            )
        )
    results.sort(key=lambda item: item.interval_from)
    return results


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

    # BUGFIX (validacao critica pos-checkpoint 05-09): o CDSE STAC rejeita
    # limit > 200 para a colecao sentinel-2-l2a com HTTP 400 LimitValidationError
    # ("exceptionally heavy responses"), mesmo que a doc generica do STAC anuncie
    # ate 500. Confirmado ao vivo contra https://stac.dataspace.copernicus.eu/v1/search
    # -- reproduzia 400 em TODA chamada de search_scenes(), derrubando 100% dos
    # jobs HISTORICAL_RECONSTRUCTION/CONTINUOUS_MONITORING. O loop de paginacao
    # existente (ate 5 paginas) ja cobre a janela de 5 anos com o limite menor.
    CDSE_SENTINEL2_MAX_LIMIT = 200

    async def search_scenes(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        max_cloud_coverage: float, limit: int = CDSE_SENTINEL2_MAX_LIMIT,
    ) -> list[SceneDTO]:
        # Gate fail-closed visivel no proprio metodo publico, como em
        # stellar.py:56-57 -- mesmo que _get_token tambem chame assert_ready.
        self.config.assert_ready()
        body: dict[str, Any] = {
            "collections": ["sentinel-2-l2a"],
            "datetime": f"{_iso_z(date_from)}/{_iso_z(date_to)}",
            "intersects": aoi,
            "limit": min(limit, self.CDSE_SENTINEL2_MAX_LIMIT),
            "filter-lang": "cql2-json",
            "filter": {"op": "<=", "args": [{"property": "eo:cloud_cover"}, float(max_cloud_coverage)]},
        }
        url = f"{self.config.stac_url}/search"
        scenes: list[SceneDTO] = []
        # No maximo 5 paginas: a janela de 5 anos com filtro de nuvem cabe
        # folgadamente nisso (D-12, ~60 pontos/5 anos esperados).
        for _ in range(5):
            _, payload = await self._authorized_post(url, endpoint="STAC_SEARCH", json_body=body)
            scenes.extend(parse_stac_response(payload))
            next_link = next(
                (link for link in (payload.get("links") or []) if link.get("rel") == "next"),
                None,
            )
            if not next_link:
                break
            next_body = next_link.get("body")
            if not next_body:
                break
            body = next_body
            url = next_link.get("href") or url
        scenes.sort(key=lambda scene: scene.observed_at)
        return scenes

    # BUGFIX (validacao critica pos-checkpoint 05-09): bounds.properties.crs abaixo
    # e geografico (CRS84 = graus), entao resx/resy sao interpretados pela
    # Statistics API do CDSE nas MESMAS unidades do CRS -- "10" virava 10 graus
    # (~3744 m/pixel no equador), estourando o limite de 1500 m/pixel da colecao
    # S2L2A com HTTP 400 COMMON_EXCEPTION em toda chamada. Confirmado ao vivo
    # contra https://sh.dataspace.copernicus.eu/api/v1/statistics. 0.0001 grau
    # equivale a ~11 m no equador, o mais proximo do nativo 10 m do Sentinel-2
    # que se pode expressar sem trocar o CRS do bounds para uma projecao metrica.
    STATISTICS_RESOLUTION_DEGREES = 0.0001

    async def get_statistics(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        aggregation_interval: str = "P1M", max_cloud_coverage: float = 20.0,
    ) -> list[IndexStatisticsDTO]:
        self.config.assert_ready()
        body = {
            "input": {
                "bounds": {"geometry": aoi, "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},
                "data": [{
                    "type": "sentinel-2-l2a",
                    "dataFilter": {"maxCloudCoverage": float(max_cloud_coverage), "mosaickingOrder": "leastCC"},
                }],
            },
            "aggregation": {
                "timeRange": {"from": _iso_z(date_from), "to": _iso_z(date_to)},
                "aggregationInterval": {"of": aggregation_interval},
                "evalscript": SENTINEL2_INDICES_EVALSCRIPT,
                "resx": self.STATISTICS_RESOLUTION_DEGREES,
                "resy": self.STATISTICS_RESOLUTION_DEGREES,
            },
            "calculations": {"default": {"statistics": {"default": {"stats": ["mean", "min", "max"]}}}},
        }
        _, payload = await self._authorized_post(
            f"{self.config.base_url}/api/v1/statistics", endpoint="STATISTICS", json_body=body,
        )
        return parse_statistics_response(payload)

    async def get_image(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        max_cloud_coverage: float = 20.0, width: int = 512, height: int = 512,
    ) -> SatelliteImageDTO:
        # D-19: chamado APENAS quando uma anomalia chega a ANALYZED. Nunca por
        # observacao de rotina -- Process API custa muito mais PU que a
        # Statistical.
        self.config.assert_ready()
        body = {
            "input": {
                "bounds": {"geometry": aoi, "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},
                "data": [{
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {"from": _iso_z(date_from), "to": _iso_z(date_to)},
                        "maxCloudCoverage": float(max_cloud_coverage),
                        "mosaickingOrder": "leastCC",
                    },
                }],
            },
            "output": {
                "width": width, "height": height,
                "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
            },
            "evalscript": SENTINEL2_TRUE_COLOR_EVALSCRIPT,
        }
        _, content = await self._authorized_post(
            f"{self.config.base_url}/api/v1/process", endpoint="PROCESS", json_body=body, expect_json=False,
        )
        return SatelliteImageDTO(
            content=content,
            mime_type="image/png",
            captured_from=date_from,
            captured_to=date_to,
            width=width,
            height=height,
        )

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
