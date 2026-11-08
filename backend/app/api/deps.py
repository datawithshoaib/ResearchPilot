"""FastAPI dependencies shared by the route modules."""

from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import AuthError, AuthUser, SupabaseTokenVerifier
from app.core.config import Settings, get_settings
from app.services.research import ResearchService

_bearer = HTTPBearer(auto_error=False)


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


def get_token_verifier(request: Request) -> SupabaseTokenVerifier:
    verifier: SupabaseTokenVerifier | None = request.app.state.token_verifier
    if verifier is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Sign-in is not configured on the server (missing SUPABASE_URL).",
        )
    return verifier


# A plain `def`: the first JWKS fetch is blocking, so FastAPI runs it in a worker thread.
def get_current_user(
    verifier: Annotated[SupabaseTokenVerifier, Depends(get_token_verifier)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    access_token: Annotated[
        str | None,
        Query(description="Only for EventSource streams, which cannot send headers."),
    ] = None,
) -> AuthUser:
    token = credentials.credentials if credentials else access_token
    if not token:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Please sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verifier.verify(token)
    except AuthError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, str(exc), headers={"WWW-Authenticate": "Bearer"}
        ) from exc


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
