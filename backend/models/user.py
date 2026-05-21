from sqlalchemy import Column, Integer, String, Enum, Boolean, DateTime
from enum import Enum as PyEnum
from datetime import datetime

from backend.core.database import Base


class UserType(PyEnum):
    PRODUCER = "PRODUCER"
    CERTIFIER = "CERTIFIER"
    AUDITOR = "AUDITOR"
    BUYER = "BUYER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)

    nome = Column(String(255), nullable=False)

    email = Column(String(255), nullable=False, unique=True)

    senha_hash = Column(String(255), nullable=False)

    tipo_usuario = Column(Enum(UserType), nullable=False)

    endereco = Column(String(255))

    telefone = Column(String(20))

    data_cadastro = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow
    )

    ativo = Column(Boolean, nullable=False, default=True)