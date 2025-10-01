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
    region: schemas.Region = Query(default=schemas.Region.temperate),
    conn: sqlite3.Connection = Depends(get_conn),
) -> schemas.RecommendResponse:
    reference_week = week or utils_week.current_iso_week()
    try:
        utils_week.iso_week_to_date(reference_week)
    except utils_week.WeekFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    rows = conn.execute(
        """
        SELECT c.name, gd.days, pw.week AS harvest_week, pw.source
        FROM crops AS c
        INNER JOIN growth_days AS gd ON gd.crop_id = c.id AND gd.region = ?
        INNER JOIN price_weekly AS pw ON pw.crop_id = c.id
        ORDER BY pw.week, c.name
        """,
        (region.value,),
    ).fetchall()

    items: list[schemas.RecommendationItem] = []
    for row in rows:
        harvest_week_iso = utils_week.iso_week_from_int(int(row["harvest_week"]))
        sowing_week_iso = utils_week.subtract_days_from_week(
            harvest_week_iso, int(row["days"])
        )
        source = row["source"] or "internal"
        items.append(
            schemas.RecommendationItem(
                crop=row["name"],
                harvest_week=harvest_week_iso,
                sowing_week=sowing_week_iso,
                source=source,
            )
        )

    return schemas.RecommendResponse(week=reference_week, region=region, items=items)


def _start_refresh(_conn: sqlite3.Connection) -> schemas.RefreshResponse:
    etl.start_etl_job()

    return schemas.RefreshResponse(status="refresh started")


@app.post("/api/refresh", response_model=schemas.RefreshResponse)
def refresh(_conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshResponse:
    return _start_refresh(_conn)


@app.post("/refresh", response_model=schemas.RefreshResponse)
def refresh_legacy(_conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshResponse:
    return _start_refresh(_conn)


def _refresh_status(conn: sqlite3.Connection) -> schemas.RefreshStatusResponse:
    status = etl.get_last_status(conn)
    return schemas.RefreshStatusResponse(**status)


@app.get("/api/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatusResponse:
    return _refresh_status(conn)


@app.get("/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status_legacy(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatusResponse:
    return _refresh_status(conn)
