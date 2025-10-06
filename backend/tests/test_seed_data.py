from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app import seed as seed_module
from app.seed import data_loader
from app.utils_week import iso_week_from_int


@pytest.fixture
def seed_payload() -> data_loader.SeedPayload:
    return data_loader.SeedPayload(
        crops=[
            {
                "id": 1,
                "name": "Lettuce",
                "category": "Leafy",
                "price_weekly": [
                    {
                        "week": 202301,
                        "price": 120,
                        "stddev": 5,
                        "unit": "円/kg",
                        "source": "survey",
                    }
                ],
            }
        ],
        price_samples=[
            {
                "crop_id": 2,
                "week": "2023-W02",
                "avg_price": 150,
                "stddev": 10,
                "unit": "円/kg",
                "source": "seed",
            }
        ],
        growth_days=[
            {"crop_id": 1, "region": "tokyo", "days": 65},
        ],
    )


def test_seed_inserts_expected_records(
    monkeypatch: pytest.MonkeyPatch, seed_payload: data_loader.SeedPayload
) -> None:
    monkeypatch.setattr(seed_module.db, "init_db", lambda conn: None)
    monkeypatch.setattr(seed_module, "load_seed_payload", lambda data_dir=None: seed_payload)

    conn = MagicMock()

    seed_module.seed(conn=conn)

    executed = [call.args for call in conn.execute.call_args_list]

    assert (
        "INSERT OR IGNORE INTO crops (id, name, category) VALUES (?, ?, ?)",
        (1, "Lettuce", "Leafy"),
    ) in executed
    assert (
        "UPDATE crops SET name = ?, category = ? WHERE id = ?",
        ("Lettuce", "Leafy", 1),
    ) in executed

    assert any(
        sql.startswith("INSERT OR REPLACE INTO price_weekly")
        and params
        == (
            1,
            iso_week_from_int(202301),
            120.0,
            5.0,
            "円/kg",
            "survey",
        )
        for sql, params in executed
    )
    assert any(
        sql.startswith("INSERT OR IGNORE INTO price_weekly")
        and params == (2, "2023-W02", 150.0, 10.0, "円/kg", "seed")
        for sql, params in executed
    )

    assert (
        "INSERT OR IGNORE INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
        (1, "tokyo", 65),
    ) in executed
    assert (
        "UPDATE growth_days SET days = ? WHERE crop_id = ? AND region = ?",
        (65, 1, "tokyo"),
    ) in executed

    conn.commit.assert_called_once_with()
