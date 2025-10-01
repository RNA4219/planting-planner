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
    last_run: str | None
    status: Literal["success", "failure", "running", "stale"]
    updated_records: int
