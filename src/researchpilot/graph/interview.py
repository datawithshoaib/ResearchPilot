"""Interview subgraph: question -> web search -> answer -> section."""

from __future__ import annotations

from typing import TYPE_CHECKING

from langgraph.graph import END, START, StateGraph

from researchpilot.graph.edges import route_messages
from researchpilot.graph.nodes import (
    generate_answer,
    generate_question,
    save_interview,
    write_section,
)
from researchpilot.graph.tools import search_web
from researchpilot.state import InterviewState

if TYPE_CHECKING:
    from langgraph.checkpoint.base import BaseCheckpointSaver


def build_interview_graph(checkpointer: "BaseCheckpointSaver | None" = None):
    builder = StateGraph(InterviewState)

    builder.add_node("ask_question", generate_question)
    builder.add_node("search_web", search_web)
    builder.add_node("answer_question", generate_answer)
    builder.add_node("save_interview", save_interview)
    builder.add_node("write_section", write_section)

    builder.add_edge(START, "ask_question")
    builder.add_edge("ask_question", "search_web")
    builder.add_edge("search_web", "answer_question")
    builder.add_conditional_edges(
        "answer_question", route_messages, ["ask_question", "save_interview"]
    )
    builder.add_edge("save_interview", "write_section")
    builder.add_edge("write_section", END)

    return builder.compile(checkpointer=checkpointer)


question_answer_graph = build_interview_graph()
interview_graph = question_answer_graph
