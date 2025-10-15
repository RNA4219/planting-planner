from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.seed import crops_writer, writers
from app.utils_week import iso_week_from_int


def _executed_calls(conn: MagicMock) -> list[tuple[str, tuple[object, ...]]]:
    return [call.args for call in conn.execute.call_args_list]


def test_write_crops_normalizes_category_and_converts_market_units() -> None:
    conn = MagicMock()
    crops = [
        {
            "id": 101,
            "name": "Komatsuna",
            "category": "Leaf Vegetables",
            "price_weekly": [
                {
                    "week": 202301,
                    "price": "123.4",
                    "stddev": "4.5",
                    "unit": "円/kg",
                    "source": "survey",
                }
            ],
            "market_prices": [
                {
                    "scope": "city:tokyo",
                    "week": "2023-W02",
                    "avg_price": "15.0",
                    "stddev": "0.4",
                    "unit": "円/100g",
                    "source": "market",
                }
            ],
        }
    ]

    crops_writer.write_crops(conn, crops)

    executed = _executed_calls(conn)

    assert (
        "INSERT OR IGNORE INTO crops (id, name, category) VALUES (?, ?, ?)",
        (101, "Komatsuna", "leaf"),
    ) in executed
    assert (
        "UPDATE crops SET name = ?, category = ? WHERE id = ?",
        ("Komatsuna", "leaf", 101),
    ) in executed

    assert any(
        sql.startswith("INSERT OR REPLACE INTO price_weekly")
        and params
        == (
            101,
            iso_week_from_int(202301),
            123.4,
            4.5,
            "円/kg",
            "survey",
        )
        for sql, params in executed
    )

    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_prices")
        and params
        == (
            101,
            "city:tokyo",
            "2023-W02",
            150.0,
            4.0,
            "円/kg",
            "market",
        )
        for sql, params in executed
    )


def test_writers_facade_calls_crops_writer(monkeypatch: pytest.MonkeyPatch) -> None:
    conn = MagicMock()
    crops = object()
    stub = MagicMock()
    monkeypatch.setattr(crops_writer, "write_crops", stub)

    writers.write_crops(conn, crops)  # type: ignore[arg-type]

    stub.assert_called_once_with(conn, crops)
