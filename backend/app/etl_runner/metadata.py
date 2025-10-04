from __future__ import annotations

import sqlite3
from typing import Final

from .. import schemas

STATE_RUNNING: Final[schemas.RefreshState] = "running"
STATE_SUCCESS: Final[schemas.RefreshState] = "success"
STATE_FAILURE: Final[schemas.RefreshState] = "failure"
STATE_STALE: Final[schemas.RefreshState] = "stale"


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


def _insert_run_metadata(conn: sqlite3.Connection, started_at: str) -> int:
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
    conn.commit()
    return int(run_id_raw)


def _mark_run_failure(
    conn: sqlite3.Connection, run_id: int, *, finished_at: str, error_message: str
) -> None:
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


def _mark_run_success(
    conn: sqlite3.Connection, run_id: int, *, finished_at: str, updated_records: int
) -> None:
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
