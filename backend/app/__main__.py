"""Run the API with `python -m app` (from the `backend/` directory)."""

import os

import uvicorn

from app.core.config import get_settings


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        reload=get_settings().environment == "development",
    )


if __name__ == "__main__":
    main()
