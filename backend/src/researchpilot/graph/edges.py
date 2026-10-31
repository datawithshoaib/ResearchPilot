"""Routing logic for the analyst, interview, and research graphs."""

from __future__ import annotations

from typing import Literal

from langchain.messages import AIMessage, HumanMessage
from langgraph.types import Send

from researchpilot.state import GenerateAnalystsState, InterviewState, ResearchGraphState


def should_continue(state: GenerateAnalystsState) -> Literal["create_analysts", "dummy"]:
    """Regenerate analysts when feedback is present, otherwise finish."""

    if state.get("human_analyst_feedback"):
        return "create_analysts"
    return "dummy"


def route_messages(state: InterviewState, name: str = "expert") -> Literal["ask_question", "save_interview"]:
    """Continue the interview until the turn limit or closing message is reached."""

    messages = state.get("messages", [])
    max_num_turns = state.get("max_num_turns") or 2

    num_responses = sum(1 for message in messages if isinstance(message, AIMessage) and message.name == name)
    if num_responses >= max_num_turns:
        return "save_interview"

    if len(messages) >= 2:
        previous = messages[-2]
        if isinstance(previous.content, str) and "Thank you so much for your help" in previous.content:
            return "save_interview"

    return "ask_question"


def initiate_all_interviews(
    state: ResearchGraphState,
) -> list[Send] | Literal["create_analysts"]:
    """Regenerate analysts if feedback exists, otherwise fan out one interview per analyst."""

    if state.get("human_analyst_feedback"):
        return "create_analysts"

    topic = state["topic"]
    max_num_turns = state.get("max_num_turns") or 2

    return [
        Send(
            "conduct_interview",
            {
                "analyst": analyst,
                "max_num_turns": max_num_turns,
                "messages": [HumanMessage(content=f"So you said you were writing an article on {topic}?")],
            },
        )
        for analyst in state["analysts"]
    ]
