from __future__ import annotations

import re

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
ISO_WEEK_PATTERN = re.compile(r"^\d{4}-W\d{2}$")


def _assert_iso_week(value: str) -> None:
    assert ISO_WEEK_PATTERN.fullmatch(value), value


def test_recommend_default_region_returns_temperate_schedule() -> None:
    response = client.get("/api/recommend")
    assert response.status_code == 200

    payload = response.json()
    assert payload["region"] == "temperate"
    _assert_iso_week(payload["week"])

    items = payload["items"]
    assert items == [
        {
            "crop": "マリーゴールド",
            "harvest_week": "2024-W38",
            "sowing_week": "2024-W28",
            "source": "MAFF",
        },
        {
            "crop": "ほうれん草",
            "harvest_week": "2024-W40",
            "sowing_week": "2024-W32",
            "source": "e-Stat",
        },
        {
            "crop": "にんじん",
            "harvest_week": "2024-W42",
            "sowing_week": "2024-W30",
            "source": "e-Stat",
        },
        {
            "crop": "ほうれん草",
            "harvest_week": "2024-W48",
            "sowing_week": "2024-W40",
            "source": "e-Stat",
        },
        {
            "crop": "トマト",
            "harvest_week": "2024-W48",
            "sowing_week": "2024-W32",
            "source": "JA Aichi",
        },
    ]

    for item in items:
        _assert_iso_week(item["harvest_week"])
        _assert_iso_week(item["sowing_week"])


def test_recommend_allows_region_override() -> None:
    response = client.get("/api/recommend", params={"region": "cold"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["region"] == "cold"
    _assert_iso_week(payload["week"])

    items = payload["items"]
    assert items == [
        {
            "crop": "マリーゴールド",
            "harvest_week": "2024-W38",
            "sowing_week": "2024-W25",
            "source": "MAFF",
        },
        {
            "crop": "ほうれん草",
            "harvest_week": "2024-W40",
            "sowing_week": "2024-W30",
            "source": "e-Stat",
        },
        {
            "crop": "にんじん",
            "harvest_week": "2024-W42",
            "sowing_week": "2024-W29",
            "source": "e-Stat",
        },
        {
            "crop": "ほうれん草",
            "harvest_week": "2024-W48",
            "sowing_week": "2024-W38",
            "source": "e-Stat",
        },
        {
            "crop": "トマト",
            "harvest_week": "2024-W48",
            "sowing_week": "2024-W30",
            "source": "JA Aichi",
        },
    ]

    for item in items:
        _assert_iso_week(item["harvest_week"])
        _assert_iso_week(item["sowing_week"])
