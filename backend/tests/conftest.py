"""Test fixtures: the real research graph wired to a fake LLM and search tool."""

import os
import time
from collections.abc import Callable, Iterator
from typing import Any

import pytest

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("TAVILY_API_KEY", "test-tavily-key")

from fastapi.testclient import TestClient  # noqa: E402
from langchain_core.messages import AIMessage  # noqa: E402

from app.graph import nodes, tools  # noqa: E402
from app.graph.models import Analyst, Perspectives, SearchQuery  # noqa: E402
from app.main import create_app  # noqa: E402
from app.services.research import ResearchService  # noqa: E402


class _Structured:
    def __init__(self, schema: type) -> None:
        self.schema = schema

    def invoke(self, _messages: Any) -> Any:
        if self.schema is Perspectives:
            return Perspectives(
                analysts=[
                    Analyst(
                        name=f"Analyst {i}",
                        role=f"Role {i}",
                        affiliation="Test Lab",
                        description=f"Focus area {i}",
                    )
                    for i in range(2)
                ]
            )
        if self.schema is SearchQuery:
            return SearchQuery(search_query="fake query")
        raise AssertionError(f"unexpected schema {self.schema}")


class FakeLLM:
    def with_structured_output(self, schema: type) -> _Structured:
        return _Structured(schema)

    def invoke(self, messages: Any) -> AIMessage:
        prompt = str(messages[0].content)
        if "expert technical writer" in prompt:
            return AIMessage(
                content="## A Fake Section\n### Summary\nText [1]\n### Sources\n[1] https://a.test"
            )
        if "introduction or conclusion" in prompt:
            ask = str(messages[-1].content)
            if "introduction" in ask:
                return AIMessage(content="# Title\n\n## Introduction\nIntro.")
            return AIMessage(content="## Conclusion\nDone.")
        if "creating a report" in prompt:
            return AIMessage(content="## Insights\nBody [1]\n\n## Sources\n[1] https://a.test")
        if "expert being interviewed" in prompt:
            return AIMessage(content="Here is an answer [1].")
        return AIMessage(content="What is the most surprising finding?")


class FakeSearch:
    def invoke(self, _query: Any) -> dict:
        return {
            "results": [
                {"url": "https://a.test", "title": "A", "content": "alpha"},
                {"url": "https://b.test", "title": "B", "content": "beta"},
            ]
        }


@pytest.fixture
def fake_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    llm = FakeLLM()
    monkeypatch.setattr(nodes, "get_llm", lambda: llm)
    monkeypatch.setattr(tools, "get_llm", lambda: llm)
    monkeypatch.setattr(tools, "get_search_tool", lambda: FakeSearch())


@pytest.fixture
def make_client(fake_providers: None) -> Iterator[Callable[..., TestClient]]:
    clients: list[TestClient] = []

    def factory(**service_kwargs: Any) -> TestClient:
        client = TestClient(create_app(ResearchService(**service_kwargs)))
        client.__enter__()
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.__exit__(None, None, None)


@pytest.fixture
def client(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client()


def wait_for_status(client: TestClient, thread_id: str, *statuses: str, timeout: float = 15) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        job = client.get(f"/api/research/{thread_id}").json()
        if job["status"] in statuses:
            return job
        time.sleep(0.05)
    raise AssertionError(f"job never reached {statuses}; last status {job['status']}: {job.get('error')}")
