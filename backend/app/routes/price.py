from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import schemas
from ..dependencies import ConnDependency, FromWeekQuery, PriceCropQuery, ToWeekQuery

router = APIRouter(prefix="/api/price")


@router.get("", response_model=schemas.PriceSeries)
def price_series(
    crop_id: PriceCropQuery,
    frm: FromWeekQuery = None,
    to: ToWeekQuery = None,
    *,
    conn: ConnDependency,
) -> schemas.PriceSeries:
    crop_row = conn.execute(
        "SELECT id, name FROM crops WHERE id = ?",
        (crop_id,),
    ).fetchone()
    if crop_row is None:
        raise HTTPException(status_code=404, detail="crop_not_found")

    params: list[object] = [crop_id]
    cond = "WHERE crop_id = ?"
    if frm:
        cond += " AND week >= ?"
        params.append(frm)
    if to:
        cond += " AND week <= ?"
        params.append(to)

    rows = conn.execute(
        f"""
        SELECT week, avg_price, stddev, unit, source
        FROM price_weekly
        {cond}
        ORDER BY week ASC
        """,
        params,
    ).fetchall()

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
