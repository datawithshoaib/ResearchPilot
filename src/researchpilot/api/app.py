"""FastAPI application exposing the research workflow to the web frontend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from researchpilot.api.schemas import (
    HealthResponse,
    ResearchJob,
    ResumeResearchRequest,
    StartResearchRequest,
)
from researchpilot.api.service import (
    ResearchConflictError,
    ResearchNotFoundError,
    ResearchService,
)
from researchpilot.config import get_settings

settings = get_settings()
service = ResearchService()


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await service.shutdown()


app = FastAPI(
    title="ResearchPilot API",
    description="Multi-agent research workflow powered by LangGraph.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"name": "ResearchPilot API", "docs": "/docs"}


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    missing = [
        name
        for name, value in (
            ("GROQ_API_KEY", settings.groq_api_key),
            ("TAVILY_API_KEY", settings.tavily_api_key),
        )
        if not value
    ]
    return HealthResponse(
        status="ok",
        configured=settings.is_configured,
        missing=missing,
    )


@app.post(
    "/api/research",
    response_model=ResearchJob,
    status_code=status.HTTP_201_CREATED,
)
async def start_research(request: StartResearchRequest) -> ResearchJob:
    if not settings.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Missing GROQ_API_KEY and/or TAVILY_API_KEY. "
                "Add them to .env and restart the API."
            ),
        )
    return await service.start(request)


@app.get("/api/research/{thread_id}", response_model=ResearchJob)
async def get_research(thread_id: str) -> ResearchJob:
    try:
        return await service.get(thread_id)
    except ResearchNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found."
        ) from exc


@app.post("/api/research/{thread_id}/resume", response_model=ResearchJob)
async def resume_research(
    thread_id: str, request: ResumeResearchRequest | None = None
) -> ResearchJob:
    if not settings.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Missing GROQ_API_KEY and/or TAVILY_API_KEY. "
                "Add them to .env and restart the API."
            ),
        )

    feedback = request.feedback if request else None
    try:
        return await service.resume(thread_id, feedback)
    except ResearchNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found."
        ) from exc
    except ResearchConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


def run() -> None:
    import uvicorn

    uvicorn.run("researchpilot.api.app:app", host="127.0.0.1", port=8000, reload=True)
