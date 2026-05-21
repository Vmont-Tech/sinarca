from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db

from backend.models.credit_transaction import (
    CreditTransaction,
    TransactionType
)

from backend.models.environmental_credit import (
    EnvironmentalCredit,
    CreditStatus
)

router = APIRouter(
    prefix="/marketplace",
    tags=["Marketplace"]
)


@router.get("")
async def listar_creditos(db: Session = Depends(get_db)):
    credits = db.query(EnvironmentalCredit).filter(
        EnvironmentalCredit.status_token == CreditStatus.AVAILABLE
    ).all()

    return {
        "success": True,
        "credits": credits
    }


@router.post("/buy")
async def comprar_credito(
    credit_id: int,
    buyer_id: int,
    quantidade: float,
    db: Session = Depends(get_db)
):
    credit = db.query(EnvironmentalCredit).filter(
        EnvironmentalCredit.id == credit_id
    ).first()

    if not credit:
        raise HTTPException(404, "Crédito não encontrado")

    transaction = CreditTransaction(
        credit_id=credit.id,
        buyer_id=buyer_id,
        seller_id=1,
        quantidade=quantidade,
        valor_unitario=100,
        data_transacao=datetime.utcnow(),
        hash_transacao_stellar="pending",
        tipo_transacao=TransactionType.PURCHASE
    )

    credit.status_token = CreditStatus.IN_NEGOTIATION

    db.add(transaction)

    db.commit()

    return {
        "success": True,
        "message": "Compra realizada"
    }