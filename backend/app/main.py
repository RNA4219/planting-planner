from __future__ import annotations

import sqlite3
from collections.abc import Generator

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query

from . import db, etl, schemas, seed, utils_week

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
        SELECT c.name, gd.days, p.week AS harvest_week, p.source
        FROM crops AS c
        INNER JOIN growth_days AS gd ON gd.crop_id = c.id AND gd.region = ?
        INNER JOIN prices AS p ON p.crop_id = c.id
        ORDER BY p.week, c.name
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


@app.post("/api/refresh")
def refresh(background_tasks: BackgroundTasks) -> dict[str, str]:
    background_tasks.add_task(etl.start_etl_job)

    return {"state": etl.STATE_RUNNING}


@app.get("/api/refresh/status", response_model=schemas.RefreshStatus)
def refresh_status(conn: sqlite3.Connection = Depends(get_conn)) -> schemas.RefreshStatus:
    return etl.get_last_status(conn)
