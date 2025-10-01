from __future__ import annotations

import re
from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
ISO_WEEK_PATTERN = re.compile(r"^(\d{4})-W(\d{2})$")
REFERENCE_WEEK = "2024-W40"
REGION_GROWTH_DAYS: dict[str, dict[str, int]] = {
    "temperate": {
        "ほうれん草": 56,
        "にんじん": 80,
        "トマト": 110,
        "マリーゴールド": 70,
    },
    "cold": {
        "ほうれん草": 70,
        "にんじん": 90,
        "トマト": 120,
        "マリーゴールド": 85,
    },
}


def _assert_iso_week(value: str) -> tuple[int, int]:
    match = ISO_WEEK_PATTERN.fullmatch(value)
    assert match is not None, value
    return int(match.group(1)), int(match.group(2))


def _subtract_days(week: str, days: int) -> str:
    year, week_no = _assert_iso_week(week)
    base = date.fromisocalendar(year, week_no, 3)
    target = base - timedelta(days=days)
    iso = target.isocalendar()
    return f"{iso.year:04d}-W{iso.week:02d}"


def _assert_items(payload: dict[str, object], region: str) -> None:
    assert payload["region"] == region
    assert payload["week"] == REFERENCE_WEEK

    items = payload["items"]
    assert isinstance(items, list)
    assert len(items) == 4

    items_by_crop = {item["crop"]: item for item in items}
    assert set(items_by_crop) == {
        "ほうれん草",
        "にんじん",
        "トマト",
        "マリーゴールド",
    }

    for crop, days in REGION_GROWTH_DAYS[region].items():
        item = items_by_crop[crop]
        assert item["harvest_week"] == REFERENCE_WEEK
        expected_sowing = _subtract_days(REFERENCE_WEEK, days)
        assert item["sowing_week"] == expected_sowing
        assert item["growth_days"] == days
        assert item["source"] == "internal"
        _assert_iso_week(item["harvest_week"])
        _assert_iso_week(item["sowing_week"])


def test_recommend_default_region_returns_temperate_schedule() -> None:
    response = client.get("/api/recommend", params={"week": REFERENCE_WEEK})
    assert response.status_code == 200

    payload = response.json()
    _assert_items(payload, region="temperate")


def test_recommend_allows_region_override() -> None:
    response = client.get(
        "/api/recommend", params={"week": REFERENCE_WEEK, "region": "cold"}
    )
    assert response.status_code == 200

    payload = response.json()
    _assert_items(payload, region="cold")


def test_recommend_ignores_price_sources_for_metadata() -> None:
    response = client.get("/api/recommend", params={"week": REFERENCE_WEEK})
    assert response.status_code == 200

    payload = response.json()
    items = payload["items"]
    assert isinstance(items, list)
    assert items, "no recommendation items returned"

    sources = {item["source"] for item in items}
    assert sources == {"internal"}
