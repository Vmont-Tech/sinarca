from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Auditor(Base):
    __tablename__ = "auditors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    registro_profissional = Column(String(50), unique=True, nullable=False)
    chave_biometrica = Column(String, nullable=False)

    user = relationship("User")