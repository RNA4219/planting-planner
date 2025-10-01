from __future__ import annotations

import sqlite3
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException, Query

from . import db, etl, seed, utils_week
from . import schemas


app = FastAPI(title="planting-planner API")


@app.on_event("startup")
def startup() -> None:
    conn = db.connect()
    try:
        db.init_db(conn)
        seed.seed(conn)
    finally:
        conn.close()


def get_conn() -> Generator[sqlite3.Connection, None, None]:
    conn = db.connect()
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/crops", response_model=list[schemas.Crop])
def list_crops(conn: sqlite3.Connection = Depends(get_conn)) -> list[schemas.Crop]:
    rows = conn.execute("SELECT id, name, category FROM crops ORDER BY name").fetchall()
    return [schemas.Crop(id=row["id"], name=row["name"], category=row["category"]) for row in rows]


@app.get("/recommend", response_model=schemas.RecommendResponse)
def recommend(
    week: int | None = Query(default=None, description="Sowing week in YYYYWW format"),
    region: schemas.Region = Query(default=schemas.Region.temperate),
    conn: sqlite3.Connection = Depends(get_conn),
) -> schemas.RecommendResponse:
    target_week = week or utils_week.current_week()
    try:
        utils_week.week_to_date(target_week)
    except utils_week.WeekFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    rows = conn.execute(
        """
        SELECT c.name, gd.days, p.week AS harvest_week, p.source
        FROM crops AS c
        INNER JOIN growth_days AS gd ON gd.crop_id = c.id AND gd.region = ?
        INNER JOIN price_weekly AS p ON p.crop_id = c.id
        """,
        (region.value,),
    ).fetchall()

    items: list[schemas.RecommendationItem] = []
    for row in rows:
        weeks_to_harvest = utils_week.weeks_from_days(int(row["days"]))
        sowing_week = utils_week.subtract_weeks(int(row["harvest_week"]), weeks_to_harvest)
        if sowing_week != target_week:
            continue
        items.append(
            schemas.RecommendationItem(
                crop=row["name"],
                harvest_week=int(row["harvest_week"]),
                sowing_week=sowing_week,
                source=row["source"],
            )
        )

    items.sort(key=lambda item: (item.harvest_week, item.crop))
    return schemas.RecommendResponse(week=target_week, region=region, items=items)


@app.post("/refresh", response_model=schemas.RefreshResponse)
def refresh(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshResponse:
    etl.run(conn)
    return schemas.RefreshResponse(status="refresh started")


@app.get("/refresh/status", response_model=schemas.RefreshStatusResponse)
def refresh_status(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatusResponse:
    status = etl.latest_status(conn)
    return schemas.RefreshStatusResponse(
        last_run=status.get("last_run"),
        status=status.get("status", "stale"),
        updated_records=int(status.get("updated_records", 0)),
    )
