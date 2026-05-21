from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Producer(Base):
    __tablename__ = "producers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User")