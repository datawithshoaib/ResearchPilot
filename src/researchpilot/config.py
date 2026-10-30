"""Central configuration loaded from environment variables and `.env`."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve the repository `.env` even when the process starts outside the repo.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", _PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    groq_api_key: str | None = None
    tavily_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"
    groq_temperature: float = 0.0
    tavily_max_results: int = 3

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_configured(self) -> bool:
        return bool(self.groq_api_key and self.tavily_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
