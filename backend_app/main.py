from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend_app.api.health import router as health_router
from backend_app.api.router import api_router
from backend_app.core.config import Settings, get_settings
from backend_app.core.errors import register_exception_handlers
from backend_app.core.logging import configure_logging


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    application = FastAPI(
        title="Sinarca API",
        summary="API backend_app para autenticação, dados persistentes e integrações SINARCA",
        version="0.3.0-backend-app",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(application)
    application.include_router(health_router)
    application.include_router(api_router)
    return application


app = create_app()
