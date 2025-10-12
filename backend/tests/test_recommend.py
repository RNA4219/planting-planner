from __future__ import annotations

import re
from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.db.connection import get_conn
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
    response = client.get("/api/recommend", params={"week": REFERENCE_WEEK, "region": "cold"})
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


def _write_market_prices(records: list[tuple[str, int, str, float | None]] | None = None) -> None:
    conn = get_conn()
    try:
        conn.execute("DELETE FROM market_prices")
        if records:
            for scope, crop_id, week, avg_price in records:
                conn.execute(
                    """
                    INSERT INTO market_prices (
                        crop_id, scope, week, avg_price, stddev, unit, source
                    ) VALUES (?, ?, ?, ?, NULL, '円/kg', 'market')
                    """,
                    (crop_id, scope, week, avg_price),
                )
        conn.commit()
    finally:
        conn.close()


def test_recommend_city_scope_uses_city_prices_when_available() -> None:
    _write_market_prices(
        [
            ("national", 1, REFERENCE_WEEK, 120.0),
            ("city:13", 1, REFERENCE_WEEK, 150.0),
        ]
    )
    response = client.get(
        "/api/recommend",
        params={"week": REFERENCE_WEEK, "marketScope": "city:13"},
    )
    assert response.status_code == 200
    assert response.headers.get("x-market-fallback") is None


def test_recommend_city_scope_missing_prices_sets_fallback_header() -> None:
    _write_market_prices([("national", 1, REFERENCE_WEEK, 120.0)])
    response = client.get(
        "/api/recommend",
        params={"week": REFERENCE_WEEK, "marketScope": "city:13"},
    )
    assert response.status_code == 200
    assert response.headers.get("x-market-fallback") == "true"


def test_recommend_blank_market_scope_treated_as_national() -> None:
    _write_market_prices([("national", 1, REFERENCE_WEEK, 120.0)])
    response = client.get(
        "/api/recommend",
        params={"week": REFERENCE_WEEK, "marketScope": ""},
    )
    assert response.status_code == 200
    assert response.headers.get("x-market-fallback") is None


def test_recommend_all_market_scope_treated_as_national() -> None:
    _write_market_prices([("national", 1, REFERENCE_WEEK, 120.0)])
    response = client.get(
        "/api/recommend",
        params={"week": REFERENCE_WEEK, "marketScope": "all"},
    )
    assert response.status_code == 200
    assert response.headers.get("x-market-fallback") is None


def test_recommend_category_all_returns_full_schedule() -> None:
    default_response = client.get("/api/recommend", params={"week": REFERENCE_WEEK})
    all_response = client.get(
        "/api/recommend",
        params={"week": REFERENCE_WEEK, "category": "all"},
    )

    assert default_response.status_code == 200
    assert all_response.status_code == 200
    assert all_response.json() == default_response.json()


def test_recommend_legacy_path_returns_same_payload() -> None:
    api_response = client.get("/api/recommend", params={"week": REFERENCE_WEEK})
    legacy_response = client.get("/recommend", params={"week": REFERENCE_WEEK})

    assert api_response.status_code == 200
    assert legacy_response.status_code == 200
    assert legacy_response.json() == api_response.json()
