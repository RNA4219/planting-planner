from __future__ import annotations

from fastapi.testclient import TestClient

from app.db.connection import get_conn
from app.main import app
from app.seed import seed

seed()
client = TestClient(app)


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


def test_price_series_ok():
    r = client.get("/api/price", params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W42"})
    assert r.status_code == 200
    body = r.json()
    assert body["crop_id"] == 1
    assert body["prices"]
    assert body["prices"][0]["week"].startswith("2025-W")


def test_price_series_invalid_from_week():
    r = client.get("/api/price", params={"crop_id": 1, "frm": "invalid", "to": "2025-W42"})
    assert r.status_code == 400
    assert r.json()["detail"] == "week must be in ISO format YYYY-Www"


def test_price_series_invalid_to_week():
    r = client.get("/api/price", params={"crop_id": 1, "frm": "2025-W40", "to": "2024-13"})
    assert r.status_code == 400
    assert r.json()["detail"] == "week must be in ISO format YYYY-Www"


def test_price_series_city_scope_uses_city_prices() -> None:
    _write_market_prices(
        [
            ("national", 1, "2025-W40", 210.0),
            ("city:13", 1, "2025-W40", 180.0),
        ]
    )
    response = client.get(
        "/api/price",
        params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W40", "marketScope": "city:13"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prices"]
    assert body["prices"][0]["avg_price"] == 180.0
    assert response.headers.get("fallback") is None
    assert "fallback" in (response.headers.get("access-control-expose-headers") or "").split(",")


def test_price_series_city_scope_falls_back_to_national() -> None:
    _write_market_prices([("national", 1, "2025-W40", 210.0)])
    response = client.get(
        "/api/price",
        params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W40", "marketScope": "city:13"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prices"]
    assert body["prices"][0]["avg_price"] == 210.0
    assert response.headers.get("fallback") == "true"
    assert "fallback" in (response.headers.get("access-control-expose-headers") or "").split(",")


def test_price_series_blank_market_scope_uses_national_without_fallback() -> None:
    _write_market_prices([("national", 1, "2025-W40", 210.0)])
    response = client.get(
        "/api/price",
        params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W40", "marketScope": ""},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prices"]
    assert body["prices"][0]["avg_price"] == 210.0
    assert response.headers.get("fallback") is None
    assert "fallback" in (response.headers.get("access-control-expose-headers") or "").split(",")


def test_price_series_all_market_scope_uses_national_without_fallback() -> None:
    _write_market_prices([("national", 1, "2025-W40", 210.0)])
    response = client.get(
        "/api/price",
        params={"crop_id": 1, "frm": "2025-W40", "to": "2025-W40", "marketScope": "all"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prices"]
    assert body["prices"][0]["avg_price"] == 210.0
    assert response.headers.get("fallback") is None
    assert "fallback" in (response.headers.get("access-control-expose-headers") or "").split(",")


def test_price_series_invalid_market_scope_returns_422() -> None:
    response = client.get(
        "/api/price",
        params={
            "crop_id": 1,
            "frm": "2025-W40",
            "to": "2025-W40",
            "marketScope": "city:",
        },
    )
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid market scope"}
