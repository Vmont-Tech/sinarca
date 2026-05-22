from __future__ import annotations

import pytest

from backend_app.adapters.stellar import SorobanCreditAdapter, StellarAdapterConfig, StellarReserveSponsor


def test_stellar_sponsor_account_and_trustline_models_sponsored_reserves() -> None:
    sponsor = StellarReserveSponsor(StellarAdapterConfig(mode="mock", network="testnet"))

    result = sponsor.sponsor_account_and_trustline(
        project_id="PRC-2026-001",
        producer_account="GPRODUCER",
        asset_code="SINARCA",
    )

    assert result["success"] is True
    assert result["mode"] == "mock"
    assert result["network"] == "testnet"
    assert result["project_id"] == "PRC-2026-001"
    assert result["sponsored_reserves"] is True
    assert result["operation"] == "BeginSponsoringFutureReserves"
    assert result["reserve_owner"] == "SINARCA"
    assert result["hash"].startswith("stellar_sponsored_reserve_mock_")
    assert result["chain_event"]["event_type"] == "SPONSORED_RESERVE"


def test_soroban_adapter_returns_chain_event_payload_for_mint_unlock_and_burn() -> None:
    adapter = SorobanCreditAdapter(StellarAdapterConfig(mode="mock", network="testnet"))

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
    assert burn["hash"].startswith("soroban_burn_mock_")


def test_stellar_testnet_mode_fails_closed_without_required_secrets() -> None:
    sponsor = StellarReserveSponsor(StellarAdapterConfig(mode="testnet", network="testnet"))

    with pytest.raises(RuntimeError, match="Configuração Stellar incompleta"):
        sponsor.sponsor_account_and_trustline("PRC-2026-001", "GPRODUCER", "SINARCA")
