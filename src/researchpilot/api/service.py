"""In-memory job service that drives the research graph and its human-in-the-loop pause."""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langgraph.types import Command

from researchpilot.api.schemas import JobStatus, ResearchJob, StartResearchRequest
from researchpilot.graph.research import build_graph
from researchpilot.models import Analyst


class ResearchNotFoundError(LookupError):
    """Raised when a job id is unknown."""


class ResearchConflictError(RuntimeError):
    """Raised when an action is invalid for the current job status."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class _Job:
    thread_id: str
    topic: str
    max_analysts: int
    max_num_turns: int
    status: JobStatus = JobStatus.QUEUED
    analysts: list[Analyst] = field(default_factory=list)
    sections: list[str] = field(default_factory=list)
    final_report: str | None = None
    error: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    task: asyncio.Task[None] | None = None


def _as_analysts(raw: Any) -> list[Analyst]:
    if not raw:
        return []
    return [
        item if isinstance(item, Analyst) else Analyst.model_validate(item)
        for item in raw
    ]


def _build_checkpointer() -> InMemorySaver:
    """Allow the checkpoint serializer to round-trip domain models."""

    serde = JsonPlusSerializer(
        allowed_msgpack_modules=[("researchpilot.models", "Analyst")]
    )
    return InMemorySaver(serde=serde)


class ResearchService:
    """Runs research jobs in the background and exposes their live state."""

    def __init__(self, graph: Any | None = None) -> None:
        self._graph = graph or build_graph(checkpointer=_build_checkpointer())
        self._jobs: dict[str, _Job] = {}

    async def start(self, request: StartResearchRequest) -> ResearchJob:
        job = _Job(
            thread_id=uuid.uuid4().hex,
            topic=request.topic,
            max_analysts=request.max_analysts,
            max_num_turns=request.max_num_turns,
        )
        self._jobs[job.thread_id] = job
        job.task = asyncio.create_task(self._run_initial(job))
        return self._to_response(job)

    async def resume(self, thread_id: str, feedback: str | None = None) -> ResearchJob:
        job = self._get_job(thread_id)

        if job.status is not JobStatus.AWAITING_FEEDBACK:
            raise ResearchConflictError(
                f"Job {thread_id} is '{job.status.value}', expected 'awaiting_feedback'."
            )
        if job.task is not None and not job.task.done():
            raise ResearchConflictError(f"Job {thread_id} is already running.")

        cleaned = (feedback or "").strip()
        job.status = (
            JobStatus.GENERATING_ANALYSTS if cleaned else JobStatus.RESEARCHING
        )
        job.error = None
        job.updated_at = _utcnow()
        job.task = asyncio.create_task(self._run_resume(job, cleaned))
        return self._to_response(job)

    async def get(self, thread_id: str) -> ResearchJob:
        job = self._get_job(thread_id)

        if job.status is JobStatus.FAILED:
            return self._to_response(job)

        task_running = job.task is not None and not job.task.done()

        if not task_running:
            await self._sync(job)
        elif job.status is JobStatus.RESEARCHING:
            await self._refresh_progress(job)

        return self._to_response(job)

    async def shutdown(self) -> None:
        pending = [
            job.task for job in self._jobs.values() if job.task and not job.task.done()
        ]
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

    async def _run_initial(self, job: _Job) -> None:
        job.status = JobStatus.GENERATING_ANALYSTS
        job.updated_at = _utcnow()
        try:
            await self._graph.ainvoke(
                {
                    "topic": job.topic,
                    "max_analysts": job.max_analysts,
                    "max_num_turns": job.max_num_turns,
                },
                self._config(job.thread_id),
            )
            await self._sync(job)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - surfaced to the client
            self._fail(job, exc)

    async def _run_resume(self, job: _Job, feedback: str) -> None:
        try:
            await self._graph.ainvoke(
                Command(resume=feedback), self._config(job.thread_id)
            )
            await self._sync(job)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - surfaced to the client
            self._fail(job, exc)

    async def _sync(self, job: _Job) -> None:
        snapshot = await self._graph.aget_state(self._config(job.thread_id))
        values = snapshot.values or {}

        job.analysts = _as_analysts(values.get("analysts"))
        job.sections = [str(section) for section in values.get("sections") or []]
        job.updated_at = _utcnow()

        if snapshot.next:
            if "human_feedback" in snapshot.next:
                job.status = JobStatus.AWAITING_FEEDBACK
            else:
                job.status = JobStatus.RESEARCHING
            job.final_report = None
        else:
            job.status = JobStatus.COMPLETED
            job.final_report = values.get("final_report") or None

    async def _refresh_progress(self, job: _Job) -> None:
        try:
            snapshot = await self._graph.aget_state(self._config(job.thread_id))
        except Exception:  # noqa: BLE001 - progress is best effort
            return
        values = snapshot.values or {}
        sections = values.get("sections") or []
        job.sections = [str(section) for section in sections]
        job.updated_at = _utcnow()

    def _fail(self, job: _Job, exc: Exception) -> None:
        job.status = JobStatus.FAILED
        job.error = str(exc) or exc.__class__.__name__
        job.updated_at = _utcnow()

    def _get_job(self, thread_id: str) -> _Job:
        try:
            return self._jobs[thread_id]
        except KeyError as exc:
            raise ResearchNotFoundError(thread_id) from exc

    @staticmethod
    def _config(thread_id: str) -> dict[str, dict[str, str]]:
        return {"configurable": {"thread_id": thread_id}}

    def _to_response(self, job: _Job) -> ResearchJob:
        return ResearchJob(
            thread_id=job.thread_id,
            status=job.status,
            topic=job.topic,
            max_analysts=job.max_analysts,
            max_num_turns=job.max_num_turns,
            analysts=list(job.analysts),
            sections_count=len(job.sections),
            total_sections=len(job.analysts),
            final_report=job.final_report,
            error=job.error,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
