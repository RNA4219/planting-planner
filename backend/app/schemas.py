from __future__ import annotations

from typing import Annotated, Literal, NotRequired, cast

from pydantic import AfterValidator, BaseModel
from typing_extensions import TypedDict

Region = Literal["cold", "temperate", "warm"]
RefreshState = Literal["success", "failure", "running", "stale"]
DEFAULT_REGION: Region = "temperate"


def _validate_market_scope(value: str) -> str:
    if not isinstance(value, str):  # pragma: no cover - defensive for validation
        raise TypeError("market scope must be a string")
    candidate = value.strip()
    if candidate == "national":
        return candidate
    if candidate.startswith("city:"):
        city_id = candidate.split(":", 1)[1].strip()
        if city_id:
            return f"city:{city_id}"
    raise ValueError("invalid market scope")


MarketScope = Annotated[str, AfterValidator(_validate_market_scope)]


def parse_market_scope(value: str) -> MarketScope:
    """Parse and validate a market scope string."""

    return _validate_market_scope(value)


DEFAULT_MARKET_SCOPE: MarketScope = "national"


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
