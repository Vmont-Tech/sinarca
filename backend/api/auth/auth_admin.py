from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from brutils import is_valid_email
from passlib.context import CryptContext
from backend.core.jwt import create_access_token, create_refresh_token

from backend.models.refresh_token import RefreshToken
from backend.core.database import get_db
from backend.models.user import User
from backend.models.schemas import RegisterAdminRequest
from backend.core.security import require_role
from backend.models.return_schemas import LoginAndRegister
from backend.core.events import event_dispatcher

router = APIRouter(
    prefix="/auth-admin",
    tags=["Auth Admin"]
)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

@router.post(
    "/register", status_code=status.HTTP_201_CREATED,
    response_model=LoginAndRegister,
    summary="Registrar novo usuário",
    description="Registra um novo usuário",
    dependencies=[Depends(require_role("admin"))]
)
def register(data: RegisterAdminRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(409, "Usuário já existe")

    if not is_valid_email(data.email):
        raise HTTPException(409, "Email inválido")

    try:
        user = User(
            username=data.username,
            email=data.email,
            hashed_password=pwd_context.hash(data.password),
            role=data.role,
        )

        db.add(user)
        db.flush()

        event_dispatcher.dispatch("user_created", user, db)

        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(500, "Erro ao criar usuário")

    payload = {"sub": str(user.id), "role": user.role}

    access_token = create_access_token(payload)
    refresh_token = create_refresh_token({"sub": str(user.id)})

    db.add(RefreshToken(token=refresh_token, user_id=user.id))
    db.commit()

    return LoginAndRegister(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

if __name__ == '__main__':
    pass