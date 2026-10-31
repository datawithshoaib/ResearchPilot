"""In-memory job service that drives the research graph and its human-in-the-loop pause."""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langgraph.types import Command

from app.graph.models import Analyst
from app.graph.workflows.research import build_graph
from app.schemas.research import (
    ActivityEvent,
    AnalystProgress,
    JobStatus,
    ResearchJob,
    Source,
    StartResearchRequest,
)

logger = logging.getLogger(__name__)

MAX_ACTIVITY_EVENTS = 300
MAX_ERROR_LENGTH = 600
WRITING_MESSAGES = {
    "body": "Synthesizing insights across every interview",
    "introduction": "Writing the introduction",
    "conclusion": "Writing the conclusion",
}


def _friendly_error(exc: Exception) -> str:
    """Turn provider exceptions into something a user can act on."""

    text = str(exc) or exc.__class__.__name__
    lowered = text.lower()
    if "rate limit" in lowered or "429" in lowered or "ratelimit" in exc.__class__.__name__.lower():
        return (
            "The model provider's rate limit was reached (tokens per minute). "
            "Wait a minute and try again, or use fewer analysts or a quicker depth."
        )
    if "401" in lowered or "invalid api key" in lowered or "unauthorized" in lowered:
        return "A provider rejected the API key. Check GROQ_API_KEY and TAVILY_API_KEY on the server."
    return text[:MAX_ERROR_LENGTH]


class ResearchNotFoundError(LookupError):
    """Raised when a job id is unknown."""


class ResearchConflictError(RuntimeError):
    """Raised when an action is invalid for the current job status."""


class ResearchCapacityError(RuntimeError):
    """Raised when too many jobs are already running."""


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass
class _Job:
    thread_id: str
    topic: str
    max_analysts: int
    max_num_turns: int
    status: JobStatus = JobStatus.QUEUED
    analysts: list[Analyst] = field(default_factory=list)
    progress: dict[str, AnalystProgress] = field(default_factory=dict)
    activity: list[ActivityEvent] = field(default_factory=list)
    sources: dict[str, Source] = field(default_factory=dict)
    sections_count: int = 0
    final_report: str | None = None
    error: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    task: asyncio.Task[None] | None = None
    # Replaced on every change; watchers wait on the instance they captured.
    signal: asyncio.Event = field(default_factory=asyncio.Event)
    next_event_id: int = 1

    @property
    def running(self) -> bool:
        return self.task is not None and not self.task.done()


def _as_analysts(raw: Any) -> list[Analyst]:
    if not raw:
        return []
    return [item if isinstance(item, Analyst) else Analyst.model_validate(item) for item in raw]


def _build_checkpointer() -> InMemorySaver:
    """Allow the checkpoint serializer to round-trip domain models."""

    serde = JsonPlusSerializer(allowed_msgpack_modules=[("app.graph.models", "Analyst")])
    return InMemorySaver(serde=serde)


