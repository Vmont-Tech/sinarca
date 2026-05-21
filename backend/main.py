from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field

from backend.mock_data import (
    AUDITORS,
    CERTIFIERS,
    COMPANIES,
    INVENTORY,
    PROJECTS,
    TRANSACTIONS,
    USERS,
    clone,
    now_iso,
)
from backend.services.stellar_service import StellarService

API_PREFIX = "/api/v1"
PUBLIC_AUTH_ROLES = {"producer", "auditor", "company", "certifier"}
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "6"))
SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 60 * 60
ALLOW_DEMO_AUTH_FALLBACK = os.getenv("ALLOW_DEMO_AUTH_FALLBACK", "false").strip().lower() in {"1", "true", "yes", "on"}
MERCHANT_TRANSACTION_FEE_RATE = float(os.getenv("MERCHANT_TRANSACTION_FEE_RATE", "0.045"))
DEFAULT_CREDIT_UNIT_PRICE_BRL = 28.50
ISSUER_FUND_YIELD_RATE = float(os.getenv("ISSUER_FUND_YIELD_RATE", "0"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
ALLOWED_UPLOAD_CONTENT_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

stellar_service = StellarService()

ACTIVE_SESSIONS: dict[str, str] = {}


def _cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5680",
    )
    return [item.strip() for item in raw.split(",") if item.strip()]


app = FastAPI(
    title="Sinarca API",
    summary="API MVP integrada para alimentar frontend, fluxos de auditoria/certificação, marketplace e Stellar",
    version="0.2.0-integrated",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str | None = None
    dadoLogin: str | None = None
    password: str
    role: str | None = None


class RegisterRequest(BaseModel):
    name: str | None = None
    username: str | None = None
    email: EmailStr
    document: str | None = None
    password: str
    role: str = "company"


class InventoryDeclarationRequest(BaseModel):
    escopo_1: float = Field(ge=0)
    escopo_2: float = Field(ge=0)
    escopo_3: float = Field(ge=0)


class AuditStatusUpdateRequest(BaseModel):
    status: Literal["APPROVED", "BLOCKED", "RECALCULATED"]
    laudo_texto: str = ""
    latitude: float | None = None
    longitude: float | None = None
    evidencias_url: list[str] = []
    assinatura_digital: str = "demo-signature"
    auditor_id: str | int | None = None


class CertifierDecisionRequest(BaseModel):
    decision: Literal["APPROVE", "REJECT", "REQUEST_CHANGES"]
    certifier_id: str = "std-001"
    notes: str = ""


class BuyRequest(BaseModel):
    project_id: str
    buyer_id: str = "comp-001"
    quantidade: float = Field(gt=0)
    unit_price_brl: float = Field(default=DEFAULT_CREDIT_UNIT_PRICE_BRL, gt=0)


class CreditToUse(BaseModel):
    project_id: str
    amount: float = Field(gt=0)


class EmissionsData(BaseModel):
    scope1: float = 0
    scope2: float = 0
    scope3: float = 0
    total: float = Field(gt=0)


class CompensateRequest(BaseModel):
    buyer_id: str = "comp-001"
    emissions_data: EmissionsData
    credits_to_use: list[CreditToUse]


class RoleFlowRequest(BaseModel):
    role: Literal["certifier", "auditor", "company"]


def _ensure_demo_users() -> None:
    defaults = [
        {"id": "prod-001", "name": "Produtor Demo", "email": "produtor@sinarca.com.br", "document": "222.222.222-22", "role": "producer", "password": "produtor"},
        {"id": "comp-001", "name": "Banco Futuro", "email": "empresa@sinarca.com.br", "document": "33.333.333/0001-33", "role": "company", "password": "empresa"},
        {"id": "std-001", "name": "Certificadora Demo", "email": "certificadora@sinarca.com.br", "document": "44.444.444/0001-44", "role": "certifier", "password": "certificadora"},
    ]
    existing = {u["email"].lower() for u in USERS}
    for user in defaults:
        if user["email"].lower() not in existing:
            USERS.append(user)


_ensure_demo_users()


def _find_project(project_id: str) -> dict[str, Any] | None:
    return next((p for p in PROJECTS if p["id"] == project_id or p["friendlyId"] == project_id), None)


def _project_to_queue_item(project: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": project["id"],
        "friendlyId": project["friendlyId"],
        "nome": project["name"],
        "name": project["name"],
        "status": project["status"],
        "area_hectares": project["metrics"]["totalAreaHa"],
        "carbonStock": project["metrics"]["carbonStock"],
        "location": project["location"],
        "auditor": project["entities"]["auditor"],
        "certifier": project["entities"].get("certifier"),
    }


def _validate_public_role(role: str | None) -> str:
    normalized = (role or "company").strip().lower()
    if normalized not in PUBLIC_AUTH_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role inválida para fluxo público. Admin deve ser provisionado fora do cadastro público.",
        )
    return normalized


def _session_expiration() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=SESSION_TTL_SECONDS)


