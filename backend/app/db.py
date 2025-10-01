from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from threading import Lock


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEFAULT_DB_FILENAME = "planting.db"

_DB_LOCK = Lock()


def _resolve_db_path() -> Path:
    env_path = os.getenv("DATABASE_FILE")
    if env_path:
        candidate = Path(env_path).expanduser()
        if not candidate.is_absolute():
            candidate = Path.cwd() / candidate
        return candidate
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR / DEFAULT_DB_FILENAME


def get_conn(readonly: bool = False) -> sqlite3.Connection:
    path = _resolve_db_path()
    if readonly:
        uri = f"file:{path.as_posix()}?mode=ro"
        connection = sqlite3.connect(uri, uri=True, check_same_thread=False)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def connect(readonly: bool = False) -> sqlite3.Connection:
    return get_conn(readonly=readonly)


def init_db(conn: sqlite3.Connection) -> None:
    with _DB_LOCK:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS crops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS growth_days (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crop_id INTEGER NOT NULL,
                region TEXT NOT NULL,
                days INTEGER NOT NULL,
                UNIQUE (crop_id, region),
                FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS price_weekly (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crop_id INTEGER NOT NULL,
                week INTEGER NOT NULL,
                price REAL NOT NULL,
                source TEXT NOT NULL,
                FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS etl_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_records INTEGER NOT NULL,
                error_message TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_price_weekly_crop_week
                ON price_weekly(crop_id, week);
            """
        )
        conn.commit()