class ResearchService:
    """Runs research jobs in the background and exposes their live state."""

    def __init__(
        self,
        graph: Any | None = None,
        *,
        max_active_jobs: int = 4,
        job_ttl: timedelta = timedelta(hours=3),
        max_concurrency: int | None = None,
    ) -> None:
        self._graph = graph or build_graph(checkpointer=_build_checkpointer())
        self._jobs: dict[str, _Job] = {}
        self._max_active_jobs = max_active_jobs
        self._job_ttl = job_ttl
        self._max_concurrency = max_concurrency

    @property
    def active_count(self) -> int:
        return sum(1 for job in self._jobs.values() if job.running)

    # ------------------------------------------------------------------ actions

    async def start(self, request: StartResearchRequest) -> ResearchJob:
        self._purge_expired()
        self._ensure_capacity()

        job = _Job(
            thread_id=uuid.uuid4().hex,
            topic=request.topic,
            max_analysts=request.max_analysts,
            max_num_turns=request.max_num_turns,
        )
        self._jobs[job.thread_id] = job
        self._record(job, "status", "Mission started — assembling an analyst panel")
        job.status = JobStatus.GENERATING_ANALYSTS
        job.task = asyncio.create_task(
            self._run(
                job,
                {
                    "topic": job.topic,
                    "max_analysts": job.max_analysts,
                    "max_num_turns": job.max_num_turns,
                },
            )
        )
        logger.info("Started job %s (%d analysts)", job.thread_id, job.max_analysts)
        return self._to_response(job)

    async def resume(self, thread_id: str, feedback: str | None = None) -> ResearchJob:
        job = self._get_job(thread_id)

        if job.status is not JobStatus.AWAITING_FEEDBACK:
            raise ResearchConflictError(f"Job is '{job.status.value}', expected 'awaiting_feedback'.")
        if job.running:
            raise ResearchConflictError("Job is already running.")
        self._ensure_capacity()

        cleaned = (feedback or "").strip()
        job.error = None
        if cleaned:
            job.status = JobStatus.GENERATING_ANALYSTS
            self._record(job, "status", "Regenerating the panel with your feedback")
        else:
            job.status = JobStatus.RESEARCHING
            self._record(job, "status", "Panel approved — launching parallel interviews")
            job.progress = {a.name: AnalystProgress(name=a.name) for a in job.analysts}

        job.task = asyncio.create_task(self._run(job, Command(resume=cleaned)))
        return self._to_response(job)

    async def cancel(self, thread_id: str) -> ResearchJob:
        job = self._get_job(thread_id)
        if job.status.is_terminal:
            return self._to_response(job)

        job.status = JobStatus.CANCELLED
        self._record(job, "status", "Research cancelled")
        if job.running:
            assert job.task is not None
            job.task.cancel()
        logger.info("Cancelled job %s", job.thread_id)
        return self._to_response(job)

    def get(self, thread_id: str) -> ResearchJob:
        return self._to_response(self._get_job(thread_id))

    async def watch(
        self, thread_id: str, *, heartbeat: float = 15.0, coalesce: float = 0.2
    ) -> AsyncIterator[ResearchJob | None]:
        """Yield a job snapshot on every change, or `None` as a keep-alive.

        Each snapshot only carries activity events the watcher has not seen yet.
        The iterator ends once the job reaches a terminal status.
        """

        job = self._get_job(thread_id)
        last_event_id = 0
        changed = True

        while True:
            signal = job.signal
            if changed:
                snapshot = self._to_response(job, after_event=last_event_id)
                if snapshot.activity:
                    last_event_id = snapshot.activity[-1].id
                yield snapshot
                if job.status.is_terminal:
                    return
            try:
                await asyncio.wait_for(signal.wait(), timeout=heartbeat)
                changed = True
                # Batch bursts of events (parallel interviews) into one frame.
                await asyncio.sleep(coalesce)
            except TimeoutError:
                changed = False
                yield None

    async def shutdown(self) -> None:
        pending = [job.task for job in self._jobs.values() if job.running]
        for task in pending:
            assert task is not None
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

    # --------------------------------------------------------------- execution

    async def _run(self, job: _Job, graph_input: Any) -> None:
        try:
            async for namespace, mode, chunk in self._graph.astream(
                graph_input,
                self._config(job.thread_id),
                stream_mode=["updates", "custom"],
                subgraphs=True,
            ):
                if mode == "custom" and isinstance(chunk, dict):
                    self._on_node_event(job, chunk)
                elif mode == "updates" and not namespace and isinstance(chunk, dict):
                    self._on_root_update(job, chunk)
            await self._sync(job)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - surfaced to the client
            logger.exception("Job %s failed", job.thread_id)
            job.status = JobStatus.FAILED
            job.error = _friendly_error(exc)
            self._record(job, "error", "Research stopped because of an error")

    def _on_root_update(self, job: _Job, update: dict[str, Any]) -> None:
        if analysts_update := update.get("create_analysts"):
            job.analysts = _as_analysts(analysts_update.get("analysts"))
            job.progress = {}
            job.sections_count = 0
            self._touch(job)
        if interview_update := update.get("conduct_interview"):
            job.sections_count += len(interview_update.get("sections") or [])
            self._touch(job)

    def _on_node_event(self, job: _Job, event: dict[str, Any]) -> None:
        kind = str(event.get("kind", "info"))
        analyst = event.get("analyst")
        progress = job.progress.setdefault(analyst, AnalystProgress(name=analyst)) if analyst else None
        data: dict[str, Any] = {}

        if kind == "analysts":
            message = f"Assembled a panel of {event.get('count', 0)} analysts"
        elif kind == "question":
            message = str(event.get("text") or "Asked a follow-up question")
            if progress:
                progress.questions += 1
        elif kind == "search":
            data["query"] = event.get("query", "")
            message = f"Searching the web for “{data['query']}”"
            if progress:
                progress.searches += 1
        elif kind == "sources":
            sources = [Source.model_validate(item) for item in event.get("sources") or []]
            for source in sources:
                job.sources.setdefault(source.url, source)
            data["sources"] = [source.model_dump() for source in sources]
            message = f"Retrieved {len(sources)} source{'' if len(sources) == 1 else 's'}"
            if progress:
                progress.sources += len(sources)
        elif kind == "answer":
            message = str(event.get("text") or "Expert answered from retrieved context")
        elif kind == "section":
            title = str(event.get("title") or "Report section")
            message = f"Drafted section “{title}”"
            if progress:
                progress.section_title = title
                progress.done = True
        elif kind == "writing":
            if job.status is JobStatus.RESEARCHING:
                job.status = JobStatus.WRITING_REPORT
            message = WRITING_MESSAGES.get(str(event.get("part")), "Writing the report")
        else:
            message = str(event.get("message") or kind)

        self._record(job, kind, message, analyst=analyst, data=data)

    async def _sync(self, job: _Job) -> None:
        snapshot = await self._graph.aget_state(self._config(job.thread_id))
        values = snapshot.values or {}

        job.analysts = _as_analysts(values.get("analysts"))
        job.sections_count = len(values.get("sections") or [])

        if snapshot.next:
            if "human_feedback" in snapshot.next:
                job.status = JobStatus.AWAITING_FEEDBACK
                self._record(job, "status", "Panel ready for your review")
            else:
                job.status = JobStatus.RESEARCHING
            job.final_report = None
        else:
            job.status = JobStatus.COMPLETED
            job.final_report = values.get("final_report") or None
            self._record(job, "status", "Report complete")
            logger.info("Completed job %s", job.thread_id)

    # ----------------------------------------------------------------- helpers

    def _record(
        self,
        job: _Job,
        kind: str,
        message: str,
        *,
        analyst: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        job.activity.append(
            ActivityEvent(
                id=job.next_event_id,
                kind=kind,
                analyst=analyst,
                message=message,
                data=data or {},
                at=_utcnow(),
            )
        )
        job.next_event_id += 1
        if len(job.activity) > MAX_ACTIVITY_EVENTS:
            del job.activity[: len(job.activity) - MAX_ACTIVITY_EVENTS]
        self._touch(job)

    @staticmethod
    def _touch(job: _Job) -> None:
        job.updated_at = _utcnow()
        previous, job.signal = job.signal, asyncio.Event()
        previous.set()

    def _ensure_capacity(self) -> None:
        if self.active_count >= self._max_active_jobs:
            raise ResearchCapacityError(
                "ResearchPilot is busy with other research right now. Please try again in a minute."
            )

    def _purge_expired(self) -> None:
        cutoff = _utcnow() - self._job_ttl
        for thread_id, job in list(self._jobs.items()):
            if not job.running and job.updated_at < cutoff:
                del self._jobs[thread_id]

    def _get_job(self, thread_id: str) -> _Job:
        try:
            return self._jobs[thread_id]
        except KeyError as exc:
            raise ResearchNotFoundError(thread_id) from exc

    def _config(self, thread_id: str) -> dict[str, Any]:
        config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
        if self._max_concurrency:
            config["max_concurrency"] = self._max_concurrency
        return config

    def _to_response(self, job: _Job, *, after_event: int = 0) -> ResearchJob:
        return ResearchJob(
            thread_id=job.thread_id,
            status=job.status,
            topic=job.topic,
            max_analysts=job.max_analysts,
            max_num_turns=job.max_num_turns,
            analysts=list(job.analysts),
            progress=[
                job.progress.get(analyst.name, AnalystProgress(name=analyst.name)) for analyst in job.analysts
            ],
            activity=[event for event in job.activity if event.id > after_event],
            sources=list(job.sources.values()),
            sections_count=job.sections_count,
            total_sections=len(job.analysts),
            final_report=job.final_report,
            error=job.error,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
