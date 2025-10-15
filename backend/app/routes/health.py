from __future__ import annotations

from fastapi import APIRouter

from ..services.health import HealthPayload, get_health_status

router = APIRouter()


@router.get("/healthz")
def healthz() -> HealthPayload:
    return get_health_status()

