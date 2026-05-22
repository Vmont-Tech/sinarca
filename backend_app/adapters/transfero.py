from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Literal

from backend_app.adapters.liquidity import ISinarcaLiquidity

TransferoMode = Literal["mock", "sandbox", "live"]


@dataclass(frozen=True)
class TransferoConfig:
    mode: TransferoMode = "mock"
    api_url: str | None = None
    api_key: str | None = None

    @classmethod
    def from_env(cls) -> "TransferoConfig":
        raw_mode = os.getenv("TRANSFERO_MODE", "mock")
        mode: TransferoMode = raw_mode if raw_mode in {"mock", "sandbox", "live"} else "mock"
        return cls(mode=mode, api_url=os.getenv("TRANSFERO_API_URL"), api_key=os.getenv("TRANSFERO_API_KEY"))


class TransferoAdapter(ISinarcaLiquidity):
    def __init__(self, config: TransferoConfig | None = None) -> None:
        self.config = config or TransferoConfig.from_env()

    def confirm_collateral(self, project_id: str, amount_brl: float, pix_reference: str) -> dict[str, Any]:
        self._ensure_mock()
        return {
            "provider": "transfero",
            "mode": "mock",
            "project_id": project_id,
            "amount_brl": amount_brl,
            "pix_reference": pix_reference,
            "status": "CONFIRMED",
        }

    def release_funds(self, project_id: str, amount_brl: float) -> dict[str, Any]:
        self._ensure_mock()
        return {"provider": "transfero", "mode": "mock", "project_id": project_id, "amount_brl": amount_brl, "status": "RELEASED"}

    def status(self, reference: str) -> dict[str, Any]:
        self._ensure_mock()
        return {"provider": "transfero", "mode": "mock", "reference": reference, "status": "PORTABILITY_READY"}

    def _ensure_mock(self) -> None:
        if self.config.mode != "mock":
            raise NotImplementedError("TransferoAdapter preparado para portabilidade futura")
