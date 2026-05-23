from __future__ import annotations

import asyncio

import pytest

from backend_app.adapters.etherfuse import EtherfuseAdapter, EtherfuseConfig
from backend_app.adapters.polygon import PolygonConfig, PolygonVaultAdapter
from backend_app.adapters.stellar import SorobanCreditAdapter, StellarAdapterConfig, StellarReserveSponsor
from backend_app.adapters.transfero import TransferoAdapter, TransferoConfig
from backend_app.main import app
from backend_app.modules.treasury.service import TreasuryService


def test_stellar_sponsor_account_and_trustline_models_sponsored_reserves() -> None:
    sponsor = StellarReserveSponsor(StellarAdapterConfig(mode="local", network="testnet"))

    result = sponsor.sponsor_account_and_trustline(
        project_id="PRC-2026-001",
        producer_account="GPRODUCER",
        asset_code="SINARCA",
    )

    assert result["success"] is True
    assert result["mode"] == "local"
    assert result["network"] == "testnet"
    assert result["project_id"] == "PRC-2026-001"
    assert result["sponsored_reserves"] is True
    assert result["operation"] == "BeginSponsoringFutureReserves"
    assert result["reserve_owner"] == "SINARCA"
    assert result["hash"].startswith("stellar_sponsored_reserve_local_")
    assert result["chain_event"]["event_type"] == "SPONSORED_RESERVE"


def test_soroban_adapter_returns_chain_event_payload_for_mint_unlock_and_burn() -> None:
    adapter = SorobanCreditAdapter(StellarAdapterConfig(mode="local", network="testnet"))

    mint = adapter.mint_locked(
        project_id="PRC-2026-001",
        producer="GPRODUCER",
        certifier="GCERTIFIER",
        baseline_hash="a" * 64,
        amount=100,
        initial_owner="GOWNER",
    )
    unlock = adapter.unlock("PRC-2026-001")
    burn = adapter.burn("PRC-2026-001", owner="GOWNER", operator="GOWNER", amount=10, reason="compensation")

    assert mint["operation"] == "mint_locked"
    assert mint["chain_event"]["event_type"] == "MINT_LOCKED"
    assert mint["payload"]["status"] == "BLOQUEADO"
    assert unlock["operation"] == "unlock"
    assert unlock["chain_event"]["event_type"] == "UNLOCK"
    assert burn["operation"] == "burn"
    assert burn["chain_event"]["event_type"] == "BURN"
    assert burn["hash"].startswith("soroban_burn_local_")


def test_stellar_testnet_mode_fails_closed_without_required_secrets() -> None:
    sponsor = StellarReserveSponsor(StellarAdapterConfig(mode="testnet", network="testnet"))

    with pytest.raises(RuntimeError, match="Configuração Stellar incompleta"):
        sponsor.sponsor_account_and_trustline("PRC-2026-001", "GPRODUCER", "SINARCA")


def test_etherfuse_local_confirm_collateral_returns_tesouro_direto() -> None:
    adapter = EtherfuseAdapter(EtherfuseConfig(mode="local"))

    result = adapter.confirm_collateral("PRC-2026-001", 1500.50, "pix-abc")

    assert result["provider"] == "etherfuse"
    assert result["instrument"] == "Tesouro Direto"
    assert result["status"] == "CONFIRMED"
    assert result["external_reference"] == "etherfuse-local-pix-abc"


def test_etherfuse_sandbox_fails_closed_without_api_key() -> None:
    adapter = EtherfuseAdapter(EtherfuseConfig(mode="sandbox", api_url="https://sandbox.invalid", api_key=None))

    with pytest.raises(RuntimeError, match="Configuração Etherfuse incompleta"):
        adapter.confirm_collateral("PRC-2026-001", 1000, "pix-abc")


def test_transfero_adapter_is_future_portability_outside_local_mode() -> None:
    adapter = TransferoAdapter(TransferoConfig(mode="sandbox"))

    with pytest.raises(NotImplementedError, match="TransferoAdapter preparado para portabilidade futura"):
        adapter.status("transfero-ref")


def test_yield_distribution_splits_90_10_to_social_impact_vault() -> None:
    distribution = asyncio.run(TreasuryService().harvest_and_distribute_yield(
        treasury_position_id="00000000-0000-0000-0000-000000000001",
        gross_yield_brl=123.45,
    ))

    assert distribution["operational_brl"] == 111.11
    assert distribution["social_vault_brl"] == 12.35
    assert distribution["social_destination"] == "SocialImpactVault"


def test_etherfuse_confirm_collateral_and_mint_requires_confirmed_status() -> None:
    class PendingLiquidity:
        def confirm_collateral(self, project_id: str, amount_brl: float, pix_reference: str) -> dict[str, object]:
            return {"provider": "etherfuse", "status": "PENDING"}

        def release_funds(self, project_id: str, amount_brl: float) -> dict[str, object]:
            return {}

        def status(self, reference: str) -> dict[str, object]:
            return {}

    with pytest.raises(RuntimeError, match="Lastro financeiro não confirmado"):
        asyncio.run(
            TreasuryService().confirm_collateral_and_mint(
                project_id="PRC-2026-001",
                amount_brl=1000,
                credit_amount=100,
                pix_reference="pix-pending",
                liquidity_adapter=PendingLiquidity(),
                soroban_adapter=SorobanCreditAdapter(StellarAdapterConfig(mode="local", network="testnet")),
            )
        )


def test_polygon_local_validate_lock_event_and_request_wrapped_mint() -> None:
    adapter = PolygonVaultAdapter(PolygonConfig(mode="local"))

    lock = adapter.validate_lock_event(
        chain="polygon",
        vault_address="0xVault",
        source_token_address="0xToken",
        source_tx_hash="0xabc123",
        amount=25,
    )
    wrapped = adapter.request_wrapped_mint("PRC-2026-001", "SINARCA:WRAPPED:POLYGON", 25)

    assert lock["success"] is True
    assert lock["status"] == "LOCK_CONFIRMED"
    assert lock["source_tx_hash"] == "0xabc123"
    assert wrapped["status"] == "WRAPPED_MINT_REQUESTED"
    assert wrapped["wrapped_stellar_asset"] == "SINARCA:WRAPPED:POLYGON"


def test_polygon_testnet_fails_closed_without_rpc_or_vault() -> None:
    adapter = PolygonVaultAdapter(PolygonConfig(mode="testnet", rpc_url=None, vault_address=None))

    with pytest.raises(RuntimeError, match="Configuração Polygon incompleta"):
        adapter.validate_lock_event("polygon", "0xVault", "0xToken", "0xabc123", 1)


def test_stellar_status_route_reports_runtime_mode() -> None:
    route_paths = {route.path for route in app.routes}
    status = StellarReserveSponsor().status()

    assert "/api/v1/stellar/status" in route_paths
    assert status["mode"] in {"local", "testnet", "live"}
