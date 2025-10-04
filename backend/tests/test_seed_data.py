from __future__ import annotations

from unittest.mock import Mock, call

from app.seed import writers


def _make_conn() -> Mock:
    conn = Mock()
    conn.execute = Mock()
    return conn


def test_write_crops_and_prices():
    fake_conn = _make_conn()
    data = [
        {
            "id": "1",
            "name": "Tomato",
            "category": "Vegetable",
            "price_weekly": [
                {"week": 202301, "price": "123", "stddev": None, "unit": "円/kg"}
            ],
        }
    ]

    writers.write_crops_and_prices(fake_conn, data)

    calls = fake_conn.execute.call_args_list
    assert calls[0] == call(
        "INSERT OR IGNORE INTO crops (id, name, category) VALUES (?, ?, ?)",
        (1, "Tomato", "Vegetable"),
    )
    assert calls[1] == call(
        "UPDATE crops SET name = ?, category = ? WHERE id = ?",
        ("Tomato", "Vegetable", 1),
    )
    price_sql, price_args = calls[2].args
    assert "INSERT OR REPLACE INTO price_weekly" in price_sql
    assert price_args == (1, "2023-W01", 123.0, None, "円/kg", "seed")


def test_write_price_samples():
    rows = [
        {
            "crop_id": "5",
            "week": "2022-W52",
            "avg_price": "88.5",
            "stddev": "3.2",
            "unit": "円/kg",
            "source": "survey",
        }
    ]

    fake_conn = _make_conn()

    writers.write_price_samples(fake_conn, rows)

    fake_conn.execute.assert_called_once()
    sample_sql, sample_args = fake_conn.execute.call_args.args
    assert "INSERT OR IGNORE INTO price_weekly" in sample_sql
    assert sample_args == (5, "2022-W52", 88.5, 3.2, "円/kg", "survey")


def test_write_growth_days():
    fake_conn = _make_conn()
    entries = [
        {"crop_id": "2", "region": "関東", "days": "45"},
    ]

    writers.write_growth_days(fake_conn, entries)

    assert fake_conn.execute.call_args_list == [
        call(
            "INSERT OR IGNORE INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
            (2, "関東", 45),
        ),
        call(
            "UPDATE growth_days SET days = ? WHERE crop_id = ? AND region = ?",
            (45, 2, "関東"),
        ),
    ]
