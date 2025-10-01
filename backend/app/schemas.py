from __future__ import annotations

from typing import Literal, TypedDict

from pydantic import BaseModel


Region = Literal["cold", "temperate", "warm"]
DEFAULT_REGION: Region = "temperate"


class Crop(BaseModel):
    id: int
    name: str
    category: str


class RecommendItem(BaseModel):
    crop: str
    growth_days: int
    harvest_week: str
    sowing_week: str
    source: str = "internal"


class RecommendResponse(BaseModel):
    week: str
    region: Region
    items: list[RecommendItem]


class RefreshResponse(TypedDict):
    state: Literal["success", "failure", "running", "stale"]


class RefreshStatus(BaseModel):
    state: Literal["success", "failure", "running", "stale"]
    started_at: str | None = None
    finished_at: str | None = None
    updated_records: int = 0
    last_error: str | None = None


RefreshStatusResponse = RefreshStatus
