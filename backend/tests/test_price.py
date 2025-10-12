from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.db.connection import get_conn
from app.main import app
from app.seed import seed


@pytest.fixture(scope="module")
def seeded_client() -> Iterator[TestClient]:
    seed()
    client = TestClient(app)
    try:
        yield client
    finally:
        client.close()


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


def test_price_series_ok(seeded_client: TestClient) -> None:
    r = seeded_client.get(
        "/api/price", params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W42"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["crop_id"] == 1
    assert body["prices"]
    assert body["prices"][0]["week"].startswith("2025-W")


def test_price_series_invalid_from_week(seeded_client: TestClient) -> None:
    r = seeded_client.get(
        "/api/price", params={"crop_id": 1, "frm": "invalid", "to": "2025-W42"}
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "week must be in ISO format YYYY-Www"


def test_price_series_invalid_to_week(seeded_client: TestClient) -> None:
    r = seeded_client.get(
        "/api/price", params={"crop_id": 1, "frm": "2025-W40", "to": "2024-13"}
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "week must be in ISO format YYYY-Www"


def test_price_series_city_scope_uses_city_prices(
    seeded_client: TestClient,
) -> None:
    _write_market_prices(
        [
            ("national", 1, "2025-W40", 210.0),
            ("city:13", 1, "2025-W40", 180.0),
        ]
    )
    response = seeded_client.get(
        "/api/price",
        params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W40", "marketScope": "city:13"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prices"]
    assert body["prices"][0]["avg_price"] == 180.0
    assert response.headers.get("x-market-fallback") is None


def test_price_series_city_scope_falls_back_to_national(
    seeded_client: TestClient,
) -> None:
    _write_market_prices([("national", 1, "2025-W40", 210.0)])
    response = seeded_client.get(
        "/api/price",
        params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W40", "marketScope": "city:13"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prices"]
    assert body["prices"][0]["avg_price"] == 210.0
    assert response.headers.get("x-market-fallback") == "true"


def test_price_series_blank_market_scope_uses_national_without_fallback(
    seeded_client: TestClient,
) -> None:
    _write_market_prices([("national", 1, "2025-W40", 210.0)])
    response = seeded_client.get(
        "/api/price",
        params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W40", "marketScope": ""},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prices"]
    assert body["prices"][0]["avg_price"] == 210.0
    assert response.headers.get("x-market-fallback") is None
