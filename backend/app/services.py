from __future__ import annotations

import sqlite3

from fastapi import BackgroundTasks

from . import etl, schemas


def start_refresh(
    background_tasks: BackgroundTasks,
    _payload: schemas.RefreshTriggerPayload | None = None,
) -> schemas.RefreshResponse:
    background_tasks.add_task(etl.start_etl_job)
    return schemas.RefreshResponse(state=etl.STATE_RUNNING)


def refresh_status(conn: sqlite3.Connection) -> schemas.RefreshStatusResponse:
    status = etl.get_last_status(conn)
    payload = status.model_dump() if hasattr(status, "model_dump") else status.dict()
    return schemas.RefreshStatusResponse(**payload)
