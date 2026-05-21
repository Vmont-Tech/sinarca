from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from backend.core.database import Base


class ProjectTimeline(Base):
    __tablename__ = "project_timeline"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    event = Column(String(255), nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
