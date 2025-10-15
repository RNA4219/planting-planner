from __future__ import annotations

import os
import sqlite3
import threading
from pathlib import Path
from typing import Final

__all__ = ["DATABASE_FILE", "DB_LOCK", "get_conn", "ensure_parent"]

_BASE_DIR = Path(__file__).resolve().parents[2]
_DATA_DIR = _BASE_DIR / "data"
_DEFAULT_DB = _DATA_DIR / "planting.db"

DATABASE_FILE: Final[Path] = Path(os.getenv("PLANTING_DB_PATH", str(_DEFAULT_DB)))

DB_LOCK = threading.RLock()


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _database_file() -> Path:
    try:
        from app import db as db_shim
    except Exception:  # pragma: no cover - fallback during bootstrap
        return DATABASE_FILE
    candidate = getattr(db_shim, "DATABASE_FILE", None)
    if candidate is None:
        return DATABASE_FILE
    return Path(candidate)


def get_conn(*, readonly: bool = False) -> sqlite3.Connection:
    database_file = _database_file()
    ensure_parent(database_file)
    if readonly:
        uri = f"file:{database_file.as_posix()}?mode=ro"
        connection = sqlite3.connect(uri, uri=True, check_same_thread=False)
    else:
        connection = sqlite3.connect(database_file, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection
