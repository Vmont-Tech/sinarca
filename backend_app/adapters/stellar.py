from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Literal

StellarMode = Literal["mock", "testnet", "live"]


@dataclass(frozen=True)
class StellarAdapterConfig:
    mode: StellarMode = "mock"
    network: str = "testnet"
    horizon_url: str | None = None
    soroban_rpc_url: str | None = None
    issuer_secret_key: str | None = None
    distributor_secret_key: str | None = None
    contract_id: str | None = None

    @classmethod
    def from_env(cls) -> "StellarAdapterConfig":
        mode = _mode_from_env()
        return cls(
            mode=mode,
            network=os.getenv("STELLAR_NETWORK", "testnet"),
            horizon_url=os.getenv("STELLAR_HORIZON_URL"),
            soroban_rpc_url=os.getenv("SOROBAN_RPC_URL") or os.getenv("STELLAR_SOROBAN_RPC_URL"),
            issuer_secret_key=os.getenv("STELLAR_ISSUER_SECRET_KEY"),
            distributor_secret_key=os.getenv("STELLAR_DISTRIBUTOR_SECRET_KEY"),
            contract_id=os.getenv("SOROBAN_CONTRACT_ID") or os.getenv("STELLAR_CONTRACT_ID"),
        )

    def assert_ready(self) -> None:
        if self.mode == "mock":
            return

        missing: list[str] = []
        if not self.issuer_secret_key:
            missing.append("STELLAR_ISSUER_SECRET_KEY")
        if not self.distributor_secret_key:
            missing.append("STELLAR_DISTRIBUTOR_SECRET_KEY")
        if not self.horizon_url and not self.soroban_rpc_url:
            missing.append("STELLAR_HORIZON_URL or SOROBAN_RPC_URL")

        if missing:
            raise RuntimeError("Configuração Stellar incompleta")


class StellarReserveSponsor:
    def __init__(self, config: StellarAdapterConfig | None = None) -> None:
        self.config = config or StellarAdapterConfig.from_env()

    def sponsor_account_and_trustline(self, project_id: str, producer_account: str, asset_code: str) -> dict[str, Any]:
        self.config.assert_ready()
        payload = {
            "project_id": project_id,
            "producer_account": producer_account,
            "asset_code": asset_code,
            "sponsored_reserves": True,
            "operation": "BeginSponsoringFutureReserves",
            "reserve_owner": "SINARCA",
        }
        return {
            "success": True,
            "mode": self.config.mode,
            "network": self.config.network,
            "hash": _operation_hash("stellar_sponsored_reserve", payload, self.config.mode),
            **payload,
            "chain_event": {
                "event_type": "SPONSORED_RESERVE",
                "chain": "stellar",
                "payload": payload,
            },
        }

    def status(self) -> dict[str, Any]:
        return {
            "success": True,
            "mode": self.config.mode,
            "network": self.config.network,
            "horizon_configured": bool(self.config.horizon_url),
            "soroban_rpc_configured": bool(self.config.soroban_rpc_url),
            "issuer_secret_configured": bool(self.config.issuer_secret_key),
            "distributor_secret_configured": bool(self.config.distributor_secret_key),
            "contract_configured": bool(self.config.contract_id),
        }


class SorobanCreditAdapter:
    def __init__(self, config: StellarAdapterConfig | None = None) -> None:
        self.config = config or StellarAdapterConfig.from_env()

    def mint_locked(
        self,
        project_id: str,
        producer: str,
        certifier: str,
        baseline_hash: str,
        amount: int | float,
        initial_owner: str,
    ) -> dict[str, Any]:
        payload = {
            "project_id": project_id,
            "producer": producer,
            "certifier": certifier,
            "baseline_hash": baseline_hash,
            "amount": amount,
            "initial_owner": initial_owner,
            "status": "BLOQUEADO",
        }
        return self._operation("MINT_LOCKED", "mint_locked", payload)

    def unlock(self, project_id: str) -> dict[str, Any]:
        return self._operation("UNLOCK", "unlock", {"project_id": project_id, "status": "DISPONIVEL"})

    def burn(self, project_id: str, owner: str, operator: str, amount: int | float, reason: str) -> dict[str, Any]:
        payload = {
            "project_id": project_id,
            "owner": owner,
            "operator": operator,
            "amount": amount,
            "reason": reason,
        }
        return self._operation("BURN", "burn", payload)

    def status(self, project_id: str) -> dict[str, Any]:
        payload = {"project_id": project_id, "contract_id": self.config.contract_id, "status": "BLOQUEADO"}
        return self._operation("STATUS_CHECK", "status", payload)

    def _operation(self, event_type: str, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.config.assert_ready()
        tx_hash = _operation_hash(f"soroban_{operation}", payload, self.config.mode)
        return {
            "success": True,
            "mode": self.config.mode,
            "network": self.config.network,
            "hash": tx_hash,
            "operation": operation,
            "project_id": payload["project_id"],
            "payload": payload,
            "chain_event": {
                "event_type": event_type,
                "chain": "soroban",
                "transaction_hash": tx_hash,
                "payload": payload,
            },
        }


def _mode_from_env() -> StellarMode:
    explicit_mode = os.getenv("STELLAR_MODE")
    if explicit_mode in {"mock", "testnet", "live"}:
        return explicit_mode

    enabled = os.getenv("STELLAR_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
    if not enabled:
        return "mock"

    network = os.getenv("STELLAR_NETWORK", "testnet").strip().lower()
    return "live" if network in {"live", "mainnet", "public"} else "testnet"


def _operation_hash(operation: str, payload: dict[str, Any], mode: StellarMode) -> str:
    raw = json.dumps({"operation": operation, "payload": payload, "nonce": time.time_ns()}, sort_keys=True)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
    return f"{operation}_{mode}_{digest}"
