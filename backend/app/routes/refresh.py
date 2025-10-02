from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks

from .. import schemas
from ..dependencies import ConnDependency
from ..services import refresh_status as get_refresh_status
from ..services import start_refresh

router = APIRouter()


@router.post("/api/refresh", response_model=schemas.RefreshResponse)
def refresh(
    background_tasks: BackgroundTasks,
    payload: schemas.RefreshTriggerPayload | None = None,
) -> schemas.RefreshResponse:
    return start_refresh(background_tasks, payload)


@router.post("/refresh", response_model=schemas.RefreshResponse)
def refresh_legacy(
    background_tasks: BackgroundTasks,
    payload: schemas.RefreshTriggerPayload | None = None,
) -> schemas.RefreshResponse:
    return start_refresh(background_tasks, payload)


@router.get("/api/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status(conn: ConnDependency) -> schemas.RefreshStatusResponse:
    return get_refresh_status(conn)


@router.get("/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status_legacy(conn: ConnDependency) -> schemas.RefreshStatusResponse:
    return get_refresh_status(conn)
