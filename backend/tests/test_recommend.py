from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


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
