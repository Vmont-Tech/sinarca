from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Boolean
)

from datetime import datetime

from backend.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    document_type = Column(String(100), nullable=False)

    filename = Column(String(255), nullable=False)

    s3_url = Column(String, nullable=False)

    backup_url = Column(String)

    sha256_hash = Column(String(255), nullable=False)

    encrypted = Column(Boolean, default=True)

    uploaded_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )