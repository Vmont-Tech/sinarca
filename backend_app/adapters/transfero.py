from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Literal

from backend_app.adapters.liquidity import ISinarcaLiquidity

TransferoMode = Literal["local", "sandbox", "live"]


@dataclass(frozen=True)
class TransferoConfig:
    mode: TransferoMode = "local"
    api_url: str | None = None
    api_key: str | None = None

    @classmethod
    def from_env(cls) -> "TransferoConfig":
        raw_mode = os.getenv("TRANSFERO_MODE", "local")
        mode: TransferoMode = raw_mode if raw_mode in {"local", "sandbox", "live"} else "local"
        return cls(mode=mode, api_url=os.getenv("TRANSFERO_API_URL"), api_key=os.getenv("TRANSFERO_API_KEY"))


class TransferoAdapter(ISinarcaLiquidity):
    def __init__(self, config: TransferoConfig | None = None) -> None:
        self.config = config or TransferoConfig.from_env()

    def confirm_collateral(self, project_id: str, amount_brl: float, pix_reference: str) -> dict[str, Any]:
        self._ensure_local()
        return {
            "provider": "transfero",
            "mode": "local",
            "project_id": project_id,
            "amount_brl": amount_brl,
            "pix_reference": pix_reference,
            "status": "CONFIRMED",
        }

    def release_funds(self, project_id: str, amount_brl: float) -> dict[str, Any]:
        self._ensure_local()
        return {"provider": "transfero", "mode": "local", "project_id": project_id, "amount_brl": amount_brl, "status": "RELEASED"}

    def status(self, reference: str) -> dict[str, Any]:
        self._ensure_local()
        return {"provider": "transfero", "mode": "local", "reference": reference, "status": "PORTABILITY_READY"}

    def _ensure_local(self) -> None:
        if self.config.mode != "local":
            raise NotImplementedError("TransferoAdapter preparado para portabilidade futura")
