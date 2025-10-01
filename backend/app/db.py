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


def init_db(conn: sqlite3.Connection | None = None) -> None:
    close_conn = False
    if conn is None:
        conn = get_conn()
        close_conn = True
    try:
        with _DB_LOCK:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS crops (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    category TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS growth_days (
                    id INTEGER PRIMARY KEY,
                    crop_id INTEGER NOT NULL,
                    region TEXT NOT NULL,
                    days INTEGER NOT NULL,
                    UNIQUE (crop_id, region),
                    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS price_weekly (
                    id INTEGER PRIMARY KEY,
                    crop_id INTEGER NOT NULL,
                    week TEXT NOT NULL,
                    avg_price REAL,
                    stddev REAL,
                    unit TEXT NOT NULL DEFAULT '円/kg',
                    source TEXT NOT NULL,
                    UNIQUE (crop_id, week),
                    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS etl_runs (
                    id INTEGER PRIMARY KEY,
                    run_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    updated_records INTEGER NOT NULL,
                    error_message TEXT,
                    state TEXT,
                    started_at TEXT,
                    finished_at TEXT,
                    last_error TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_growth_days_crop_region
                    ON growth_days(crop_id, region);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_price_weekly_crop_week
                    ON price_weekly(crop_id, week);
                """
            )
            conn.commit()
    finally:
        if close_conn:
            conn.close()


connect = get_conn
