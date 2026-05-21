from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Date,
    String,
    Numeric,
    Boolean
)

from backend.core.database import Base


class SatelliteData(Base):
    __tablename__ = "satellite_data"

    id = Column(Integer, primary_key=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )

    date_imagem = Column(Date, nullable=False)

    url_imagem_bruta = Column(String)

    ndvi_medio = Column(Numeric(5, 4))

    hash_area_atual = Column(String(255))

    anomalia_detectada = Column(Boolean, default=False)

    detalhes_anomalia = Column(String)