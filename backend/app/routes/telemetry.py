from __future__ import annotations

from fastapi import APIRouter, status

from .. import schemas, services

router = APIRouter()


@router.post("/api/telemetry", status_code=status.HTTP_202_ACCEPTED)
def receive_telemetry(event: schemas.TelemetryEvent) -> None:
    services.log_telemetry_event(event)
