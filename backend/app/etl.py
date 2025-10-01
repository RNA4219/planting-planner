from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from . import db

STATE_RUNNING = "running"
STATE_SUCCESS = "success"
STATE_FAILURE = "failure"


def _utc_now() -> str:
    return datetime.now(tz=UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _ensure_schema(conn: Any) -> None:
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


def run_etl(conn: Any) -> int:
    row = conn.execute("SELECT COUNT(*) FROM prices").fetchone()
    if row is None:
        return 0
    value = row[0]
    if value is None:
        return 0
    return int(value)


def start_etl_job() -> None:
    conn = db.connect()
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
            updated_records = run_etl(conn)
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


def get_last_status(conn: Any) -> dict[str, Any]:
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
        return {
            "last_run": None,
            "status": "stale",
            "state": "stale",
            "started_at": None,
            "finished_at": None,
            "updated_records": 0,
            "last_error": None,
        }

    state = (row["state"] or "stale").lower()
    finished_at = row["finished_at"]
    last_run = finished_at if finished_at is not None else None
    raw_updated_records = cast(int | None, row["updated_records"])
    updated_records = 0 if raw_updated_records is None else int(raw_updated_records)
    return {
        "last_run": last_run,
        "status": state,
        "state": state,
        "started_at": row["started_at"],
        "finished_at": finished_at,
        "updated_records": updated_records,
        "last_error": row["last_error"],
    }
