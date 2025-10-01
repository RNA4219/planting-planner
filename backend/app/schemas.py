from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel


class Region(str, Enum):
    cold = "cold"
    temperate = "temperate"
    warm = "warm"


class Crop(BaseModel):
    id: int
    name: str
    category: str


class RecommendationItem(BaseModel):
    crop: str
    harvest_week: str
    sowing_week: str
    source: str = "internal"


class RecommendResponse(BaseModel):
    week: str
    region: Region
    items: list[RecommendationItem]


class RecommendItem(RecommendationItem):
    """Backward compatible alias for recommendation items."""


class RefreshResponse(BaseModel):
    state: Literal["success", "failure", "running", "stale"]


class RefreshStatus(BaseModel):
    state: Literal["success", "failure", "running", "stale"]
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
