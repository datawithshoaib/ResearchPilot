"""Lazily constructed chat model so imports never require credentials."""

from functools import lru_cache

from langchain_groq import ChatGroq

from researchpilot.config import get_settings


@lru_cache(maxsize=1)
def get_llm() -> ChatGroq:
    settings = get_settings()
    return ChatGroq(model=settings.groq_model, temperature=settings.groq_temperature)
