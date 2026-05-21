from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime

from backend.core.database import Base


class NfcTag(Base):
    __tablename__ = "nfc_tags"

    id = Column(Integer, primary_key=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )

    uid_nfc = Column(String(32), nullable=False, unique=True)

    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)

    data_instalacao = Column(DateTime(timezone=True), nullable=False)

    chave_mestra_hash = Column(String(255), nullable=False)