from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import schemas, utils_week
from ..dependencies import ConnDependency, RecommendRegionQuery, RecommendWeekQuery

router = APIRouter(prefix="/api/recommend")


@router.get("", response_model=schemas.RecommendResponse)
def recommend(
    week: RecommendWeekQuery = None,
    region: RecommendRegionQuery = schemas.DEFAULT_REGION,
    *,
    conn: ConnDependency,
) -> schemas.RecommendResponse:
    reference_week = week or utils_week.current_iso_week()
    try:
        utils_week.iso_week_to_date_mid(reference_week)
    except utils_week.WeekFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    rows = conn.execute(
        """
        SELECT
            c.name,
            gd.days
        FROM crops AS c
        INNER JOIN growth_days AS gd ON gd.crop_id = c.id AND gd.region = ?
        ORDER BY c.name
        """,
        (region,),
    ).fetchall()

    items: list[schemas.RecommendationItem] = []
    for row in rows:
        growth_days = int(row["days"])
        sowing_week_iso = utils_week.subtract_days_to_iso_week(reference_week, growth_days)
        items.append(
            schemas.RecommendItem(
                crop=str(row["name"]),
                growth_days=growth_days,
                harvest_week=reference_week,
                sowing_week=sowing_week_iso,
                source="internal",
            )
        )

    return schemas.RecommendResponse(week=reference_week, region=region, items=items)
