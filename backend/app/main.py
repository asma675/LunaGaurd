"""
LunaGuard FastAPI application entry point.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import ai, auth, mission, routes, terrain, voice
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.terrain_service import get_terrain

logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    """Factory function that builds and configures the FastAPI application."""
    settings = get_settings()

    # Configure logging before anything else
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        # Startup: pre-load terrain so first request is fast
        logger.info("lunaguard.startup", env=settings.lunaguard_env)
        try:
            grid = get_terrain()
            logger.info(
                "terrain.loaded",
                rows=grid.metadata.grid_rows,
                cols=grid.metadata.grid_cols,
                synthetic=grid.metadata.is_synthetic,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("terrain.load_failed", error=str(exc))
            raise
        yield
        # Shutdown
        logger.info("lunaguard.shutdown")

    application = FastAPI(
        title="LunaGuard API",
        description=(
            "Explainable lunar rover mission planning, emergency recovery, digital-twin "
            "simulation, and IBM watsonx.ai mission intelligence."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        license_info={
            "name": "MIT",
            "url": "https://opensource.org/licenses/MIT",
        },
        contact={
            "name": "LunaGuard Contributors",
            "url": "https://github.com/lunaguard/lunaguard",
        },
        lifespan=lifespan,
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    application.include_router(terrain.router)
    application.include_router(auth.router)
    application.include_router(ai.router)
    application.include_router(voice.router)
    application.include_router(routes.router)
    application.include_router(mission.router)

    return application


app = create_app()


# ---------------------------------------------------------------------------
# Health endpoint (no auth required)
# ---------------------------------------------------------------------------


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Health probe used by Docker HEALTHCHECK and load balancers."""
    return {
        "status": "healthy",
        "service": "lunaguard-backend",
        "version": "1.0.0",
    }
