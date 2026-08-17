from __future__ import annotations

import contextlib
from collections.abc import AsyncIterator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend_app.api.health import router as health_router
from backend_app.api.router import api_router
from backend_app.core.config import Settings, get_settings
from backend_app.core.errors import register_exception_handlers
from backend_app.core.logging import configure_logging
from backend_app.modules.satellite.scheduler import register_satellite_jobs


@contextlib.asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    # Phase 05 / D-14: primeiro lifespan do repositorio. Inicia o
    # AsyncIOScheduler satelital no startup e o encerra no shutdown, para
    # nunca deixar job zumbi rodando apos o processo terminar.
    settings = get_settings()
    scheduler = AsyncIOScheduler()
    register_satellite_jobs(scheduler, settings)
    if settings.satellite_scheduler_enabled:
        scheduler.start()
    application.state.scheduler = scheduler
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    application = FastAPI(
        title="Sinarca API",
        summary="API backend_app para autenticação, dados persistentes e integrações SINARCA",
        version="0.3.0-backend-app",
        lifespan=lifespan,
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
