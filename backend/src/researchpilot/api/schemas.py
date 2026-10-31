"""Request and response models for the HTTP API."""

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from researchpilot.models import Analyst


class JobStatus(StrEnum):
    QUEUED = "queued"
    GENERATING_ANALYSTS = "generating_analysts"
    AWAITING_FEEDBACK = "awaiting_feedback"
    RESEARCHING = "researching"
    WRITING_REPORT = "writing_report"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

    @property
    def is_terminal(self) -> bool:
        return self in {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED}


class StartResearchRequest(BaseModel):
    topic: str = Field(min_length=8, max_length=2000)
    max_analysts: int = Field(default=3, ge=1, le=6)
    max_num_turns: int = Field(default=2, ge=1, le=4)


class ResumeResearchRequest(BaseModel):
    feedback: str | None = Field(default=None, max_length=4000)


class HealthResponse(BaseModel):
    status: str
    version: str
    configured: bool
    missing: list[str]
    model: str
    active_jobs: int


class Source(BaseModel):
    url: str
    title: str


class ActivityEvent(BaseModel):
    id: int
    kind: str
    analyst: str | None = None
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    at: datetime


class AnalystProgress(BaseModel):
    name: str
    questions: int = 0
    searches: int = 0
    sources: int = 0
    section_title: str | None = None
    done: bool = False


class ResearchJob(BaseModel):
    thread_id: str
    status: JobStatus
    topic: str
    max_analysts: int
    max_num_turns: int
    analysts: list[Analyst] = Field(default_factory=list)
    progress: list[AnalystProgress] = Field(default_factory=list)
    activity: list[ActivityEvent] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    sections_count: int = 0
    total_sections: int = 0
    final_report: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
