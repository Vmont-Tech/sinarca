from datetime import datetime

from fastapi import APIRouter, status, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.models.project import Project, ProjectStatus
from backend.models.audit import Audit, AuditStatus

router = APIRouter(
    prefix="/audit",
    tags=["Auditoria"]
)


class AuditStatusUpdateRequest(BaseModel):
    status: AuditStatus
    laudo_texto: str
    latitude: float
    longitude: float
    evidencias_url: list[str]
    assinatura_digital: str
    auditor_id: int


@router.get(
    "/queue",
    status_code=status.HTTP_200_OK,
    summary="Fila de projetos",
    description="Fila de projetos aguardando verificação"
)
async def fila_projetos(db: Session = Depends(get_db)):
    projetos = db.query(Project).filter(
        Project.status == ProjectStatus.ACTIVE
    ).all()

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


@router.patch(
    "/verify/{project_id}",
    status_code=status.HTTP_200_OK,
    summary="Atualização de status",
    description="Atualização de status após inspeção técnica."
)
async def atualizar_status(
    project_id: int,
    payload: AuditStatusUpdateRequest,
    db: Session = Depends(get_db)
):
    projeto = db.query(Project).filter(Project.id == project_id).first()

    if not projeto:
        raise HTTPException(
            status_code=404,
            detail="Projeto não encontrado"
        )

    auditoria = Audit(
        project_id=project_id,
        auditor_id=payload.auditor_id,
        data_auditoria=datetime.utcnow(),
        latitude_auditoria=payload.latitude,
        longitude_auditoria=payload.longitude,
        laudo_texto=payload.laudo_texto,
        evidencias_url=payload.evidencias_url,
        status_projeto_pos_auditoria=payload.status,
        assinatura_digital=payload.assinatura_digital
    )

    db.add(auditoria)

    if payload.status == AuditStatus.APPROVED:
        projeto.status = ProjectStatus.AUDITED

    elif payload.status == AuditStatus.BLOCKED:
        projeto.status = ProjectStatus.BLOCKED
        projeto.data_bloqueio = datetime.utcnow()
        projeto.motivo_bloqueio = payload.laudo_texto

    db.commit()
    db.refresh(auditoria)

    return {
        "success": True,
        "audit_id": auditoria.id,
        "project_id": projeto.id,
        "new_status": projeto.status.value,
        "audit_date": auditoria.data_auditoria
    }