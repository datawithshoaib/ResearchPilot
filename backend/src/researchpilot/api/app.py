"""FastAPI application exposing the research workflow to the web frontend."""

from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from researchpilot import __version__
from researchpilot.api.routes import health, research
from researchpilot.core.config import get_settings
from researchpilot.core.logging import configure_logging
from researchpilot.services.research import ResearchService


def create_app(service: ResearchService | None = None) -> FastAPI:
    settings = get_settings()
    configure_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.research_service = service or ResearchService(
            max_active_jobs=settings.max_active_jobs,
            job_ttl=timedelta(minutes=settings.job_ttl_minutes),
            max_concurrency=settings.graph_max_concurrency,
        )
        yield
        await app.state.research_service.shutdown()

    is_production = settings.environment == "production"
    app = FastAPI(
        title="ResearchPilot API",
        description="Multi-agent research workflow powered by LangGraph.",
        version=__version__,
        lifespan=lifespan,
        # Keep interactive docs out of production unless explicitly wanted.
        docs_url=None if is_production else "/docs",
        redoc_url=None,
        openapi_url=None if is_production else "/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    # SSE responses are excluded from gzip by Starlette, so streaming is unaffected.
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    api = APIRouter(prefix="/api")
    api.include_router(health.router)
    api.include_router(research.router)
    app.include_router(api)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {"name": "ResearchPilot API", "version": __version__, "health": "/api/health"}

    return app


app = create_app()


def run() -> None:
    import os

    import uvicorn

    uvicorn.run(
        "researchpilot.api.app:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        reload=get_settings().environment == "development",
    )
