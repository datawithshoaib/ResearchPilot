from typing import Annotated

from fastapi import APIRouter, Depends

from app import __version__
from app.api.deps import get_service
from app.core.config import get_settings
from app.schemas.health import HealthResponse
from app.services.research import ResearchService

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(service: Annotated[ResearchService, Depends(get_service)]) -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version=__version__,
        configured=settings.is_configured,
        missing=settings.missing_keys,
        model=settings.groq_model,
        active_jobs=service.active_count,
    )
