from __future__ import annotations

import os
import sqlite3
import threading
from pathlib import Path
from typing import Final

_BASE_DIR = Path(__file__).resolve().parents[2]
_DATA_DIR = _BASE_DIR / "data"
_DEFAULT_DB = _DATA_DIR / "planting.db"
DATABASE_FILE: Final[Path] = Path(os.getenv("PLANTING_DB_PATH", str(_DEFAULT_DB)))

_DB_LOCK = threading.RLock()

_TABLE_DEFINITIONS: Final[tuple[tuple[str, str], ...]] = (
    (
        "crops",
        "CREATE TABLE IF NOT EXISTS crops ("
        " id INTEGER PRIMARY KEY AUTOINCREMENT,"
        " name TEXT NOT NULL UNIQUE,"
        " category TEXT NOT NULL"
        ");",
    ),
    (
        "growth_days",
        "CREATE TABLE IF NOT EXISTS growth_days ("
        " id INTEGER PRIMARY KEY AUTOINCREMENT,"
        " crop_id INTEGER NOT NULL,"
        " region TEXT NOT NULL,"
        " days INTEGER NOT NULL,"
        " UNIQUE (crop_id, region),"
        " FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE"
        ");",
    ),
    (
        "price_weekly",
        "CREATE TABLE IF NOT EXISTS price_weekly ("
        " id INTEGER PRIMARY KEY AUTOINCREMENT,"
        " crop_id INTEGER NOT NULL,"
        " week TEXT NOT NULL,"
        " avg_price REAL,"
        " stddev REAL,"
        " unit TEXT NOT NULL DEFAULT '円/kg',"
        " source TEXT NOT NULL,"
        " UNIQUE (crop_id, week),"
        " FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE"
        ");",
    ),
    (
        "etl_runs",
        "CREATE TABLE IF NOT EXISTS etl_runs ("
        " id INTEGER PRIMARY KEY AUTOINCREMENT,"
        " run_at TEXT NOT NULL,"
        " status TEXT NOT NULL,"
        " updated_records INTEGER NOT NULL,"
        " error_message TEXT,"
        " state TEXT,"
        " started_at TEXT,"
        " finished_at TEXT,"
        " last_error TEXT"
        ");",
    ),
)

_INDEX_DEFINITIONS: Final[tuple[str, ...]] = (
    "CREATE INDEX IF NOT EXISTS idx_growth_days_crop_region" " ON growth_days(crop_id, region);",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_price_weekly_crop_week"
    " ON price_weekly(crop_id, week);",
)


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def get_conn(*, readonly: bool = False) -> sqlite3.Connection:
    _ensure_parent(DATABASE_FILE)
    if readonly:
        uri = f"file:{DATABASE_FILE.as_posix()}?mode=ro"
        connection = sqlite3.connect(uri, uri=True, check_same_thread=False)
    else:
        connection = sqlite3.connect(DATABASE_FILE, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _table_sql(conn: sqlite3.Connection, table: str) -> str | None:
    cursor = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    )
    row = cursor.fetchone()
    if row is None:
        return None
    sql = row["sql"]
    return None if sql is None else str(sql)


def _recreate_table_with_autoincrement(
    conn: sqlite3.Connection, table: str, create_sql: str
) -> None:
    temp_table = f"{table}_old_autoinc"
    conn.execute(f"ALTER TABLE {table} RENAME TO {temp_table}")
    conn.execute(create_sql)
    columns_cursor = conn.execute(f"PRAGMA table_info('{temp_table}')")
    columns = [str(row["name"]) for row in columns_cursor.fetchall()]
    column_list = ", ".join(columns)
    conn.execute(f"INSERT INTO {table} ({column_list}) SELECT {column_list} FROM {temp_table}")
    conn.execute(f"DROP TABLE {temp_table}")


def _ensure_table(conn: sqlite3.Connection, table: str, create_sql: str) -> None:
    existing_sql = _table_sql(conn, table)
    if existing_sql is None:
        conn.execute(create_sql)
        return
    if "AUTOINCREMENT" in existing_sql.upper():
        return
    _recreate_table_with_autoincrement(conn, table, create_sql)


def init_db(conn: sqlite3.Connection | None = None) -> None:
    close_conn = False
    if conn is None:
        conn = get_conn()
        close_conn = True
    try:
        with _DB_LOCK:
            conn.execute("BEGIN")
            try:
                for table, create_sql in _TABLE_DEFINITIONS:
                    _ensure_table(conn, table, create_sql)
                for index_sql in _INDEX_DEFINITIONS:
                    conn.execute(index_sql)
            except Exception:
                conn.rollback()
                raise
            else:
                conn.commit()
    finally:
        if close_conn:
            conn.close()


connect = get_conn
