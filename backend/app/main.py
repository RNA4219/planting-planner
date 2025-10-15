from __future__ import annotations

from fastapi import FastAPI

from .middleware.security import SecurityHeadersMiddleware

from .dependencies import prepare_database
from .routes import api_router
from .routes.telemetry import router as telemetry_router

app = FastAPI(title="planting-planner API")
app.add_middleware(SecurityHeadersMiddleware)
app.include_router(api_router)
app.include_router(telemetry_router)


@app.on_event("startup")
def startup() -> None:
    prepare_database()
