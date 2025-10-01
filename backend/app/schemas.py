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
    harvest_week: int
    sowing_week: int
    source: str


class RecommendResponse(BaseModel):
    week: int
    region: Region
    items: list[RecommendationItem]


class RefreshResponse(BaseModel):
    status: str


class RefreshStatusResponse(BaseModel):
    status: Literal["success", "failure", "running", "stale"]
    state: Literal["success", "failure", "running", "stale"]
    last_run: str | None
    started_at: str | None = None
    finished_at: str | None = None
    updated_records: int
    last_error: str | None = None
