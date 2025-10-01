from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _utc_now() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run(conn: Any) -> int:
    updated_records = conn.execute("SELECT COUNT(*) FROM price_weekly").fetchone()[0]
    conn.execute(
        "INSERT INTO etl_runs (run_at, status, updated_records, error_message) VALUES (?, ?, ?, ?)",
        (_utc_now(), "success", int(updated_records), None),
    )
    conn.commit()
    return int(updated_records)


def latest_status(conn: Any) -> dict[str, Any]:
    row = conn.execute(
        "SELECT run_at, status, updated_records, error_message FROM etl_runs ORDER BY run_at DESC LIMIT 1"
    ).fetchone()
    if row is None:
        return {"last_run": None, "status": "stale", "updated_records": 0}
    return {
        "last_run": row["run_at"],
        "status": row["status"],
        "updated_records": int(row["updated_records"]),
        "error_message": row["error_message"],
    }
