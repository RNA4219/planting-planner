from __future__ import annotations

import os
import sqlite3
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEFAULT_DB_FILENAME = "planting.db"


def get_db_path() -> Path:
    env_path = os.getenv("PLANTING_DB_PATH")
    if env_path:
        return Path(env_path)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR / DEFAULT_DB_FILENAME


def connect(readonly: bool = False) -> sqlite3.Connection:
    path = get_db_path()
    if readonly:
        uri = f"file:{path.as_posix()}?mode=ro"
        connection = sqlite3.connect(uri, uri=True, check_same_thread=False)
    else:
        connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db(conn: sqlite3.Connection) -> None:
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

        CREATE TABLE IF NOT EXISTS prices (
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

        CREATE INDEX IF NOT EXISTS idx_prices_crop_week ON prices(crop_id, week);
        """
    )
    conn.commit()
