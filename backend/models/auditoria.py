from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    String,
    Numeric,
    DateTime,
    Enum
)

from sqlalchemy.dialects.postgresql import JSONB
from enum import Enum as PyEnum

from backend.core.database import Base


class AuditStatus(PyEnum):
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"
    RECALCULATED = "RECALCULATED"


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )

    auditor_id = Column(
        Integer,
        ForeignKey("auditors.id", ondelete="CASCADE"),
        nullable=False
    )

    data_auditoria = Column(DateTime(timezone=True), nullable=False)

    latitude_auditoria = Column(Numeric(9, 6), nullable=False)
    longitude_auditoria = Column(Numeric(9, 6), nullable=False)

    laudo_texto = Column(String, nullable=False)

    evidencias_url = Column(JSONB)

    status_projeto_pos_auditoria = Column(
        Enum(AuditStatus),
        nullable=False
    )

    assinatura_digital = Column(String, nullable=False)