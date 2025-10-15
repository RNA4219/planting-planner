from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from typing import Final

from typing_extensions import TypedDict

from ..db.connection import get_conn
from ..etl_runner import metadata as etl_metadata

__all__ = ["HealthPayload", "get_health_status"]


class AppInfo(TypedDict):
    version: str


class DBInfo(TypedDict):
    status: str


class MigrationInfo(TypedDict):
    pending: int
    missing: list[str]


class HealthPayload(TypedDict):
    status: str
    app: AppInfo
    db: DBInfo
    migrations: MigrationInfo


def _determine_expected_etl_columns() -> tuple[str, ...]:
    conn = sqlite3.connect(":memory:")
    try:
        conn.row_factory = sqlite3.Row
        conn.execute(
            """
            CREATE TABLE etl_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT
            )
            """
        )
        before = {
            str(row["name"])
            for row in conn.execute("PRAGMA table_info('etl_runs')").fetchall()
        }
        etl_metadata._ensure_schema(conn)
        after = {
            str(row["name"])
            for row in conn.execute("PRAGMA table_info('etl_runs')").fetchall()
        }
        return tuple(sorted(after - before))
    finally:
        conn.close()


_EXPECTED_ETL_COLUMNS: Final[tuple[str, ...]] = _determine_expected_etl_columns()


def _missing_etl_columns(conn: sqlite3.Connection) -> list[str]:
    columns = {
        str(row["name"]) if isinstance(row, sqlite3.Row) else str(row[1])
        for row in conn.execute("PRAGMA table_info('etl_runs')").fetchall()
    }
    return [column for column in _EXPECTED_ETL_COLUMNS if column not in columns]


def get_health_status() -> HealthPayload:
    version = os.getenv("APP_VERSION", "unknown")

    try:
        with closing(get_conn(readonly=True)) as conn:
            conn.execute("SELECT 1")
            missing_columns = _missing_etl_columns(conn)
    except sqlite3.Error:
        return {
            "status": "error",
            "app": {"version": version},
            "db": {"status": "error"},
            "migrations": {
                "pending": len(_EXPECTED_ETL_COLUMNS),
                "missing": list(_EXPECTED_ETL_COLUMNS),
            },
        }

    pending = len(missing_columns)
    status = "ok" if pending == 0 else "degraded"
    return {
        "status": status,
        "app": {"version": version},
        "db": {"status": "ok"},
        "migrations": {"pending": pending, "missing": missing_columns},
    }

