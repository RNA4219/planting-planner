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
        ORDER BY c.name
        """,
        (region,),
    ).fetchall()

    items: list[schemas.RecommendItem] = []
    for row in rows:
        days = int(row["days"])
        items.append(
            schemas.RecommendItem(
                crop=row["name"],
                growth_days=days,
                harvest_week=reference_week,
                sowing_week=utils_week.subtract_days_to_iso_week(reference_week, days),
            )
        )

    return schemas.RecommendResponse(week=reference_week, region=region, items=items)


def _start_refresh(_conn: sqlite3.Connection) -> schemas.RefreshResponse:
    etl.start_etl_job()


    return {"state": etl.STATE_RUNNING}


@app.post("/api/refresh", response_model=schemas.RefreshResponse)
def refresh(_conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshResponse:
    return _start_refresh(_conn)


@app.post("/refresh", response_model=schemas.RefreshResponse)
def refresh_legacy(_conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshResponse:
    return _start_refresh(_conn)


def _refresh_status(conn: sqlite3.Connection) -> schemas.RefreshStatusResponse:
    status = etl.get_last_status(conn)
    return schemas.RefreshStatusResponse(**status.model_dump())


@app.get("/api/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatusResponse:
    return _refresh_status(conn)


@app.get("/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status_legacy(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatusResponse:
    return _refresh_status(conn)
