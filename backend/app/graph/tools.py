"""Tavily-backed web search used by the interview subgraph."""

from functools import lru_cache

from langchain.messages import SystemMessage
from langchain_tavily import TavilySearch

from app.core.config import get_settings
from app.core.llm import get_llm
from app.graph.events import emit
from app.graph.models import Analyst, SearchQuery
from app.graph.prompts import search_instructions
from app.graph.state import InterviewState


@lru_cache(maxsize=1)
def get_search_tool() -> TavilySearch:
    settings = get_settings()
    return TavilySearch(
        max_results=settings.tavily_max_results,
        tavily_api_key=settings.tavily_api_key,
    )


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

    analyst = state["analyst"]
    analyst_name = analyst.name if isinstance(analyst, Analyst) else analyst.get("name")

    structured_llm = get_llm().with_structured_output(SearchQuery)
    search_query = structured_llm.invoke([SystemMessage(content=search_instructions), *state["messages"]])
    emit("search", analyst=analyst_name, query=search_query.search_query)

    data = get_search_tool().invoke({"query": search_query.search_query})
    results = _extract_results(data)

    seen_urls: set[str] = set()
    formatted_docs: list[str] = []
    sources: list[dict[str, str]] = []
    for document in results:
        url = str(document.get("url", ""))
        if url and url in seen_urls:
            continue
        seen_urls.add(url)
        formatted_docs.append(_format_document(document))
        if url:
            sources.append({"url": url, "title": str(document.get("title") or url)})

    emit("sources", analyst=analyst_name, sources=sources)
    return {"context": formatted_docs}
