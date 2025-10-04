from __future__ import annotations

import sqlite3
from pathlib import Path


def make_conn(path: Path | None = None) -> sqlite3.Connection:
    if path is None:
        conn = sqlite3.connect(":memory:", check_same_thread=False)
    else:
        conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def prepare_crops(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO crops (id, name, category) VALUES (1, 'A', 'leaf')")
    conn.execute("INSERT INTO crops (id, name, category) VALUES (2, 'B', 'root')")
    conn.commit()
