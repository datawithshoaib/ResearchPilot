"""Persists finished reports to each user's history in Supabase Postgres."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Protocol

import httpx
from pydantic import BaseModel

from app.graph.models import Analyst
from app.schemas.research import Source

logger = logging.getLogger(__name__)


class ReportRecord(BaseModel):
    user_id: str
    thread_id: str
    topic: str
    analysts: list[Analyst]
    sources: list[Source]
    final_report: str
    created_at: datetime
    completed_at: datetime


class ReportStore(Protocol):
    async def save(self, record: ReportRecord) -> None: ...

    async def aclose(self) -> None: ...


class NullReportStore:
    """Used when Supabase is not configured; reports are simply not archived."""

    async def save(self, record: ReportRecord) -> None:
        logger.warning("No report store configured; report %s was not saved", record.thread_id)

    async def aclose(self) -> None:
        return None


class InMemoryReportStore:
    """Test double that keeps records in a list."""

    def __init__(self) -> None:
        self.records: list[ReportRecord] = []

    async def save(self, record: ReportRecord) -> None:
        self.records = [r for r in self.records if r.thread_id != record.thread_id] + [record]

    async def aclose(self) -> None:
        return None


class SupabaseReportStore:
    """Writes through Supabase's REST API (PostgREST) with the service-role key.

    The service role bypasses row level security, so `user_id` comes from the
    verified access token, never from client input.
    """

    def __init__(self, base_url: str, service_role_key: str, table: str = "reports") -> None:
        self._client = httpx.AsyncClient(
            base_url=f"{base_url.rstrip('/')}/rest/v1",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(15.0),
        )
        self._table = table

    async def save(self, record: ReportRecord) -> None:
        payload: dict[str, Any] = record.model_dump(mode="json")
        response = await self._client.post(
            f"/{self._table}",
            params={"on_conflict": "thread_id"},
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            json=payload,
        )
        if response.is_error:
            raise RuntimeError(
                f"Supabase rejected the report ({response.status_code}): {response.text[:300]}"
            )

    async def aclose(self) -> None:
        await self._client.aclose()
