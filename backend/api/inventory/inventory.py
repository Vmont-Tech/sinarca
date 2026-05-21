from fastapi import APIRouter, status, UploadFile, File
from pydantic import BaseModel

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory & Compliance"]
)


class InventoryDeclarationRequest(BaseModel):
    escopo_1: float
    escopo_2: float
    escopo_3: float


@router.post(
    "/declare",
    status_code=status.HTTP_201_CREATED,
    summary="Declaração de emissões",
    description="Submissão de dados de escopo 1, 2 e 3."
)
async def declare_submissao(payload: InventoryDeclarationRequest):
    total_emissoes = (
        payload.escopo_1 +
        payload.escopo_2 +
        payload.escopo_3
    )

    return {
        "success": True,
        "total_emissoes": total_emissoes,
        "status": "DECLARED"
    }


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload de documentos",
    description="Upload de documento comprobatório (PDF/DOCX)."
)
async def upload_docs(file: UploadFile = File(...)):
    return {
        "success": True,
        "filename": file.filename,
        "status": "UPLOADED"
    }