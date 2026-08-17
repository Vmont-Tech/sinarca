from __future__ import annotations

# Phase 05 / D-07 -- Contrato SatelliteProvider.
#
# Interface desacoplada do provedor concreto: o codigo de dominio
# (backend_app/modules/satellite/*) depende apenas deste Protocol, nunca do
# cliente HTTP assincrono nem de detalhes do Copernicus. Modulo PURO: sem
# banco, sem ORM, sem cliente HTTP -- apenas dataclasses e o Protocol.

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol, Sequence


@dataclass(frozen=True)
class SceneDTO:
    """Cena Sentinel-2 descoberta via STAC."""
    scene_id: str
    observed_at: datetime
    cloud_coverage: float | None
    processing_version: str
    platform: str = "SENTINEL_2"
    product: str = "L2A"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class IndexStatisticsDTO:
    """Estatisticas agregadas de um intervalo (Statistical API)."""
    interval_from: datetime
    interval_to: datetime
    ndvi_mean: float | None = None
    ndvi_min: float | None = None
    ndvi_max: float | None = None
    ndmi_mean: float | None = None
    nbr_mean: float | None = None
    valid_pixel_percentage: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SatelliteImageDTO:
    """Imagem PNG bruta (Process API), usada apenas em before/after (D-19)."""
    content: bytes
    mime_type: str
    captured_from: datetime
    captured_to: datetime
    width: int
    height: int


@dataclass(frozen=True)
class CopernicusUsageRecord:
    """D-26: uma linha de consumo por chamada externa. NUNCA contem segredo."""
    endpoint: str            # COPERNICUS_USAGE_ENDPOINTS
    outcome: str              # COPERNICUS_USAGE_OUTCOMES
    http_status: int | None
    duration_ms: int
    processing_units: float | None = None
    error_code: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class SatelliteProvider(Protocol):
    async def search_scenes(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        max_cloud_coverage: float, limit: int = 500,
    ) -> list[SceneDTO]: ...

    async def get_statistics(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        aggregation_interval: str = "P1M", max_cloud_coverage: float = 20.0,
    ) -> list[IndexStatisticsDTO]: ...

    async def get_image(
        self, *, aoi: dict[str, Any], date_from: datetime, date_to: datetime,
        max_cloud_coverage: float = 20.0, width: int = 512, height: int = 512,
    ) -> SatelliteImageDTO: ...

    async def aclose(self) -> None: ...
