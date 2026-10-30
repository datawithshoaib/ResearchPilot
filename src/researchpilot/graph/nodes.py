"""Node implementations for the analyst, interview, and report graphs."""

from __future__ import annotations

import re
from typing import Any

from langchain.messages import HumanMessage, SystemMessage
from langchain_core.messages import get_buffer_string
from langgraph.types import interrupt

from researchpilot.llm import get_llm
from researchpilot.models import Analyst, Perspectives
from researchpilot.prompts import (
    analyst_instructions,
    answer_instructions,
    intro_conclusion_instructions,
    question_instructions,
    report_writer_instructions,
    section_writer_instructions,
)
from researchpilot.state import GenerateAnalystsState, InterviewState, ResearchGraphState

APPROVAL_RESPONSES = {"", "perfect", "continue", "approved", "yes", "looks good", "lgtm"}


def _coerce_analyst(analyst: Analyst | dict) -> Analyst:
    return analyst if isinstance(analyst, Analyst) else Analyst.model_validate(analyst)


def create_analysts(state: GenerateAnalystsState) -> dict[str, list[Analyst]]:
    """Generate a panel of analyst personas for the research topic."""

    structured_llm = get_llm().with_structured_output(Perspectives)
    system_message = analyst_instructions.format(
        topic=state["topic"],
        human_analyst_feedback=state.get("human_analyst_feedback") or "",
        max_analysts=state["max_analysts"],
    )
    perspectives = structured_llm.invoke(
        [
            SystemMessage(content=system_message),
            HumanMessage(content="Generate the set of analysts."),
        ]
    )
    return {"analysts": perspectives.analysts}


def human_feedback(state: GenerateAnalystsState | ResearchGraphState) -> dict[str, str | None]:
    """Pause the graph and capture feedback about the generated analysts."""

    feedback = interrupt(
        {
            "question": "Are these analysts okay?",
            "analysts": [
                analyst.model_dump() if hasattr(analyst, "model_dump") else analyst
                for analyst in state.get("analysts", [])
            ],
            "instructions": (
                "Return feedback to regenerate analysts, or return empty/perfect/continue "
                "to approve."
            ),
        }
    )

    if isinstance(feedback, dict):
        feedback = feedback.get("feedback", "")

    if not isinstance(feedback, str):
        return {"human_analyst_feedback": None}

    cleaned = feedback.strip()
    if cleaned.lower() in APPROVAL_RESPONSES:
        return {"human_analyst_feedback": None}
    return {"human_analyst_feedback": cleaned}


def dummy(_: GenerateAnalystsState) -> None:
    """No-op node used to terminate the analyst-only graph."""


def generate_question(state: InterviewState) -> dict[str, list]:
    """Generate the analyst's next interview question."""

    analyst = _coerce_analyst(state["analyst"])
    system_message = question_instructions.format(goals=analyst.persona)
    question = get_llm().invoke([SystemMessage(content=system_message), *state["messages"]])
    return {"messages": [question]}


def generate_answer(state: InterviewState) -> dict[str, list]:
    """Answer the analyst's question using retrieved web context."""

    analyst = _coerce_analyst(state["analyst"])
    system_message = answer_instructions.format(
        goals=analyst.persona,
        context="\n\n---\n\n".join(state["context"]),
    )
    answer = get_llm().invoke([SystemMessage(content=system_message), *state["messages"]])
    answer.name = "expert"
    return {"messages": [answer]}


def save_interview(state: InterviewState) -> dict[str, str]:
    """Persist the interview transcript as a single string."""

    return {"interview": get_buffer_string(state["messages"])}


def write_section(state: InterviewState) -> dict[str, list[str]]:
    """Turn a finished interview into a short report section."""

    analyst = _coerce_analyst(state["analyst"])
    source_material = "\n\n---\n\n".join(state["context"]) or state.get("interview", "")
    system_message = section_writer_instructions.format(focus=analyst.description)
    section = get_llm().invoke(
        [
            SystemMessage(content=system_message),
            HumanMessage(content=f"Use this source to write your section: {source_material}"),
        ]
    )
    return {"sections": [section.content]}


def write_report(state: ResearchGraphState) -> dict[str, str]:
    """Consolidate all analyst sections into the report body."""

    formatted_sections = "\n\n".join(state["sections"])
    system_message = report_writer_instructions.format(
        topic=state["topic"], context=formatted_sections
    )
    report = get_llm().invoke(
        [
            SystemMessage(content=system_message),
            HumanMessage(content="Write a report based upon these memos."),
        ]
    )
    return {"content": report.content}


def write_introduction(state: ResearchGraphState) -> dict[str, str]:
    """Write the report introduction."""

    formatted_sections = "\n\n".join(state["sections"])
    instructions = intro_conclusion_instructions.format(
        topic=state["topic"], formatted_str_sections=formatted_sections
    )
    intro = get_llm().invoke(
        [SystemMessage(content=instructions), HumanMessage(content="Write the report introduction")]
    )
    return {"introduction": intro.content}


def write_conclusion(state: ResearchGraphState) -> dict[str, str]:
    """Write the report conclusion."""

    formatted_sections = "\n\n".join(state["sections"])
    instructions = intro_conclusion_instructions.format(
        topic=state["topic"], formatted_str_sections=formatted_sections
    )
    conclusion = get_llm().invoke(
        [SystemMessage(content=instructions), HumanMessage(content="Write the report conclusion")]
    )
    return {"conclusion": conclusion.content}


def _split_sources(content: str) -> tuple[str, str | None]:
    match = re.search(r"\n##\s+Sources\s*\n", content)
    if not match:
        return content, None
    body = content[: match.start()].strip()
    sources = content[match.end() :].strip()
    return body, sources or None


def finalize_report(state: ResearchGraphState) -> dict[str, str]:
    """Assemble the introduction, body, conclusion, and sources into the final report."""

    content = (state.get("content") or "").strip()
    if content.startswith("## Insights"):
        content = content[len("## Insights") :].lstrip()

    content, sources = _split_sources(content)

    parts = [
        part.strip()
        for part in (state.get("introduction"), content, state.get("conclusion"))
        if part and part.strip()
    ]
    final_report = "\n\n---\n\n".join(parts)

    if sources:
        final_report = f"{final_report}\n\n## Sources\n\n{sources}"

    return {"final_report": final_report}
