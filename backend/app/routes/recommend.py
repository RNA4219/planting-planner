from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response

from .. import schemas, utils_week
from ..dependencies import (
    CategoryQuery,
    ConnDependency,
    MarketScopeQuery,
    RecommendRegionQuery,
    RecommendWeekQuery,
)

router = APIRouter()
def _resolve_market_scope(
    conn: ConnDependency, scope: schemas.MarketScope | None, week: str
) -> tuple[str, bool]:
    if scope is None or scope == "national":
        return "national", False
    exists = conn.execute(
        "SELECT 1 FROM market_prices WHERE scope = ? AND week = ? LIMIT 1",
        (scope, week),
    ).fetchone()
    if exists is not None:
        return scope, False
    return "national", True


@router.get("/api/recommend", response_model=schemas.RecommendResponse)
@router.get("/recommend", response_model=schemas.RecommendResponse)
# NOTE: keep both legacy "/recommend" and current "/api/recommend" paths wired to this handler.
def recommend(
    week: RecommendWeekQuery = None,
    region: RecommendRegionQuery = schemas.DEFAULT_REGION,
    market_scope: MarketScopeQuery = None,
    category: CategoryQuery = None,
    *,
    response: Response,
    conn: ConnDependency,
) -> schemas.RecommendResponse:
    reference_week = week or utils_week.current_iso_week()
    try:
        utils_week.iso_week_to_date_mid(reference_week)
    except utils_week.WeekFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    _, fallback = _resolve_market_scope(conn, market_scope, reference_week)
    if fallback:
        response.headers["x-market-fallback"] = "true"

    query = [
        "SELECT",
        "    c.name,",
        "    gd.days",
        "FROM crops AS c",
        "INNER JOIN growth_days AS gd ON gd.crop_id = c.id",
        "WHERE gd.region = ?",
    ]
    params: list[object] = [region]
    if category is not None:
        query.append("AND c.category = ?")
        params.append(category)
    query.append("ORDER BY c.name")

    rows = conn.execute("\n".join(query), params).fetchall()

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
