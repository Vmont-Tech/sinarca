import uuid


class BlockchainService:
    def mint_credit(self, project_id: int, quantity: float):
        transaction_hash = str(uuid.uuid4())

        return {
            "success": True,
            "transaction_hash": transaction_hash,
            "quantity": quantity
        }

    def transfer_credit(self, from_wallet: str, to_wallet: str):
        transaction_hash = str(uuid.uuid4())

        return {
            "success": True,
            "transaction_hash": transaction_hash
        }

    def burn_credit(self, token_id: int):
        transaction_hash = str(uuid.uuid4())

        return {
            "success": True,
            "burn_hash": transaction_hash,
            "token_id": token_id
        }