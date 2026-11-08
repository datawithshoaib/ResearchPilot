"""Central configuration loaded from environment variables and `.env`."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# `backend/` — resolved so `.env` is found no matter where the process starts.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILES = (BACKEND_ROOT / ".env", Path(".env"))

# LangChain integrations and LangSmith tracing read credentials straight from
# `os.environ`, so export `.env` values there as well (real env vars win).
for _env_file in _ENV_FILES:
    load_dotenv(_env_file, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["development", "production"] = "development"
    log_level: str = "INFO"

    groq_api_key: str | None = None
    tavily_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"
    groq_temperature: float = 0.0
    tavily_max_results: int = 3
    # Groq's SDK backs off using the `retry-after` header, which rides out
    # tokens-per-minute limits on free plans.
    groq_max_retries: int = 6
    # Upper bound on graph tasks (interview steps) running at the same time.
    graph_max_concurrency: int = 3

    # Comma-separated exact origins, plus an optional regex for preview deploys
    # such as `https://researchpilot-.*\.vercel\.app`.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cors_origin_regex: str | None = None

    # Guard rails for a public deployment: jobs live in memory and cost tokens.
    max_active_jobs: int = 4
    job_ttl_minutes: int = 180

    # Supabase: verifies user access tokens and stores each user's report history.
    # `SUPABASE_URL` is the project URL, e.g. https://abcd1234.supabase.co.
    supabase_url: str | None = None
    # Server-only secret used to write finished reports. Never expose it to the browser.
    supabase_service_role_key: str | None = None
    # Only needed for projects that still sign tokens with the legacy HS256 secret;
    # projects on asymmetric signing keys are verified through the public JWKS.
    supabase_jwt_secret: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_reports_table: str = "reports"

    @field_validator(
        "cors_origin_regex",
        "groq_api_key",
        "tavily_api_key",
        "supabase_url",
        "supabase_service_role_key",
        "supabase_jwt_secret",
        mode="before",
    )
    @classmethod
    def _blank_to_none(cls, value: str | None) -> str | None:
        # Dashboards often store optional variables as empty strings.
        return value.strip() or None if isinstance(value, str) else value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_base_url(self) -> str | None:
        return self.supabase_url.rstrip("/") if self.supabase_url else None

    @property
    def missing_keys(self) -> list[str]:
        return [
            name
            for name, value in (
                ("GROQ_API_KEY", self.groq_api_key),
                ("TAVILY_API_KEY", self.tavily_api_key),
                ("SUPABASE_URL", self.supabase_url),
                ("SUPABASE_SERVICE_ROLE_KEY", self.supabase_service_role_key),
            )
            if not value
        ]

    @property
    def is_configured(self) -> bool:
        return not self.missing_keys


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
