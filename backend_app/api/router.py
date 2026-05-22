from __future__ import annotations

from fastapi import APIRouter

from backend_app.modules.auth.routes import router as auth_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
