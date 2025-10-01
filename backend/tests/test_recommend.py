import json
from pathlib import Path

from fastapi.testclient import TestClient

from app import db, seed
from app.main import app


DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _load_crops() -> dict[str, int]:
    with (DATA_DIR / "crops.json").open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    name_to_id: dict[str, int] = {}
    for item in data:
        name_to_id[str(item["name"])] = int(item["id"])
    return name_to_id


def _ensure_price_data() -> None:
    name_to_id = _load_crops()
    conn = db.get_conn()
    try:
        db.init_db(conn)
        seed.seed(conn)
        conn.execute("DELETE FROM price_weekly")
        conn.executemany(
            "INSERT INTO price_weekly (crop_id, week, price, source) VALUES (?, ?, ?, ?)",
            [
                (name_to_id["ほうれん草"], 202440, 260.0, "e-Stat"),
                (name_to_id["ほうれん草"], 202448, 240.0, "e-Stat"),
                (name_to_id["にんじん"], 202442, 210.0, "e-Stat"),
                (name_to_id["トマト"], 202448, 520.0, "JA Aichi"),
            ],
        )
        conn.commit()
    finally:
        conn.close()


client = TestClient(app)
_ensure_price_data()


def test_recommend_default_region_uses_temperate_growth_days() -> None:
    response = client.get("/recommend", params={"week": 202432})
    assert response.status_code == 200

    payload = response.json()
    assert payload["week"] == 202432
    assert payload["region"] == "temperate"

    items = payload["items"]
    assert len(items) == 2

    spinach, tomato = items
    assert spinach == {
        "crop": "ほうれん草",
        "harvest_week": 202440,
        "sowing_week": 202432,
        "source": "e-Stat",
    }
    assert tomato == {
        "crop": "トマト",
        "harvest_week": 202448,
        "sowing_week": 202432,
        "source": "JA Aichi",
    }


def test_recommend_allows_region_override() -> None:
    response = client.get("/recommend", params={"week": 202430, "region": "cold"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["week"] == 202430
    assert payload["region"] == "cold"

    items = payload["items"]
    assert len(items) == 2

    spinach, tomato = items
    assert spinach["crop"] == "ほうれん草"
    assert spinach["harvest_week"] == 202440
    assert spinach["sowing_week"] == 202430
    assert spinach["source"] == "e-Stat"

    assert tomato["crop"] == "トマト"
    assert tomato["harvest_week"] == 202448
    assert tomato["sowing_week"] == 202430
    assert tomato["source"] == "JA Aichi"
