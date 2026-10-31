"""FastAPI dependencies shared by the route modules."""

from fastapi import HTTPException, Request, status

from researchpilot.core.config import Settings, get_settings
from researchpilot.services.research import ResearchService


def get_service(request: Request) -> ResearchService:
    return request.app.state.research_service


def require_configured() -> Settings:
    settings = get_settings()
    if not settings.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The API is missing {' and '.join(settings.missing_keys)}. Set them and restart.",
        )
    return settings
