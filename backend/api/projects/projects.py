from datetime import date

from fastapi import APIRouter, status, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.project import Project, ProjectStatus

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


class CreateProjectRequest(BaseModel):
    nome: str
    descricao: str
    producer_id: int
    certifier_id: int
    area_hectares: float
    hash_area_inicial: str
    cerca_virtual_geojson: dict


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Listar projetos",
    description="Lista de projetos filtrada por status, bioma ou tipo."
)
async def listar_projetos(db: Session = Depends(get_db)):
    projetos = db.query(Project).all()

    return {
        "success": True,
        "total": len(projetos),
        "projects": [
            {
                "id": projeto.id,
                "nome": projeto.nome,
                "status": projeto.status.value,
                "area_hectares": float(projeto.area_hectares)
            }
            for projeto in projetos
        ]
    }


@router.get(
    "/{project_id}",
    status_code=status.HTTP_200_OK,
    summary="Detalhes do projeto",
    description="Detalhes completos de um projeto (incluindo timeline e docs)."
)
async def detalhes_projeto(
    project_id: int,
    db: Session = Depends(get_db)
):
    projeto = db.query(Project).filter(Project.id == project_id).first()

    if not projeto:
        raise HTTPException(
            status_code=404,
            detail="Projeto não encontrado"
        )

    return {
        "success": True,
        "project": {
            "id": projeto.id,
            "nome": projeto.nome,
            "descricao": projeto.descricao,
            "status": projeto.status.value,
            "area_hectares": float(projeto.area_hectares),
            "producer_id": projeto.producer_id,
            "certifier_id": projeto.certifier_id,
            "data_inicio": projeto.data_inicio,
            "data_fim_prevista": projeto.data_fim_prevista,
            "motivo_bloqueio": projeto.motivo_bloqueio
        }
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Criar projeto",
    description="Cria um novo projeto ambiental."
)
async def criar_projeto(
    payload: CreateProjectRequest,
    db: Session = Depends(get_db)
):
    projeto = Project(
        nome=payload.nome,
        descricao=payload.descricao,
        producer_id=payload.producer_id,
        certifier_id=payload.certifier_id,
        area_hectares=payload.area_hectares,
        status=ProjectStatus.CREATED,
        hash_area_inicial=payload.hash_area_inicial,
        cerca_virtual_geojson=payload.cerca_virtual_geojson,
        data_inicio=date.today()
    )

    db.add(projeto)
    db.commit()
    db.refresh(projeto)

    return {
        "success": True,
        "project": {
            "id": projeto.id,
            "nome": projeto.nome,
            "status": projeto.status.value,
            "created_at": projeto.data_inicio
        }
    }


@router.patch(
    "/{project_id}/block",
    status_code=status.HTTP_200_OK,
    summary="Bloquear projeto",
    description="Bloqueia um projeto ambiental"
)
async def bloquear_projeto(
    project_id: int,
    motivo: str,
    db: Session = Depends(get_db)
):
    projeto = db.query(Project).filter(Project.id == project_id).first()

    if not projeto:
        raise HTTPException(
            status_code=404,
            detail="Projeto não encontrado"
        )

    projeto.status = ProjectStatus.BLOCKED
    projeto.motivo_bloqueio = motivo

    db.commit()

    return {
        "success": True,
        "message": "Projeto bloqueado com sucesso"
    }