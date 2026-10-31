"""Lazily constructed chat model so imports never require credentials."""

from functools import lru_cache

from langchain_groq import ChatGroq

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_llm() -> ChatGroq:
    settings = get_settings()
    return ChatGroq(
        model=settings.groq_model,
        temperature=settings.groq_temperature,
        api_key=settings.groq_api_key,
        max_retries=settings.groq_max_retries,
    )
