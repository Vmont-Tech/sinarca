import os

from dotenv import load_dotenv
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from backend.core import database
from backend.models.user import User
from backend.core.config import ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_ROLE, ADMIN_EMAIL

try:
    load_dotenv()
except ImportError:
    pass

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def criar_admin_se_nao_existir():
    db: Session = database.SessionLocal()   

    admin = db.query(User).filter(User.username == ADMIN_USERNAME).first()

    if not admin:
        admin = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            hashed_password=pwd_context.hash(ADMIN_PASSWORD),
            role=ADMIN_ROLE
        )
        db.add(admin)
        db.commit()
        print("✅ Usuário admin criado")
    else:
        print("ℹ️ Usuário admin já existe")

    db.close()