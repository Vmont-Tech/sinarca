from __future__ import annotations

from fastapi import APIRouter

from backend_app.modules.audit.routes import router as audit_router
from backend_app.modules.auth.routes import router as auth_router
from backend_app.modules.certifier.routes import router as certifier_router
from backend_app.modules.inventory.routes import router as inventory_router
from backend_app.modules.marketplace.routes import router as marketplace_router
from backend_app.modules.projects.routes import router as projects_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(certifier_router)
api_router.include_router(audit_router)
api_router.include_router(marketplace_router)
api_router.include_router(inventory_router)
