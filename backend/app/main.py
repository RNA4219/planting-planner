from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .dependencies import prepare_database
from .middleware.security import SecurityHeadersMiddleware
from .routes import api_router
from .routes.telemetry import router as telemetry_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    prepare_database()
    yield


app = FastAPI(title="planting-planner API", lifespan=lifespan)
app.add_middleware(SecurityHeadersMiddleware)
app.include_router(api_router)
app.include_router(telemetry_router)
