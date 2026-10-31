from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from researchpilot.api.deps import get_service, require_configured
from researchpilot.api.schemas import ResearchJob, ResumeResearchRequest, StartResearchRequest
from researchpilot.services.research import (
    ResearchCapacityError,
    ResearchConflictError,
    ResearchNotFoundError,
    ResearchService,
)

router = APIRouter(prefix="/research", tags=["research"])

Service = Annotated[ResearchService, Depends(get_service)]
NOT_FOUND = "Research job not found. It may have expired or the server restarted."


@router.post(
    "",
    response_model=ResearchJob,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_configured)],
)
async def start_research(request: StartResearchRequest, service: Service) -> ResearchJob:
    try:
        return await service.start(request)
    except ResearchCapacityError as exc:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(exc)) from exc


@router.get("/{thread_id}", response_model=ResearchJob)
def get_research(thread_id: str, service: Service) -> ResearchJob:
    try:
        return service.get(thread_id)
    except ResearchNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from exc


@router.get(
    "/{thread_id}/stream",
    response_class=StreamingResponse,
    responses={200: {"content": {"text/event-stream": {}}}},
)
async def stream_research(thread_id: str, request: Request, service: Service) -> StreamingResponse:
    """Server-Sent Events: a `job` event per change and a comment heartbeat while idle."""

    try:
        updates = service.watch(thread_id)
        first = await anext(updates)
    except ResearchNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from exc

    async def events() -> AsyncIterator[str]:
        # Tell EventSource to wait a little before reconnecting after a drop.
        yield "retry: 3000\n\n"
        snapshot = first
        try:
            while True:
                if await request.is_disconnected():
                    return
                if snapshot is None:
                    yield ": keep-alive\n\n"
                else:
                    yield f"event: job\ndata: {snapshot.model_dump_json()}\n\n"
                    if snapshot.status.is_terminal:
                        yield "event: end\ndata: {}\n\n"
                        return
                snapshot = await anext(updates)
        except StopAsyncIteration:
            return
        finally:
            await updates.aclose()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/{thread_id}/resume",
    response_model=ResearchJob,
    dependencies=[Depends(require_configured)],
)
async def resume_research(
    thread_id: str, service: Service, request: ResumeResearchRequest | None = None
) -> ResearchJob:
    try:
        return await service.resume(thread_id, request.feedback if request else None)
    except ResearchNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from exc
    except ResearchConflictError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except ResearchCapacityError as exc:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(exc)) from exc


@router.post("/{thread_id}/cancel", response_model=ResearchJob)
async def cancel_research(thread_id: str, service: Service) -> ResearchJob:
    try:
        return await service.cancel(thread_id)
    except ResearchNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from exc
