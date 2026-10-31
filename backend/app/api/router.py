"""Mounts every route module under the `/api` prefix."""

from fastapi import APIRouter

from app.api.routes import health, research

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(research.router)
