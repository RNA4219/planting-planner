from fastapi.testclient import TestClient

from app.main import app
from app.seed import seed

seed()
client = TestClient(app)


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
