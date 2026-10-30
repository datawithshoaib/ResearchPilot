"""Tavily-backed web search used by the interview subgraph."""

from functools import lru_cache

from langchain.messages import SystemMessage
from langchain_tavily import TavilySearch

from researchpilot.config import get_settings
from researchpilot.llm import get_llm
from researchpilot.models import SearchQuery
from researchpilot.prompts import search_instructions
from researchpilot.state import InterviewState


@lru_cache(maxsize=1)
def get_search_tool() -> TavilySearch:
    return TavilySearch(max_results=get_settings().tavily_max_results)


def _format_document(document: dict) -> str:
    return f'<Document href="{document.get("url", "")}"/>\n{document.get("content", "")}\n</Document>'


def _extract_results(data: object) -> list[dict]:
    if isinstance(data, dict):
        results = data.get("results", [])
    elif isinstance(data, list):
        results = data
    else:
        results = []
    return [result for result in results if isinstance(result, dict)]


def search_web(state: InterviewState) -> dict[str, list[str]]:
    """Turn the latest interview question into a query and retrieve web context."""

    structured_llm = get_llm().with_structured_output(SearchQuery)
    search_query = structured_llm.invoke(
        [SystemMessage(content=search_instructions), *state["messages"]]
    )

    data = get_search_tool().invoke({"query": search_query.search_query})
    results = _extract_results(data)

    seen_urls: set[str] = set()
    formatted_docs: list[str] = []
    for document in results:
        url = str(document.get("url", ""))
        if url and url in seen_urls:
            continue
        seen_urls.add(url)
        formatted_docs.append(_format_document(document))

    return {"context": formatted_docs}
