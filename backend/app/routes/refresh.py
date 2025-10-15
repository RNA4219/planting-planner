from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status

from .. import schemas
from ..dependencies import ConnDependency
from ..services import refresh_status as get_refresh_status
from ..services import start_refresh

router = APIRouter()

logger = logging.getLogger(__name__)


IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key")]


def _require_idempotency_key(idempotency_key: str | None) -> str:
    if idempotency_key is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key header is required",
        )
    return idempotency_key


@router.post("/api/refresh", response_model=schemas.RefreshResponse)
def refresh(
    background_tasks: BackgroundTasks,
    payload: schemas.RefreshTriggerPayload | None = None,
    idempotency_key: IdempotencyKey = None,
) -> schemas.RefreshResponse:
    key = _require_idempotency_key(idempotency_key)
    logger.info("refresh requested", extra={"idempotency_key": key})
    return start_refresh(background_tasks, payload)


@router.post("/refresh", response_model=schemas.RefreshResponse)
def refresh_legacy(
    background_tasks: BackgroundTasks,
    payload: schemas.RefreshTriggerPayload | None = None,
    idempotency_key: IdempotencyKey = None,
) -> schemas.RefreshResponse:
    key = _require_idempotency_key(idempotency_key)
    logger.info("legacy refresh requested", extra={"idempotency_key": key})
    return start_refresh(background_tasks, payload)


@router.get("/api/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status(conn: ConnDependency) -> schemas.RefreshStatusResponse:
    return get_refresh_status(conn)


@router.get("/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status_legacy(conn: ConnDependency) -> schemas.RefreshStatusResponse:
    return get_refresh_status(conn)
