"""Typed state definitions for the LangGraph workflows."""

import operator
from typing import Annotated, Optional

from langgraph.graph import MessagesState
from typing_extensions import NotRequired, TypedDict

from researchpilot.models import Analyst


def _keep_max(left: int, right: int) -> int:
    """Reducer that lets parallel interviews agree on the shared turn limit."""

    return max(left, right)


class GenerateAnalystsState(TypedDict):
    topic: str
    max_analysts: int
    human_analyst_feedback: NotRequired[Optional[str]]
    analysts: NotRequired[list[Analyst]]


class InterviewState(MessagesState):
    max_num_turns: int
    context: Annotated[list[str], operator.add]
    analyst: Analyst
    interview: str
    sections: list[str]


class ResearchGraphState(TypedDict):
    topic: str
    max_analysts: int
    max_num_turns: NotRequired[Annotated[int, _keep_max]]
    human_analyst_feedback: NotRequired[Optional[str]]
    analysts: list[Analyst]
    sections: Annotated[list[str], operator.add]
    introduction: str
    content: str
    conclusion: str
    final_report: str
