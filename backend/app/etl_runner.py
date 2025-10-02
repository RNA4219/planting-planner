from __future__ import annotations

import sqlite3
import time
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from typing import Any, Final, Protocol, cast

from . import db, schemas

STATE_RUNNING: Final[schemas.RefreshState] = "running"
STATE_SUCCESS: Final[schemas.RefreshState] = "success"
STATE_FAILURE: Final[schemas.RefreshState] = "failure"
STATE_STALE: Final[schemas.RefreshState] = "stale"

_STATE_LOOKUP: dict[str, schemas.RefreshState] = {
    STATE_RUNNING: STATE_RUNNING,
    STATE_SUCCESS: STATE_SUCCESS,
    STATE_FAILURE: STATE_FAILURE,
    STATE_STALE: STATE_STALE,
}

DataLoader = Callable[[], Iterable[dict[str, Any]]]


class _ETLModule(Protocol):
    def run_etl(
        self, conn: sqlite3.Connection, *, data_loader: DataLoader | None = None
    ) -> int: ...


def _utc_now() -> str:
    return datetime.now(tz=UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _ensure_schema(conn: sqlite3.Connection) -> None:
    columns = {row[1] for row in conn.execute("PRAGMA table_info('etl_runs')").fetchall()}
    migrations: dict[str, str] = {
        "state": "ALTER TABLE etl_runs ADD COLUMN state TEXT",
        "started_at": "ALTER TABLE etl_runs ADD COLUMN started_at TEXT",
        "finished_at": "ALTER TABLE etl_runs ADD COLUMN finished_at TEXT",
        "last_error": "ALTER TABLE etl_runs ADD COLUMN last_error TEXT",
    }
    mutated = False
    for column, ddl in migrations.items():
        if column not in columns:
            conn.execute(ddl)
            mutated = True
    if mutated:
        conn.commit()


def _coerce_state(value: Any) -> schemas.RefreshState:
    if isinstance(value, str):
        normalized = value.lower()
        state = _STATE_LOOKUP.get(normalized)
        if state is not None:
            return state
    return STATE_STALE


def start_etl_job(
    *,
    data_loader: DataLoader | None = None,
    conn_factory: Callable[[], sqlite3.Connection] | None = None,
    max_retries: int = 3,
    retry_delay: float = 0.1,
) -> None:
    factory = conn_factory if conn_factory is not None else db.get_conn
    conn = factory()
    try:
        _ensure_schema(conn)
        started_at = _utc_now()
        cursor = conn.execute(
            """
            INSERT INTO etl_runs (
                run_at,
                status,
                updated_records,
                error_message,
                state,
                started_at,
                finished_at,
                last_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (started_at, STATE_RUNNING, 0, None, STATE_RUNNING, started_at, None, None),
        )
        run_id_raw = cursor.lastrowid
        if run_id_raw is None:  # pragma: no cover - SQLite guarantees an id for AUTOINCREMENT
            raise RuntimeError("Failed to persist ETL run metadata")
        run_id = int(run_id_raw)
        conn.commit()

        try:
            attempt = 0
            while True:
                try:
                    from . import etl as _etl

                    etl_module = cast(_ETLModule, _etl)
                    updated_records = etl_module.run_etl(conn, data_loader=data_loader)
                    break
                except sqlite3.DatabaseError:
                    attempt += 1
                    if attempt >= max_retries:
                        raise
                    if retry_delay:
                        time.sleep(retry_delay)
        except Exception as exc:  # pragma: no cover - defensive path
            finished_at = _utc_now()
            error_message = str(exc)
            conn.execute(
                """
                UPDATE etl_runs
                SET status = ?,
                    state = ?,
                    finished_at = ?,
                    last_error = ?,
                    error_message = ?
                WHERE id = ?
                """,
                (STATE_FAILURE, STATE_FAILURE, finished_at, error_message, error_message, run_id),
            )
            conn.commit()
            raise
        else:
            finished_at = _utc_now()
            conn.execute(
                """
                UPDATE etl_runs
                SET status = ?,
                    state = ?,
                    finished_at = ?,
                    updated_records = ?,
                    last_error = NULL,
                    error_message = NULL
                WHERE id = ?
                """,
                (STATE_SUCCESS, STATE_SUCCESS, finished_at, updated_records, run_id),
            )
            conn.commit()
    finally:
        conn.close()


def get_last_status(conn: sqlite3.Connection) -> schemas.RefreshStatus:
    _ensure_schema(conn)
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
