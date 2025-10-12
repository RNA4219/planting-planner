from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..dependencies import ConnDependency

router = APIRouter(prefix="/api/markets")


@router.get("")
def market_metadata(conn: ConnDependency) -> dict[str, Any]:
    row = conn.execute(
        """
        SELECT payload
        FROM metadata_cache
        WHERE cache_key = ?
        """,
        ("market_metadata",),
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="market metadata cache not ready",
        )
    try:
        payload = json.loads(str(row["payload"]))
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="market metadata cache invalid",
        ) from exc
    if not isinstance(payload, dict):  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="market metadata cache invalid",
        )
    return payload
