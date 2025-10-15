from __future__ import annotations

from fastapi import FastAPI

from .dependencies import prepare_database
from .routes import api_router

app = FastAPI(title="planting-planner API")
app.include_router(api_router)


@app.on_event("startup")
def startup() -> None:
    prepare_database()
