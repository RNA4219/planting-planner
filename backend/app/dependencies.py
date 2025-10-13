from __future__ import annotations

import sqlite3
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, HTTPException, Query

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


def _market_scope_query(
    value: Annotated[
        str | None,
        Query(
            alias="marketScope",
            description="Market scope identifier (national or city:<id>)",
        ),
    ] = None,
) -> schemas.MarketScope | None:
    if value is None:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    if candidate.casefold() == "all":
        return None
    if candidate == "national":
        return schemas.DEFAULT_MARKET_SCOPE
    return schemas.parse_market_scope(candidate)


def _category_query(
    value: Annotated[
        str | None,
        Query(alias="category", description="Crop category filter"),
    ] = None,
) -> schemas.CropCategory | None:
    if value is None:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    if candidate.casefold() == "all":
        return None
    try:
        return schemas.parse_crop_category(candidate)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid crop category") from exc


MarketScopeQuery = Annotated[schemas.MarketScope | None, Depends(_market_scope_query)]
CategoryQuery = Annotated[schemas.CropCategory | None, Depends(_category_query)]
