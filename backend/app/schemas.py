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


class RefreshStatus(BaseModel):
    state: Literal["success", "failure", "running", "stale"]
    started_at: str | None = None
    finished_at: str | None = None
    updated_records: int = 0
    last_error: str | None = None
