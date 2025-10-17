from __future__ import annotations

import logging
import sqlite3

from fastapi import BackgroundTasks, HTTPException, status

from .. import etl_runner, schemas
from .weather import WeatherAdapter, WeatherService, WeatherServiceError

logger: logging.Logger = logging.getLogger(__name__)


def start_refresh(
    background_tasks: BackgroundTasks,
    payload: schemas.RefreshTriggerPayload | None = None,
) -> schemas.RefreshResponse:
    if payload and payload.get("force"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="force refresh is not supported",
        )

    background_tasks.add_task(etl_runner.start_etl_job)
    return schemas.RefreshResponse(state=etl_runner.STATE_RUNNING)


def refresh_status(conn: sqlite3.Connection) -> schemas.RefreshStatusResponse:
    status_obj = etl_runner.get_last_status(conn)
    payload = status_obj.model_dump() if hasattr(status_obj, "model_dump") else status_obj.dict()
    response = schemas.RefreshStatusResponse(**payload)
    if response.state == etl_runner.STATE_SUCCESS:
        logger.info(
            "market_metadata cache refresh confirmed",
            extra={"updated_records": response.updated_records},
        )
    return response


def log_telemetry_event(event: schemas.TelemetryEvent) -> None:
    logger.info(
        "telemetry event received",
        extra=event.model_dump(),
    )


__all__ = [
    "WeatherAdapter",
    "WeatherService",
    "WeatherServiceError",
    "start_refresh",
    "refresh_status",
    "log_telemetry_event",
]
