"""Request and response models for the HTTP API."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from researchpilot.models import Analyst


class JobStatus(str, Enum):
    QUEUED = "queued"
    GENERATING_ANALYSTS = "generating_analysts"
    AWAITING_FEEDBACK = "awaiting_feedback"
    RESEARCHING = "researching"
    COMPLETED = "completed"
    FAILED = "failed"


class StartResearchRequest(BaseModel):
    topic: str = Field(min_length=8, max_length=2000)
    max_analysts: int = Field(default=3, ge=1, le=6)
    max_num_turns: int = Field(default=2, ge=1, le=4)


class ResumeResearchRequest(BaseModel):
    feedback: str | None = Field(default=None, max_length=4000)


class HealthResponse(BaseModel):
    status: str
    configured: bool
    missing: list[str]


class ResearchJob(BaseModel):
    thread_id: str
    status: JobStatus
    topic: str
    max_analysts: int
    max_num_turns: int
    analysts: list[Analyst] = Field(default_factory=list)
    sections_count: int = 0
    total_sections: int = 0
    final_report: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
