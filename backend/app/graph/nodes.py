"""Node implementations for the analyst, interview, and report graphs."""

from __future__ import annotations

import re

from langchain.messages import HumanMessage, SystemMessage
from langchain_core.messages import get_buffer_string
from langgraph.types import interrupt

from app.core.llm import get_llm
from app.graph.events import emit, preview
from app.graph.models import Analyst, Perspectives
from app.graph.prompts import (
    analyst_instructions,
    answer_instructions,
    intro_conclusion_instructions,
    question_instructions,
    report_writer_instructions,
    section_writer_instructions,
)
from app.graph.state import GenerateAnalystsState, InterviewState, ResearchGraphState

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
    emit("analysts", count=len(perspectives.analysts))
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
                "Return feedback to regenerate analysts, or return empty/perfect/continue to approve."
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
    emit("question", analyst=analyst.name, text=preview(question.content))
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
    emit("answer", analyst=analyst.name, text=preview(answer.content))
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
    headings = (line for line in str(section.content).splitlines() if line.startswith("## "))
    title = next((line.lstrip("# ").strip() for line in headings), analyst.role)
    emit("section", analyst=analyst.name, title=title)
    return {"sections": [section.content]}


def write_report(state: ResearchGraphState) -> dict[str, str]:
    """Consolidate all analyst sections into the report body."""

    emit("writing", part="body")
    formatted_sections = "\n\n".join(state["sections"])
    system_message = report_writer_instructions.format(topic=state["topic"], context=formatted_sections)
    report = get_llm().invoke(
        [
            SystemMessage(content=system_message),
            HumanMessage(content="Write a report based upon these memos."),
        ]
    )
    return {"content": report.content}


def write_introduction(state: ResearchGraphState) -> dict[str, str]:
    """Write the report introduction."""

    emit("writing", part="introduction")
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

    emit("writing", part="conclusion")
    formatted_sections = "\n\n".join(state["sections"])
    instructions = intro_conclusion_instructions.format(
        topic=state["topic"], formatted_str_sections=formatted_sections
    )
    conclusion = get_llm().invoke(
        [SystemMessage(content=instructions), HumanMessage(content="Write the report conclusion")]
    )
    return {"conclusion": conclusion.content}


_SOURCES_HEADER = re.compile(r"^#{2,3}\s*\**Sources\**\s*:?\s*$", re.IGNORECASE | re.MULTILINE)
_SOURCE_LINE = re.compile(r"^\s*(?:[-*]\s*)?\[(\d+)\]\s*(.+?)\s*$")
_CITATION = re.compile(r"\[(\d+(?:\s*,\s*\d+)*)\]")
_URL = re.compile(r"https?://\S+")


def _split_sources(content: str) -> tuple[str, str | None]:
    """Split markdown into (body, sources) at the first Sources header."""

    match = _SOURCES_HEADER.search(content)
    if not match:
        return content.strip(), None
    body = content[: match.start()].strip()
    sources = content[match.end() :].strip()
    return body, sources or None


def _source_key(entry: str) -> str:
    """Identity of a source: its URL when present, else its normalized text."""

    url = _URL.search(entry)
    if url:
        return url.group(0).rstrip(").,;>").rstrip("/").lower()
    return " ".join(entry.lower().split())


def _dedupe_sources(body: str, sources: str | None) -> tuple[str, list[str]]:
    """Give every unique source one number and rewrite the body's citations to match."""

    if not sources:
        return body, []

    entries: list[str] = []
    number_for_key: dict[str, int] = {}
    remap: dict[int, int] = {}
    for line in sources.splitlines():
        match = _SOURCE_LINE.match(line)
        if not match:
            continue
        old_number, entry = int(match.group(1)), match.group(2).strip()
        key = _source_key(entry)
        if key not in number_for_key:
            entries.append(entry)
            number_for_key[key] = len(entries)
        remap.setdefault(old_number, number_for_key[key])

    if not entries:
        return body, [line.strip() for line in sources.splitlines() if line.strip()]

    def renumber(match: re.Match[str]) -> str:
        numbers = [int(n) for n in re.split(r"\s*,\s*", match.group(1))]
        if not all(n in remap for n in numbers):
            return match.group(0)  # not a citation we know, e.g. a literal "[2024]"
        unique = list(dict.fromkeys(remap[n] for n in numbers))
        return "".join(f"[{n}]" for n in unique)

    body = _CITATION.sub(renumber, body)
    return body, [f"[{index}] {entry}" for index, entry in enumerate(entries, start=1)]


def _strip_leading_header(content: str, *titles: str) -> str:
    pattern = rf"^#{{1,3}}\s*(?:{'|'.join(map(re.escape, titles))})\s*\n"
    return re.sub(pattern, "", content, count=1, flags=re.IGNORECASE).lstrip()


def finalize_report(state: ResearchGraphState) -> dict[str, str]:
    """Assemble title + introduction, thematic body sections, conclusion, and one source list."""

    body = _strip_leading_header((state.get("content") or "").strip(), "Insights", "Report")
    body, sources = _split_sources(body)

    # Intro and conclusion should not carry their own source lists; drop any that slip in.
    introduction, _ = _split_sources((state.get("introduction") or "").strip())
    conclusion, _ = _split_sources((state.get("conclusion") or "").strip())

    body, source_lines = _dedupe_sources(body, sources)

    parts = [part for part in (introduction, body, conclusion) if part]
    final_report = "\n\n".join(parts)

    if source_lines:
        # Two trailing spaces force markdown line breaks between entries.
        final_report = f"{final_report}\n\n## Sources\n\n" + "  \n".join(source_lines)

    return {"final_report": final_report}
