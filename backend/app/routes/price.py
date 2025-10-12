from __future__ import annotations

import sqlite3

from fastapi import APIRouter, HTTPException, Response

from .. import schemas, utils_week
from ..dependencies import (
    ConnDependency,
    FromWeekQuery,
    MarketScopeQuery,
    PriceCropQuery,
    ToWeekQuery,
)

router = APIRouter(prefix="/api/price")


def _select_market_prices(
    conn: ConnDependency,
    *,
    crop_id: int,
    scope: str,
    frm: str | None,
    to: str | None,
) -> list[sqlite3.Row]:
    clauses = ["crop_id = ?", "scope = ?"]
    params: list[object] = [crop_id, scope]
    if frm:
        clauses.append("week >= ?")
        params.append(frm)
    if to:
        clauses.append("week <= ?")
        params.append(to)
    where = " AND ".join(clauses)
    return conn.execute(
        f"""
        SELECT week, avg_price, stddev, unit, source
        FROM market_prices
        WHERE {where}
        ORDER BY week ASC
        """,
        params,
    ).fetchall()


def _select_price_weekly(
    conn: ConnDependency, *, crop_id: int, frm: str | None, to: str | None
) -> list[sqlite3.Row]:
    clauses = ["crop_id = ?"]
    params: list[object] = [crop_id]
    if frm:
        clauses.append("week >= ?")
        params.append(frm)
    if to:
        clauses.append("week <= ?")
        params.append(to)
    where = " AND ".join(clauses)
    return conn.execute(
        f"""
        SELECT week, avg_price, stddev, unit, source
        FROM price_weekly
        WHERE {where}
        ORDER BY week ASC
        """,
        params,
    ).fetchall()


@router.get("", response_model=schemas.PriceSeries)
def price_series(
    crop_id: PriceCropQuery,
    market_scope: MarketScopeQuery,
    frm: FromWeekQuery = None,
    to: ToWeekQuery = None,
    *,
    response: Response,
    conn: ConnDependency,
) -> schemas.PriceSeries:
    crop_row = conn.execute(
        "SELECT id, name FROM crops WHERE id = ?",
        (crop_id,),
    ).fetchone()
    if crop_row is None:
        raise HTTPException(status_code=404, detail="crop_not_found")

    try:
        if frm:
            utils_week.iso_week_to_date_mid(frm)
        if to:
            utils_week.iso_week_to_date_mid(to)
    except utils_week.WeekFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    scope = market_scope or schemas.DEFAULT_MARKET_SCOPE
    rows = _select_market_prices(conn, crop_id=crop_id, scope=scope, frm=frm, to=to)
    fallback = False
    if scope != schemas.DEFAULT_MARKET_SCOPE and not rows:
        fallback = True
        rows = _select_market_prices(
            conn,
            crop_id=crop_id,
            scope=schemas.DEFAULT_MARKET_SCOPE,
            frm=frm,
            to=to,
        )
    if not rows:
        rows = _select_price_weekly(conn, crop_id=crop_id, frm=frm, to=to)
    if fallback:
        response.headers["x-market-fallback"] = "true"

    unit = rows[0]["unit"] if rows else "円/kg"
    source = rows[0]["source"] if rows else "seed"
    prices = [
        schemas.PricePoint(
            week=row["week"],
            avg_price=row["avg_price"],
            stddev=row["stddev"],
        )
        for row in rows
    ]
    return schemas.PriceSeries(
        crop_id=crop_row["id"],
        crop=crop_row["name"],
        unit=unit,
        source=source,
        prices=prices,
    )
