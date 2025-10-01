from __future__ import annotations

import sqlite3
from collections.abc import Generator

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query

from . import db, etl, schemas, seed, utils_week

app = FastAPI(title="planting-planner API")


@app.on_event("startup")
def startup() -> None:
    conn = db.get_conn()
    try:
        db.init_db(conn)
        seed.seed(conn)
    finally:
        conn.close()


def get_conn() -> Generator[sqlite3.Connection, None, None]:
    conn = db.get_conn()
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
        db.init_db(conn)
        seed.seed(conn)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/crops", response_model=list[schemas.Crop])
def list_crops(conn: sqlite3.Connection = Depends(get_conn)) -> list[schemas.Crop]:
    rows = conn.execute("SELECT id, name, category FROM crops ORDER BY name").fetchall()
    return [schemas.Crop(id=row["id"], name=row["name"], category=row["category"]) for row in rows]


@app.get("/api/recommend", response_model=schemas.RecommendResponse)
def recommend(
    week: str | None = Query(default=None, description="Reference week in ISO format YYYY-Www"),
    region: schemas.Region = Query(default=schemas.DEFAULT_REGION),
    conn: sqlite3.Connection = Depends(get_conn),
) -> schemas.RecommendResponse:
    reference_week = week or utils_week.current_iso_week()
    try:
        utils_week.iso_week_to_date_mid(reference_week)
    except utils_week.WeekFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    rows = conn.execute(
        """
        SELECT c.name, gd.days
        FROM crops AS c
        INNER JOIN growth_days AS gd ON gd.crop_id = c.id AND gd.region = ?
        INNER JOIN price_weekly AS pw ON pw.crop_id = c.id AND pw.source != 'seed'
        ORDER BY pw.week, c.name
        """,
        (region,),
    ).fetchall()

    items: list[schemas.RecommendItem] = []
    for row in rows:
        harvest_week_iso = str(row["harvest_week"])
        sowing_week_iso = utils_week.subtract_days_from_week(
            harvest_week_iso, int(row["days"])
        )
        source = row["source"] or "internal"
        items.append(
            schemas.RecommendItem(
                crop=row["name"],
                growth_days=days,
                harvest_week=reference_week,
                sowing_week=utils_week.subtract_days_to_iso_week(reference_week, days),
            )
        )

    return schemas.RecommendResponse(week=reference_week, region=region, items=items)


@app.get("/api/price", response_model=schemas.PriceSeries)
def price_series(
    crop_id: int = Query(..., ge=1),
    frm: str | None = Query(None, description="from ISO week e.g., 2025-W01"),
    to: str | None = Query(None, description="to ISO week e.g., 2025-W52"),
    conn: sqlite3.Connection = Depends(get_conn),
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


def _start_refresh(background_tasks: BackgroundTasks) -> schemas.RefreshResponse:
    background_tasks.add_task(etl.start_etl_job)
    return schemas.RefreshResponse(state=etl.STATE_RUNNING)


@app.post("/api/refresh", response_model=schemas.RefreshResponse)
def refresh(background_tasks: BackgroundTasks) -> schemas.RefreshResponse:
    return _start_refresh(background_tasks)


@app.post("/refresh", response_model=schemas.RefreshResponse)
def refresh_legacy(background_tasks: BackgroundTasks) -> schemas.RefreshResponse:
    return _start_refresh(background_tasks)


def _refresh_status(conn: sqlite3.Connection) -> schemas.RefreshStatusResponse:
    status = etl.get_last_status(conn)
    payload = status.model_dump() if hasattr(status, "model_dump") else status.dict()
    return schemas.RefreshStatusResponse(**payload)



@app.get("/api/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatusResponse:
    return _refresh_status(conn)


@app.get("/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status_legacy(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatusResponse:
    return _refresh_status(conn)
