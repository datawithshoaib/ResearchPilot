# syntax=docker/dockerfile:1

# ---- build: resolve dependencies into a virtualenv with uv ------------------
FROM ghcr.io/astral-sh/uv:0.12.17-python3.12-bookworm-slim AS build

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /srv

# Only dependencies go into the venv; the `app/` source is copied as-is below.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-dev

# ---- runtime: slim image with the virtualenv and the app package -----------
FROM python:3.12-slim-bookworm AS runtime

ENV PATH="/srv/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    PORT=8000

RUN groupadd --system app && useradd --system --gid app --home /srv app
WORKDIR /srv
COPY --from=build --chown=app:app /srv/.venv /srv/.venv
COPY --chown=app:app app ./app
USER app

EXPOSE 8000

# One worker on purpose: jobs and checkpoints live in this process's memory.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*' --timeout-graceful-shutdown 20"]
