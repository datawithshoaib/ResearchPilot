"""End-to-end research graph: analysts -> interviews -> report."""

from __future__ import annotations

from typing import TYPE_CHECKING

from langgraph.graph import END, START, StateGraph

from app.graph.edges import initiate_all_interviews
from app.graph.nodes import (
    create_analysts,
    finalize_report,
    human_feedback,
    write_conclusion,
    write_introduction,
    write_report,
)
from app.graph.state import ResearchGraphState
from app.graph.workflows.interview import interview_graph

if TYPE_CHECKING:
    from langgraph.checkpoint.base import BaseCheckpointSaver


def build_graph(checkpointer: BaseCheckpointSaver | None = None):
    builder = StateGraph(ResearchGraphState)

    builder.add_node("create_analysts", create_analysts)
    builder.add_node("human_feedback", human_feedback)
    builder.add_node("conduct_interview", interview_graph)
    builder.add_node("write_report", write_report)
    builder.add_node("write_introduction", write_introduction)
    builder.add_node("write_conclusion", write_conclusion)
    builder.add_node("finalize_report", finalize_report)

    builder.add_edge(START, "create_analysts")
    builder.add_edge("create_analysts", "human_feedback")
    builder.add_conditional_edges(
        "human_feedback", initiate_all_interviews, ["create_analysts", "conduct_interview"]
    )
    builder.add_edge("conduct_interview", "write_report")
    builder.add_edge("conduct_interview", "write_introduction")
    builder.add_edge("conduct_interview", "write_conclusion")
    builder.add_edge(["write_conclusion", "write_report", "write_introduction"], "finalize_report")
    builder.add_edge("finalize_report", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
