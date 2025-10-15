from __future__ import annotations

import logging
import logging.config

from fastapi import FastAPI

from .dependencies import prepare_database
from .middleware import RequestIdFilter, RequestIdMiddleware
from .routes import api_router
from .routes.telemetry import router as telemetry_router

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "app.middleware.request_id.RequestIdFilter"},
    },
    "formatters": {
        "standard": {
            "format": "%(levelname)s:%(name)s:%(message)s [request_id=%(request_id)s]",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["request_id"],
            "formatter": "standard",
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"],
        "filters": ["request_id"],
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logging.getLogger().addFilter(RequestIdFilter())

app = FastAPI(title="planting-planner API")
app.add_middleware(RequestIdMiddleware)
app.include_router(api_router)
app.include_router(telemetry_router)


@app.on_event("startup")
def startup() -> None:
    prepare_database()
