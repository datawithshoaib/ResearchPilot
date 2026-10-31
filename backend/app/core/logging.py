"""Process-wide logging setup."""

import logging

from app.core.config import get_settings


def configure_logging() -> None:
    logging.basicConfig(
        level=get_settings().log_level.upper(),
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    )
    # httpx logs every provider call at INFO, which drowns out job logs.
    logging.getLogger("httpx").setLevel(logging.WARNING)
