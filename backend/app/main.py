"""FastAPI application exposing the research workflow to the web frontend."""

from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app import __version__
from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.research import ResearchService


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

    app.include_router(api_router)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {"name": "ResearchPilot API", "version": __version__, "health": "/api/health"}

    return app


app = create_app()
