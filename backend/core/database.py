import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

try:
    load_dotenv()
except ImportError:
    pass

engine = None
SessionLocal = None

Base = declarative_base()

def init_db():
    global engine, SessionLocal

    DATABASE_URL = os.getenv("DATABASE_URL")

    if not DATABASE_URL:
        raise RuntimeError("❌ DATABASE_URL não definida")

    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )

    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine
    )


def get_db():
    if SessionLocal is None:
        raise RuntimeError("❌ Banco de dados não inicializado")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from sqlalchemy import text

def create_tables():
    if engine is None:
        raise RuntimeError("❌ Banco não inicializado")

    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    Base.metadata.create_all(bind=engine)

if __name__ == '__main__':
    pass