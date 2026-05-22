from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Literal

PolygonMode = Literal["mock", "testnet"]


@dataclass(frozen=True)
class PolygonConfig:
    mode: PolygonMode = "mock"
    rpc_url: str | None = None
    vault_address: str | None = None

    @classmethod
    def from_env(cls) -> "PolygonConfig":
        rpc_url = os.getenv("POLYGON_RPC_URL")
        vault_address = os.getenv("POLYGON_VAULT_ADDRESS")
        explicit_mode = os.getenv("POLYGON_MODE")
        mode: PolygonMode = "testnet" if explicit_mode == "testnet" or rpc_url or vault_address else "mock"
        return cls(mode=mode, rpc_url=rpc_url, vault_address=vault_address)

    def assert_testnet_ready(self) -> None:
        if self.mode != "testnet":
            return
        if not self.rpc_url or not self.vault_address:
            raise RuntimeError("Configuração Polygon incompleta: POLYGON_RPC_URL e POLYGON_VAULT_ADDRESS são obrigatórias")


class PolygonVaultAdapter:
    def __init__(self, config: PolygonConfig | None = None) -> None:
        self.config = config or PolygonConfig.from_env()

    def validate_lock_event(
        self,
        chain: str,
        vault_address: str,
        source_token_address: str,
        source_tx_hash: str,
        amount: float,
    ) -> dict[str, Any]:
        _validate_lock_inputs(chain, vault_address, source_token_address, source_tx_hash, amount)

        if self.config.mode == "mock":
            return {
                "success": True,
                "mode": "mock",
                "chain": "polygon",
                "vault_address": vault_address,
                "source_token_address": source_token_address,
                "source_tx_hash": source_tx_hash,
                "amount": amount,
                "status": "LOCK_CONFIRMED",
                "hash": _mock_hash(source_tx_hash),
            }

        self.config.assert_testnet_ready()
        receipt = self._rpc("eth_getTransactionReceipt", [source_tx_hash])
        if not receipt:
            raise RuntimeError("Transação Polygon não encontrada no RPC testnet")
        if str(receipt.get("status")).lower() != "0x1":
            raise RuntimeError("Transação Polygon não confirmada com sucesso")
        return {
            "success": True,
            "mode": "testnet",
            "chain": "polygon",
            "vault_address": vault_address,
            "source_token_address": source_token_address,
            "source_tx_hash": source_tx_hash,
            "amount": amount,
            "status": "LOCK_CONFIRMED",
            "receipt": receipt,
        }

    def request_wrapped_mint(self, project_id: str, wrapped_stellar_asset: str, amount: float) -> dict[str, Any]:
        if not project_id or not wrapped_stellar_asset or amount <= 0:
            raise ValueError("project_id, wrapped_stellar_asset e amount são obrigatórios")
        return {
            "success": True,
            "mode": self.config.mode,
            "project_id": project_id,
            "wrapped_stellar_asset": wrapped_stellar_asset,
            "amount": amount,
            "status": "WRAPPED_MINT_REQUESTED",
            "hash": _mock_hash(f"{project_id}:{wrapped_stellar_asset}:{amount}"),
        }

    def _rpc(self, method: str, params: list[Any]) -> Any:
        assert self.config.rpc_url is not None
        payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode("utf-8")
        request = urllib.request.Request(
            self.config.rpc_url,
            data=payload,
            method="POST",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Falha Polygon testnet RPC: {exc}") from exc

        if data.get("error"):
            raise RuntimeError(f"Falha Polygon testnet RPC: {data['error']}")
        return data.get("result")


def _validate_lock_inputs(chain: str, vault_address: str, source_token_address: str, source_tx_hash: str, amount: float) -> None:
    if chain.strip().lower() != "polygon":
        raise ValueError("chain deve ser polygon")
    required = {
        "vault_address": vault_address,
        "source_token_address": source_token_address,
        "source_tx_hash": source_tx_hash,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise ValueError(f"Campos obrigatórios ausentes para lock-and-mint: {', '.join(missing)}")
    if amount <= 0:
        raise ValueError("amount deve ser maior que zero")


def _mock_hash(seed: str) -> str:
    return "polygon_mock_" + hashlib.sha256(seed.encode("utf-8")).hexdigest()[:32]
