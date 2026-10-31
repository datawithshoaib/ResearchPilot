"""Graph that generates analyst personas and pauses for human review."""

from __future__ import annotations

from typing import TYPE_CHECKING

from langgraph.graph import END, START, StateGraph

from researchpilot.graph.edges import should_continue
from researchpilot.graph.nodes import create_analysts, dummy, human_feedback
from researchpilot.state import GenerateAnalystsState

if TYPE_CHECKING:
    from langgraph.checkpoint.base import BaseCheckpointSaver


def build_graph(checkpointer: BaseCheckpointSaver | None = None):
    builder = StateGraph(GenerateAnalystsState)

    builder.add_node("create_analysts", create_analysts)
    builder.add_node("human_feedback", human_feedback)
    builder.add_node("dummy", dummy)

    builder.add_edge(START, "create_analysts")
    builder.add_edge("create_analysts", "human_feedback")
    builder.add_conditional_edges("human_feedback", should_continue, ["create_analysts", "dummy"])
    builder.add_edge("dummy", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
