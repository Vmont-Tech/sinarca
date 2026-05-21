from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    String,
    Numeric,
    DateTime,
    Enum
)

from enum import Enum as PyEnum

from backend.core.database import Base


class TransactionType(PyEnum):
    PURCHASE = "PURCHASE"
    SALE = "SALE"
    TRANSFER = "TRANSFER"
    RETIREMENT = "RETIREMENT"


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True)

    credit_id = Column(
        Integer,
        ForeignKey("environmental_credits.id", ondelete="CASCADE"),
        nullable=False
    )

    buyer_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    seller_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    quantidade = Column(Numeric(18, 8), nullable=False)

    valor_unitario = Column(Numeric(10, 2), nullable=False)

    moeda = Column(String(5), nullable=False, default="BRL")

    data_transacao = Column(DateTime(timezone=True), nullable=False)

    hash_transacao_stellar = Column(String(64), nullable=False, unique=True)

    tipo_transacao = Column(Enum(TransactionType), nullable=False)