def _auth_response(user: dict[str, Any]) -> dict[str, Any]:
    public_user = {k: v for k, v in user.items() if k != "password"}
    expires_at = _session_expiration()
    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[token] = user["id"]
    return {
        "token": token,
        "access_token": token,
        "refresh_token": secrets.token_urlsafe(32),
        "token_type": "bearer",
        "expires_in_seconds": SESSION_TTL_SECONDS,
        "expires_at": expires_at.isoformat(),
        "user": public_user,
    }


# (monetization breakdown removed, values computed directly inline when necessary)


def _flow_status() -> dict[str, Any]:
    certifier_pending = [p for p in PROJECTS if p["status"] in {"CREATED", "AUDITED"}]
    auditor_pending = [p for p in PROJECTS if p["status"] in {"CREATED", "AVAILABLE"}]
    available = [p for p in PROJECTS if p["status"] == "AVAILABLE"]
    return {
        "certifier_pending": len(certifier_pending),
        "auditor_pending": len(auditor_pending),
        "available_credits": len(available),
        "transactions": len(TRANSACTIONS),
        "roles": ["certifier", "auditor", "company"],
        "critical_path": ["certifier_review", "auditor_review", "company_purchase"],
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "sinarca-api", "version": "0.2.0-integrated"}


@app.post(f"{API_PREFIX}/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    login_value = (payload.email or payload.dadoLogin or "").strip().lower()
    user = next(
        (
            u
            for u in USERS
            if (u["email"].lower() == login_value or u.get("document", "").lower() == login_value)
            and u["password"] == payload.password
        ),
        None,
    )

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    return _auth_response(user)

class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    document: str | None = None
    organization: str | None = None
    phone: str | None = None
    avatar: str | None = None

@app.get(f"{API_PREFIX}/auth/me")
def get_me(authorization: str = Header(None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    token = authorization.split(" ")[1]
    user_id = ACTIVE_SESSIONS.get(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada")
    user = next((u for u in USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return {k: v for k, v in user.items() if k != "password"}

@app.patch(f"{API_PREFIX}/auth/me")
def update_me(payload: ProfileUpdate, authorization: str = Header(None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")
    token = authorization.split(" ")[1]
    user_id = ACTIVE_SESSIONS.get(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada")
    user = next((u for u in USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    
    if payload.name is not None: user["name"] = payload.name
    if payload.email is not None: user["email"] = payload.email
    if payload.document is not None: user["document"] = payload.document
    if payload.organization is not None: user["organization"] = payload.organization
    if payload.phone is not None: user["phone"] = payload.phone
    if payload.avatar is not None: user["avatar"] = payload.avatar
    
    return {k: v for k, v in user.items() if k != "password"}


@app.post(f"{API_PREFIX}/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> dict[str, Any]:
    if any(u["email"].lower() == payload.email.lower() for u in USERS):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

    role = _validate_public_role(payload.role)
    user = {
        "id": f"user-{len(USERS) + 1:03d}",
        "name": payload.name or payload.username or payload.email.split("@")[0],
        "email": payload.email,
        "document": payload.document or "",
        "role": role,
        "password": payload.password,
    }
    USERS.append(user)
    return _auth_response(user)


@app.get(f"{API_PREFIX}/workflow/status")
def workflow_status() -> dict[str, Any]:
    return {"success": True, "workflow": _flow_status(), "stellar": stellar_service.status()}


@app.get(f"{API_PREFIX}/projects")
def list_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    state: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
) -> dict[str, Any]:
    data = clone(PROJECTS)
    if status_filter and status_filter.lower() != "all":
        data = [p for p in data if p["status"].lower() == status_filter.lower()]
    if state and state.lower() != "all":
        normalized_state = state.lower()
        data = [
            p
            for p in data
            if p["location"]["state"].lower() == normalized_state or p["location"].get("stateId", "").lower() == normalized_state
        ]
    data.sort(key=lambda p: p["blockchain"]["timestamp"], reverse=True)
    return {"success": True, "total": len(data[:limit]), "projects": data[:limit]}


@app.get(f"{API_PREFIX}/projects/{{project_id}}")
def get_project(project_id: str) -> dict[str, Any]:
    project = _find_project(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")
    return {"success": True, "project": clone(project)}


@app.get(f"{API_PREFIX}/certifiers")
def list_certifiers() -> dict[str, Any]:
    return {"success": True, "certifiers": clone(CERTIFIERS)}


@app.get(f"{API_PREFIX}/auditors")
def list_auditors() -> dict[str, Any]:
    return {"success": True, "auditors": clone(AUDITORS)}


@app.get(f"{API_PREFIX}/companies")
def list_companies() -> dict[str, Any]:
    return {"success": True, "companies": clone(COMPANIES)}


@app.get(f"{API_PREFIX}/inventory")
def get_inventory() -> dict[str, Any]:
    return {"success": True, "inventory": clone(INVENTORY)}


@app.post(f"{API_PREFIX}/inventory/declare", status_code=status.HTTP_201_CREATED)
def declare_inventory(payload: InventoryDeclarationRequest) -> dict[str, Any]:
    total = payload.escopo_1 + payload.escopo_2 + payload.escopo_3
    return {
        "success": True,
        "total_emissoes": total,
        "status": "DECLARED",
        "recommended_offset_tco2e": total,
        "created_at": now_iso(),
    }


@app.post(f"{API_PREFIX}/inventory/upload", status_code=status.HTTP_201_CREATED)
async def upload_inventory_document(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Tipo de arquivo não permitido")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")
    return {
        "success": True,
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "status": "UPLOADED",
        "uploaded_at": now_iso(),
    }


@app.get(f"{API_PREFIX}/audit/queue")
def audit_queue() -> dict[str, Any]:
    queue = [_project_to_queue_item(p) for p in PROJECTS if p["status"] in {"CREATED", "AUDITED", "AVAILABLE"}]
    return {"success": True, "total": len(queue), "projects": queue}


@app.patch(f"{API_PREFIX}/audit/verify/{{project_id}}")
def verify_project(project_id: str, payload: AuditStatusUpdateRequest) -> dict[str, Any]:
    project = _find_project(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")

    if payload.status == "APPROVED":
        project["status"] = "AVAILABLE"
        timeline_status = "completed"
        title = "Auditoria em campo aprovada"
    elif payload.status == "BLOCKED":
        project["status"] = "SUSPENDED"
        timeline_status = "active"
        title = "Projeto bloqueado"
    else:
        project["status"] = "CREATED"
        timeline_status = "active"
        title = "Recalculo solicitado"

    project.setdefault("timeline", []).append(
        {
            "title": title,
            "date": now_iso(),
            "status": timeline_status,
            "desc": payload.laudo_texto or "Atualização registrada pela API.",
            "auditor_id": payload.auditor_id,
        }
    )
    return {"success": True, "project_id": project["id"], "new_status": project["status"], "audit_date": now_iso()}


@app.get(f"{API_PREFIX}/certifier/queue")
def certifier_queue() -> dict[str, Any]:
    queue = [_project_to_queue_item(p) for p in PROJECTS if p["status"] in {"CREATED", "AUDITED"}]
    return {"success": True, "total": len(queue), "projects": queue}


@app.patch(f"{API_PREFIX}/certifier/projects/{{project_id}}/decision")
def certifier_decision(project_id: str, payload: CertifierDecisionRequest) -> dict[str, Any]:
    project = _find_project(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")

    if payload.decision == "APPROVE":
        project["status"] = "AUDITED"
        title = "Certificação aprovada - Aguardando Auditoria"
        timeline_status = "completed"
    elif payload.decision == "REJECT":
        project["status"] = "SUSPENDED"
        title = "Certificação rejeitada"
        timeline_status = "active"
    else:
        project["status"] = "CREATED"
        title = "Ajustes solicitados pela certificadora"
        timeline_status = "active"

    project.setdefault("timeline", []).append(
        {
            "title": title,
            "date": now_iso(),
            "status": timeline_status,
            "desc": payload.notes or "Decisão registrada pela certificadora.",
            "certifier_id": payload.certifier_id,
        }
    )
    return {"success": True, "project_id": project["id"], "new_status": project["status"], "decision": payload.decision}


@app.get(f"{API_PREFIX}/marketplace")
def marketplace() -> dict[str, Any]:
    available = [clone(p) for p in PROJECTS if p["status"] == "AVAILABLE"]
    return {
        "success": True,
        "credits": available,
        "total": len(available),
    }


# Removed old monetization config


@app.get(f"{API_PREFIX}/stellar/status")
def stellar_status() -> dict[str, Any]:
    return {"success": True, "stellar": stellar_service.status()}


@app.post(f"{API_PREFIX}/marketplace/buy")
def buy_credit(payload: BuyRequest) -> dict[str, Any]:
    project = _find_project(payload.project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")
    if payload.quantidade > project["metrics"]["carbonStock"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantidade maior que o estoque disponível")

    total_value_brl = round(payload.quantidade * payload.unit_price_brl, 2)
    
    stellar_tx = stellar_service.transfer_credit(
        amount=payload.quantidade,
        from_account=project["entities"]["developer"]["id"],
        to_account=payload.buyer_id,
        memo=f"{project['friendlyId']}:{payload.quantidade}",
        asset_code=os.getenv("STELLAR_ASSET_CODE", "SINARCA"),
    )

    tx = {
        "id": f"tx-{len(TRANSACTIONS) + 1:05d}",
        "project_id": project["id"],
        "buyer_id": payload.buyer_id,
        "seller_id": project["entities"]["developer"]["id"],
        "quantidade": payload.quantidade,
        "totalValue": total_value_brl,
        "unit": "tCO2e",
        "hash_transacao_stellar": stellar_tx["hash"],
        "stellar_network": stellar_tx["network"],
        "stellar_mode": stellar_tx["mode"],
        "tipo_transacao": "PURCHASE",
        "created_at": now_iso(),
    }
    TRANSACTIONS.append(tx)
    project["metrics"]["carbonStock"] = round(project["metrics"]["carbonStock"] - payload.quantidade, 6)
    return {"success": True, "message": "Compra registrada", "transaction": tx}


@app.post(f"{API_PREFIX}/marketplace/compensate")
def compensate_credit(payload: CompensateRequest) -> dict[str, Any]:
    # 1. Validar disponibilidade
    total_credits_to_use = 0
    burn_transactions = []
    
    for credit in payload.credits_to_use:
        project = _find_project(credit.project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Projeto {credit.project_id} não encontrado")
        
        # Como o backend em memória não trackeia saldos de comprador com precisão de contas por enquanto, 
        # assumiremos que o saldo existe se a compensação estiver sendo feita.
        total_credits_to_use += credit.amount
        
        # Burn no Stellar (simulado para MVP)
        stellar_tx = stellar_service.burn_credit(
            amount=credit.amount,
            from_account=payload.buyer_id,
            memo=f"BURN:{project['friendlyId']}:{credit.amount}",
            asset_code=os.getenv("STELLAR_ASSET_CODE", "SINARCA"),
        )
        
        burn_transactions.append({
            "projectId": credit.project_id,
            "amount": credit.amount,
            "txHash": stellar_tx["hash"]
        })
        
        # Update metrics
        if "blockchain" not in project:
            project["blockchain"] = {}
        project["blockchain"]["totalTokensBurned"] = project["blockchain"].get("totalTokensBurned", 0) + credit.amount
    
    if total_credits_to_use < payload.emissions_data.total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Créditos insuficientes. Necessário: {payload.emissions_data.total}, Usado: {total_credits_to_use}"
        )
        
    certificate = {
        "id": f"cert-2026-{len(TRANSACTIONS) + 1:04d}",
        "emissionsCompensated": payload.emissions_data.total,
        "projectsSupported": len(payload.credits_to_use),
        "certificateUrl": f"https://sinarca.com.br/certificates/cert-2026-{len(TRANSACTIONS) + 1:04d}.pdf",
        "blockchainHash": burn_transactions[0]["txHash"] if burn_transactions else "N/A",
        "createdAt": now_iso()
    }
    
    # Adicionar transação de compensação no histórico
    tx = {
        "id": f"tx-{len(TRANSACTIONS) + 1:05d}",
        "buyer_id": payload.buyer_id,
        "quantidade": total_credits_to_use,
        "unit": "tCO2e",
        "tipo_transacao": "BURN_COMPENSATE",
        "burn_transactions": burn_transactions,
        "certificate": certificate,
        "created_at": now_iso(),
    }
    TRANSACTIONS.append(tx)
    
    return {
        "success": True,
        "message": "Compensação realizada com sucesso",
        "certificate": certificate
    }


@app.get(f"{API_PREFIX}/transactions")
def list_transactions() -> dict[str, Any]:
    return {"success": True, "transactions": clone(TRANSACTIONS)}


FRONTEND_DIST_DIR = os.getenv("FRONTEND_DIST_DIR")
if FRONTEND_DIST_DIR and os.path.isdir(FRONTEND_DIST_DIR):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path in {"health", "docs", "redoc", "openapi.json"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        requested_file = os.path.join(FRONTEND_DIST_DIR, full_path)
        if full_path and os.path.isfile(requested_file):
            return FileResponse(requested_file)
        return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))
