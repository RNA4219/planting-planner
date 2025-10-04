from __future__ import annotations

import sqlite3

from .connection import DB_LOCK, get_conn
from .schema import ensure_indexes, ensure_tables

__all__ = ["init_db"]


def init_db(conn: sqlite3.Connection | None = None) -> None:
    close_conn = False
    if conn is None:
        conn = get_conn()
        close_conn = True
    try:
        with DB_LOCK:
            conn.execute("BEGIN")
            try:
                ensure_tables(conn)
                ensure_indexes(conn)
            except Exception:
                conn.rollback()
                raise
            else:
                conn.commit()
    finally:
        if close_conn:
            conn.close()
