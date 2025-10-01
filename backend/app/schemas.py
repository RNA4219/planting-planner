from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

from pydantic import BaseModel

Region = Literal["cold", "temperate", "warm"]
RefreshState = Literal["success", "failure", "running", "stale"]
DEFAULT_REGION: Region = "temperate"


class Crop(BaseModel):
    id: int
    name: str
    category: str


class RecommendationItem(BaseModel):
    crop: str
    growth_days: int
    harvest_week: str
    sowing_week: str
    source: str = "internal"


class RecommendResponse(BaseModel):
    week: str
    region: Region
    items: list[RecommendationItem]


class RecommendItem(RecommendationItem):
    """Backward compatible alias for recommendation items."""


class RefreshTriggerPayload(TypedDict, total=False):
    """Payload accepted by the refresh trigger endpoints."""

    force: NotRequired[bool]


class RefreshResponse(BaseModel):
    state: RefreshState


class RefreshStatus(BaseModel):
    state: RefreshState
    started_at: str | None = None
    finished_at: str | None = None
    updated_records: int = 0
    last_error: str | None = None


class RefreshStatusResponse(RefreshStatus):
    """Alias for compatibility with existing endpoints."""


class PricePoint(BaseModel):
    week: str
    avg_price: float | None = None
    stddev: float | None = None


class PriceSeries(BaseModel):
    crop_id: int
    crop: str
    unit: str
    source: str
    prices: list[PricePoint]
