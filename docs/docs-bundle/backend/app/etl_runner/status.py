from __future__ import annotations

import sqlite3
from typing import Any, cast

from .. import schemas
from . import metadata

_STATE_LOOKUP: dict[str, schemas.RefreshState] = {
    metadata.STATE_RUNNING: metadata.STATE_RUNNING,
    metadata.STATE_SUCCESS: metadata.STATE_SUCCESS,
    metadata.STATE_FAILURE: metadata.STATE_FAILURE,
    metadata.STATE_STALE: metadata.STATE_STALE,
}


def _coerce_state(value: Any) -> schemas.RefreshState:
    if isinstance(value, str):
        normalized = value.lower()
        state = _STATE_LOOKUP.get(normalized)
        if state is not None:
            return state
    return metadata.STATE_STALE


def get_last_status(conn: sqlite3.Connection) -> schemas.RefreshStatus:
    metadata._ensure_schema(conn)
    row = conn.execute(
        """
        SELECT
            COALESCE(state, status) AS state,
            COALESCE(started_at, run_at) AS started_at,
            finished_at,
            updated_records,
            COALESCE(last_error, error_message) AS last_error,
            run_at
        FROM etl_runs
        ORDER BY COALESCE(started_at, run_at) DESC
        LIMIT 1
        """,
    ).fetchone()
    if row is None:
        return schemas.RefreshStatus(
            state="stale",
            started_at=None,
            finished_at=None,
            updated_records=0,
            last_error=None,
        )

    state = _coerce_state(row["state"])
    finished_at = cast(str | None, row["finished_at"])
    raw_updated_records = cast(int | None, row["updated_records"])
    updated_records = 0 if raw_updated_records is None else int(raw_updated_records)
    return schemas.RefreshStatus(
        state=state,
        started_at=row["started_at"],
        finished_at=finished_at,
        updated_records=updated_records,
        last_error=cast(str | None, row["last_error"]),
    )
