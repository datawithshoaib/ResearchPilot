"""Response model for the health endpoint."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    configured: bool
    missing: list[str]
    model: str
    active_jobs: int
