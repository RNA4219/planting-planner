from __future__ import annotations

import sqlite3
from collections.abc import Iterable
from typing import Any

from .. import utils_week

_NUMERIC_TYPES = (int, float, str)


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, _NUMERIC_TYPES):
        return float(value)
    raise TypeError(f"Unsupported numeric value: {value!r}")


def write_crops_and_prices(
    conn: sqlite3.Connection, crops_data: Iterable[dict[str, Any]]
) -> None:
    for crop in crops_data:
        crop_id = int(crop["id"])
        name = crop["name"]
        category = crop["category"]
        conn.execute(
            "INSERT OR IGNORE INTO crops (id, name, category) VALUES (?, ?, ?)",
            (crop_id, name, category),
        )
        conn.execute(
            "UPDATE crops SET name = ?, category = ? WHERE id = ?",
            (name, category, crop_id),
        )

        for price in crop.get("price_weekly", []):
            week_value = price["week"]
            if isinstance(week_value, int):
                week_iso = utils_week.iso_week_from_int(int(week_value))
            else:
                week_iso = str(week_value)
            conn.execute(
                """
                INSERT OR REPLACE INTO price_weekly (
                    crop_id, week, avg_price, stddev, unit, source
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    crop_id,
                    week_iso,
                    _optional_float(price.get("price")),
                    _optional_float(price.get("stddev")),
                    price.get("unit", "円/kg"),
                    price.get("source", "seed"),
                ),
            )


def write_price_samples(
    conn: sqlite3.Connection, rows: Iterable[dict[str, Any]]
) -> None:
    for row in rows:
        conn.execute(
            """
            INSERT OR IGNORE INTO price_weekly (
                crop_id, week, avg_price, stddev, unit, source
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(row["crop_id"]),
                str(row["week"]),
                _optional_float(row.get("avg_price")),
                _optional_float(row.get("stddev")),
                row.get("unit", "円/kg"),
                row.get("source", "seed"),
            ),
        )


def write_growth_days(
    conn: sqlite3.Connection, entries: Iterable[dict[str, Any]]
) -> None:
    for entry in entries:
        crop_id = int(entry["crop_id"])
        region = entry["region"]
        days = int(entry["days"])
        conn.execute(
            "INSERT OR IGNORE INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
            (crop_id, region, days),
        )
        conn.execute(
            "UPDATE growth_days SET days = ? WHERE crop_id = ? AND region = ?",
            (days, crop_id, region),
        )
