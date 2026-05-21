from fastapi import APIRouter, HTTPException, Depends, status
from jose import jwt, JWTError
from brutils import is_valid_email
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from backend.core.database import get_db
from backend.core.jwt import create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.refresh_token import RefreshToken
from backend.models.schemas import LoginRequest, RegisterRequest, ChangePasswordRequest
from backend.models.return_schemas import LoginAndRegister, Status, Refresh

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

@router.post(
    "/login", status_code=status.HTTP_201_CREATED,
    response_model=LoginAndRegister,
    summary="Login do usuário",
    description="Realiza o login do usuário e retorna os tokens de acesso e refresh"
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    dado = data.dadoLogin.strip()

    if is_valid_email(dado):
        user = db.query(User).filter(User.email == dado).first()
    else:
        user = db.query(User).filter(User.username == dado).first()

    if not user or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas"
        )

    payload = {
        "sub": str(user.id),
        "role": user.role
    }

    access_token = create_access_token(payload)
    refresh_token = create_refresh_token({"sub": str(user.id)})

    try:
        db.add(RefreshToken(token=refresh_token, user_id=user.id))
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Erro ao gerar tokens")

    return LoginAndRegister(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post(
    "/refresh", status_code=status.HTTP_200_OK,
    response_model=Refresh,
    summary="Refresh do token de acesso",
    description="Gera um novo token de acesso usando o refresh token fornecido"
)
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    token_db = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == refresh_token)
        .first()
    )

    if not token_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido"
        )

    try:
        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401)

        user_id = payload.get("sub")

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "Usuário não encontrado")

    new_access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

    return Refresh(
        access_token=new_access_token,
        token_type="bearer"
    )

@router.post(
    "/register", status_code=status.HTTP_201_CREATED,
    response_model=LoginAndRegister,
    summary="Registrar novo usuário",
    description="Registra um novo usuário como aluno"
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Usuário já existe"
        )
        
    if not is_valid_email(data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email inválido"
        )
        
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email já cadastrado"
        )

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=pwd_context.hash(data.password),
        role="usuario",
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(500, "Erro ao criar usuário")

    payload = {
        "sub": str(user.id),
        "role": user.role
    }

    access_token = create_access_token(payload)
    refresh_token = create_refresh_token({"sub": str(user.id)})

    try:
        db.add(RefreshToken(token=refresh_token, user_id=user.id))
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Erro ao gerar tokens")

    return LoginAndRegister(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )
    
@router.post(
    "/change-password", status_code=status.HTTP_200_OK,
    response_model=Status,
    summary="Alterar senha do usuário",
    description="Altera a senha do usuário autenticado"
)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()

    user.hashed_password = pwd_context.hash(data.new_password)

    db.commit()

    return Status(status="senha atualizada")

@router.post(
    "/logout", status_code=status.HTTP_200_OK,
    response_model=Status,
    summary="Logout do usuário",
    description="Realiza o logout do usuário, invalidando o refresh token fornecido"
)
def logout(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == refresh_token)
        .first()
    )

    if token:
        db.delete(token)
        db.commit()

    return Status(status="Logout realizado")

if __name__ == '__main__':
    pass