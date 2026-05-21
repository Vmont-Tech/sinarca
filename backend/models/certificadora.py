from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Certifier(Base):
    __tablename__ = "certifiers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    registro_licenca = Column(String(50), unique=True, nullable=False)

    user = relationship("User")