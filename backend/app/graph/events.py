"""Progress events emitted from graph nodes over LangGraph's `custom` stream.

Nodes call `emit(...)` to describe what they are doing. When the graph runs via
`astream(..., stream_mode="custom")` the API turns these into the live activity
feed; in any other context (Studio, `invoke`) they are silently dropped.
"""

from __future__ import annotations

import re
from typing import Any, Literal

from langgraph.config import get_stream_writer

EventKind = Literal[
    "analysts",
    "question",
    "search",
    "sources",
    "answer",
    "section",
    "writing",
]


def emit(kind: EventKind, *, analyst: str | None = None, **data: Any) -> None:
    try:
        writer = get_stream_writer()
    except RuntimeError:
        # Called outside a runnable context (e.g. unit-testing a node directly).
        return
    writer({"kind": kind, "analyst": analyst, **data})


def preview(text: Any, limit: int = 240) -> str:
    """Single-line, length-capped version of model output for the activity feed."""

    plain = re.sub(r"\*\*|__|`|^#+\s*", "", str(text or ""), flags=re.MULTILINE)
    flat = " ".join(plain.split())
    return flat if len(flat) <= limit else flat[: limit - 1].rstrip() + "…"
