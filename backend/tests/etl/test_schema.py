from __future__ import annotations

from pathlib import Path

from app import etl_runner

from ._helpers import make_conn


def test_ensure_schema_backfills_missing_columns(tmp_path: Path) -> None:
    conn = make_conn(tmp_path / "legacy.db")
    try:
        conn.execute(
            """
            CREATE TABLE etl_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_records INTEGER NOT NULL,
                error_message TEXT
            )
            """
        )
        conn.commit()

        etl_runner._ensure_schema(conn)

        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info('etl_runs')").fetchall()
        }
        assert {"state", "started_at", "finished_at", "last_error"}.issubset(columns)
    finally:
        conn.close()

def test_insert_run_metadata_persists_defaults() -> None:
    from app import db

    conn = make_conn()
    try:
        db.init_db(conn)
        started_at = "2024-05-01T00:00:00Z"

        run_id = etl_runner._insert_run_metadata(conn, started_at)

        row = conn.execute(
            "SELECT status, state, updated_records, last_error, error_message"
            " FROM etl_runs WHERE id = ?",
            (run_id,),
        ).fetchone()
        assert row is not None
        assert row["status"] == "running"
        assert row["state"] == "running"
        assert row["updated_records"] == 0
        assert row["last_error"] is None
        assert row["error_message"] is None
    finally:
        conn.close()
