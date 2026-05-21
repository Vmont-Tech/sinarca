from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Numeric,
    Enum,
    Date,
    DateTime
)

from sqlalchemy.dialects.postgresql import JSONB
from enum import Enum as PyEnum

from backend.core.database import Base


class ProjectStatus(PyEnum):
    CREATED = "CREATED"
    ACTIVE = "ACTIVE"
    BLOCKED = "BLOCKED"
    AUDITED = "AUDITED"
    FINALIZED = "FINALIZED"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)

    nome = Column(String(255), nullable=False)
    descricao = Column(String)

    producer_id = Column(Integer, ForeignKey("producers.id", ondelete="CASCADE"), nullable=False)
    certifier_id = Column(Integer, ForeignKey("certifiers.id", ondelete="CASCADE"), nullable=False)

    motivo_bloqueio = Column(String)