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


class CreditStatus(PyEnum):
    AVAILABLE = "AVAILABLE"
    IN_NEGOTIATION = "IN_NEGOTIATION"
    RETIRED = "RETIRED"


class EnvironmentalCredit(Base):
    __tablename__ = "environmental_credits"

    id = Column(Integer, primary_key=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )

    quantidade = Column(Numeric(18, 8), nullable=False)

    unidade = Column(String(10), nullable=False, default="tCO2e")

    data_emissao = Column(DateTime(timezone=True), nullable=False)

    hash_transacao_mint = Column(String(64), nullable=False, unique=True)

    status_token = Column(
        Enum(CreditStatus),
        nullable=False,
        default=CreditStatus.AVAILABLE
    )

    data_aposentadoria = Column(DateTime(timezone=True))

    hash_transacao_burn = Column(String(64), unique=True)