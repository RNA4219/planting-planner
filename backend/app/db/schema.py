from __future__ import annotations

import sqlite3
from collections.abc import Iterable
from typing import Final

__all__ = [
    "TABLE_DEFINITIONS",
    "INDEX_DEFINITIONS",
    "ensure_tables",
    "ensure_indexes",
]

TABLE_DEFINITIONS: Final[tuple[tuple[str, str], ...]] = (
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
        "market_prices",
        "CREATE TABLE IF NOT EXISTS market_prices ("
        " id INTEGER PRIMARY KEY AUTOINCREMENT,"
        " crop_id INTEGER NOT NULL,"
        " scope TEXT NOT NULL,"
        " week TEXT NOT NULL,"
        " avg_price REAL,"
        " stddev REAL,"
        " unit TEXT NOT NULL DEFAULT '円/kg',"
        " source TEXT NOT NULL,"
        " UNIQUE (crop_id, scope, week),"
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

INDEX_DEFINITIONS: Final[tuple[str, ...]] = (
    "CREATE INDEX IF NOT EXISTS idx_growth_days_crop_region ON growth_days(crop_id, region);",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_price_weekly_crop_week ON price_weekly(crop_id, week);",
    "CREATE INDEX IF NOT EXISTS idx_market_prices_scope_week ON market_prices(scope, week);",
)


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


def ensure_tables(conn: sqlite3.Connection) -> None:
    for table, create_sql in TABLE_DEFINITIONS:
        existing_sql = _table_sql(conn, table)
        if existing_sql is None:
            conn.execute(create_sql)
            continue
        if "AUTOINCREMENT" in existing_sql.upper():
            continue
        _recreate_table_with_autoincrement(conn, table, create_sql)


def ensure_indexes(conn: sqlite3.Connection, *, index_sql: Iterable[str] | None = None) -> None:
    statements = INDEX_DEFINITIONS if index_sql is None else tuple(index_sql)
    for statement in statements:
        conn.execute(statement)
