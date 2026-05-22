from __future__ import annotations

import hashlib
import os
import time
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class StellarConfig:
    network: str = os.getenv("STELLAR_NETWORK", "testnet")
    horizon_url: str = os.getenv("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org")
    issuer_public_key: str = os.getenv("STELLAR_ISSUER_PUBLIC_KEY", os.getenv("STELLAR_ISSUER_PUBLIC", ""))
    issuer_secret_key: str = os.getenv("STELLAR_ISSUER_SECRET_KEY", os.getenv("STELLAR_ISSUER_SECRET", ""))
    distributor_public_key: str = os.getenv("STELLAR_DISTRIBUTOR_PUBLIC_KEY", os.getenv("STELLAR_DISTRIBUTION_PUBLIC_KEY", ""))
    distributor_secret_key: str = os.getenv("STELLAR_DISTRIBUTOR_SECRET_KEY", os.getenv("STELLAR_DISTRIBUTION_SECRET_KEY", ""))
    asset_code: str = os.getenv("STELLAR_ASSET_CODE", "SINARCA")
    enabled: bool = os.getenv("STELLAR_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}


class StellarService:
    """Adapter único para a integração Stellar do MVP.

    Quando STELLAR_ENABLED=false, o serviço roda em modo mock determinístico.
    Quando STELLAR_ENABLED=true, ele realiza transações reais usando o Horizon.
    """

    def __init__(self, config: StellarConfig | None = None):
        self.config = config or StellarConfig()

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.config.enabled,
            "mode": "stellar_sdk_active" if self.config.enabled else "mock",
            "network": self.config.network,
            "horizon_url": self.config.horizon_url,
            "asset_code": self.config.asset_code,
            "issuer_configured": bool(self.config.issuer_public_key),
            "distributor_configured": bool(self.config.distributor_public_key),
        }

    def _mock_hash(self, payload: str) -> str:
        digest = hashlib.sha256(f"{payload}:{time.time_ns()}".encode("utf-8")).hexdigest()
        return f"stellar_mock_{digest}"

    def transfer_credit(
        self,
        *,
        amount: float,
        from_account: str,
        to_account: str,
        memo: str = "",
        asset_code: str | None = None,
    ) -> dict[str, Any]:
        code = asset_code or self.config.asset_code
        payload = f"{code}:{amount}:{from_account}:{to_account}:{memo}:{self.config.network}"

        if not self.config.enabled:
            return {
                "success": True,
                "mode": "mock",
                "network": self.config.network,
                "hash": self._mock_hash(payload),
                "asset_code": code,
                "amount": amount,
                "from_account": from_account,
                "to_account": to_account,
                "memo": memo,
            }

    def burn_credit(
        self,
        *,
        amount: float,
        from_account: str,
        memo: str = "",
        asset_code: str | None = None,
    ) -> dict[str, Any]:
        """Burn (aposentadoria) de créditos no Stellar.

        Observação importante:
        - Este repositório ainda não possui, neste arquivo, a integração Soroban RPC real.
        - Mantemos o modo mock apenas para o MVP/legado Web2.
        - Ao ativar STELLAR_ENABLED=true, este método será substituído para chamar o contrato Soroban via RPC.
        """
        code = asset_code or self.config.asset_code
        payload = f"{code}:{amount}:{from_account}:BURN:{memo}:{self.config.network}"
        return {
            "success": True,
            "mode": "mock" if not self.config.enabled else "simulated_burn",
            "network": self.config.network,
            "hash": self._mock_hash(payload),
            "asset_code": code,
            "amount": amount,
            "from_account": from_account,
            "to_account": "BURN_ADDRESS",
            "memo": memo,
        }


        import requests
        from stellar_sdk import Asset, Keypair, Network, Server, TransactionBuilder

        server = Server(self.config.horizon_url)
        network_passphrase = (
            Network.TESTNET_NETWORK_PASSPHRASE
            if self.config.network == "testnet"
            else Network.PUBLIC_NETWORK_PASSPHRASE
        )

        distributor_secret = self.config.distributor_secret_key
        if not distributor_secret:
            raise RuntimeError("Chave secreta do distribuidor (STELLAR_DISTRIBUTOR_SECRET_KEY) não configurada.")

        distributor_keypair = Keypair.from_secret(distributor_secret)
        distributor_pub = distributor_keypair.public_key

        # Validar destino
        destination_pub = to_account
        receiver_keypair = None
        is_valid_stellar_pub = False
        try:
            if to_account.startswith("G") and len(to_account) == 56:
                Keypair.from_public_key(to_account)
                is_valid_stellar_pub = True
        except Exception:
            pass

        if not is_valid_stellar_pub:
            # Gerar conta temporária no testnet
            print(f"[StellarService] Gerando conta temporária no testnet para {to_account}...")
            receiver_keypair = Keypair.random()
            destination_pub = receiver_keypair.public_key

            if self.config.network == "testnet":
                friendbot_url = f"https://friendbot.stellar.org/?addr={destination_pub}"
                res = requests.get(friendbot_url, timeout=15)
                res.raise_for_status()

                # Criar trustline na conta do receptor
                receiver_account = server.load_account(destination_pub)
                custom_asset = Asset(code, self.config.issuer_public_key)
                trust_tx = (
                    TransactionBuilder(receiver_account, network_passphrase)
                    .append_change_trust_op(asset=custom_asset)
                    .set_timeout(30)
                    .build()
                )
                trust_tx.sign(receiver_keypair)
                server.submit_transaction(trust_tx)
                print(f"[StellarService] Trustline criada com sucesso para {destination_pub}")

        # Realizar o pagamento customizado
        distributor_account = server.load_account(distributor_pub)
        custom_asset = Asset(code, self.config.issuer_public_key)

        tx = (
            TransactionBuilder(distributor_account, network_passphrase)
            .append_payment_op(
                destination=destination_pub,
                asset=custom_asset,
                amount=f"{amount:.6f}",
            )
        )
        if memo:
            tx = tx.add_text_memo(memo[:28])

        built_tx = tx.set_timeout(30).build()
        built_tx.sign(distributor_keypair)

        response = server.submit_transaction(built_tx)

        return {
            "success": True,
            "mode": "stellar_testnet",
            "network": self.config.network,
            "hash": response["hash"],
            "ledger": response["ledger"],
            "asset_code": code,
            "amount": amount,
            "from_account": distributor_pub,
            "to_account": destination_pub,
            "memo": memo,
            "temporary_receiver_secret": receiver_keypair.secret() if receiver_keypair else None,
        }
