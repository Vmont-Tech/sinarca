from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Literal

from backend_app.adapters.liquidity import ISinarcaLiquidity

EtherfuseMode = Literal["mock", "sandbox"]


@dataclass(frozen=True)
class EtherfuseConfig:
    mode: EtherfuseMode = "mock"
    api_url: str | None = None
    api_key: str | None = None

    @classmethod
    def from_env(cls) -> "EtherfuseConfig":
        api_url = os.getenv("ETHERFUSE_API_URL")
        api_key = os.getenv("ETHERFUSE_API_KEY")
        mode = "sandbox" if api_url or api_key else "mock"
        return cls(mode=mode, api_url=api_url, api_key=api_key)

    def assert_sandbox_ready(self) -> None:
        if self.mode != "sandbox":
            return
        if not self.api_url or not self.api_key:
            raise RuntimeError("Configuração Etherfuse incompleta: ETHERFUSE_API_URL e ETHERFUSE_API_KEY são obrigatórias")


class EtherfuseAdapter(ISinarcaLiquidity):
    def __init__(self, config: EtherfuseConfig | None = None) -> None:
        self.config = config or EtherfuseConfig.from_env()

    def confirm_collateral(self, project_id: str, amount_brl: float, pix_reference: str) -> dict[str, Any]:
        if self.config.mode == "mock":
            return {
                "provider": "etherfuse",
                "instrument": "Tesouro Direto",
                "mode": "mock",
                "project_id": project_id,
                "amount_brl": amount_brl,
                "pix_reference": pix_reference,
                "status": "CONFIRMED",
                "external_reference": f"etherfuse-mock-{pix_reference}",
            }

        self.config.assert_sandbox_ready()
        return self._request(
            "POST",
            "/collateral/confirm",
            {"project_id": project_id, "amount_brl": amount_brl, "pix_reference": pix_reference},
        )

    def release_funds(self, project_id: str, amount_brl: float) -> dict[str, Any]:
        if self.config.mode == "mock":
            return {
                "provider": "etherfuse",
                "instrument": "Tesouro Direto",
                "mode": "mock",
                "project_id": project_id,
                "amount_brl": amount_brl,
                "status": "RELEASED",
            }

        self.config.assert_sandbox_ready()
        return self._request("POST", "/collateral/release", {"project_id": project_id, "amount_brl": amount_brl})

    def status(self, reference: str) -> dict[str, Any]:
        if self.config.mode == "mock":
            return {
                "provider": "etherfuse",
                "instrument": "Tesouro Direto",
                "mode": "mock",
                "reference": reference,
                "status": "CONFIRMED",
            }

        self.config.assert_sandbox_ready()
        return self._request("GET", f"/collateral/status/{reference}", None)

    def _request(self, method: str, path: str, payload: dict[str, Any] | None) -> dict[str, Any]:
        assert self.config.api_url is not None
        assert self.config.api_key is not None
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            f"{self.config.api_url.rstrip('/')}{path}",
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Falha Etherfuse sandbox: {exc}") from exc

        data = json.loads(raw) if raw else {}
        data.setdefault("provider", "etherfuse")
        data.setdefault("instrument", "Tesouro Direto")
        data.setdefault("mode", "sandbox")
        return data
