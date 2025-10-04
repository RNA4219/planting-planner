from __future__ import annotations

import sqlite3
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Query

from . import schemas, seed
from .db.connection import get_conn as get_db_conn
from .db.migrations import init_db


def prepare_database() -> None:
    conn = get_db_conn()
    try:
        init_db(conn)
        seed.seed(conn)
    finally:
        conn.close()


def get_conn() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_conn()
    _ensure_seeded(conn)
    try:
        yield conn
    finally:
        conn.close()


def _ensure_seeded(conn: sqlite3.Connection) -> None:
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='crops'"
    ).fetchone()
    if exists is None:
        init_db(conn)
        seed.seed(conn)


ConnDependency = Annotated[sqlite3.Connection, Depends(get_conn)]
RecommendWeekQuery = Annotated[
    str | None, Query(description="Reference week in ISO format YYYY-Www")
]
RecommendRegionQuery = Annotated[
    schemas.Region, Query(description="Growing region for the recommendation schedule")
]
PriceCropQuery = Annotated[int, Query(ge=1)]
FromWeekQuery = Annotated[str | None, Query(description="from ISO week e.g., 2025-W01")]
ToWeekQuery = Annotated[str | None, Query(description="to ISO week e.g., 2025-W52")]
