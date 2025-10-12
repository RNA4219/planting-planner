from __future__ import annotations

import logging
import sqlite3

from fastapi import BackgroundTasks

from . import etl_runner, schemas


logger = logging.getLogger(__name__)


def start_refresh(
    background_tasks: BackgroundTasks,
    _payload: schemas.RefreshTriggerPayload | None = None,
) -> schemas.RefreshResponse:
    background_tasks.add_task(etl_runner.start_etl_job)
    return schemas.RefreshResponse(state=etl_runner.STATE_RUNNING)


def refresh_status(conn: sqlite3.Connection) -> schemas.RefreshStatusResponse:
    status = etl_runner.get_last_status(conn)
    payload = status.model_dump() if hasattr(status, "model_dump") else status.dict()
    response = schemas.RefreshStatusResponse(**payload)
    if response.state == etl_runner.STATE_SUCCESS:
        logger.info(
            "market_metadata cache refresh confirmed",
            extra={"updated_records": response.updated_records},
        )
    return response
