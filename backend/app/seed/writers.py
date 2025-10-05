from __future__ import annotations

import sqlite3
from collections.abc import Iterable, Mapping
from typing import Any

from .. import utils_week

_NUMERIC_TYPES = (int, float, str)


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, _NUMERIC_TYPES):
        return float(value)
    raise TypeError(f"Unsupported numeric value: {value!r}")


def _iter_price_records(crops: Iterable[Mapping[str, Any]]) -> Iterable[tuple[int, Mapping[str, Any]]]:
    for crop in crops:
        crop_id = int(crop["id"])
        for price in crop.get("price_weekly", []) or []:
            yield crop_id, price


def write_crops(conn: sqlite3.Connection, crops: Iterable[Mapping[str, Any]]) -> None:
    crops_list = list(crops)
    for crop in crops_list:
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

    for crop_id, price in _iter_price_records(crops_list):
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
            """.strip(),
            (
                crop_id,
                week_iso,
                _optional_float(price.get("price")),
                _optional_float(price.get("stddev")),
                price.get("unit", "円/kg"),
                price.get("source", "seed"),
            ),
        )


def write_price_samples(conn: sqlite3.Connection, price_samples: Iterable[Mapping[str, Any]]) -> None:
    for row in price_samples:
        conn.execute(
            """
            INSERT OR IGNORE INTO price_weekly (
                crop_id, week, avg_price, stddev, unit, source
            ) VALUES (?, ?, ?, ?, ?, ?)
            """.strip(),
            (
                int(row["crop_id"]),
                str(row["week"]),
                _optional_float(row.get("avg_price")),
                _optional_float(row.get("stddev")),
                row.get("unit", "円/kg"),
                row.get("source", "seed"),
            ),
        )


def write_growth_days(conn: sqlite3.Connection, growth_days: Iterable[Mapping[str, Any]]) -> None:
    for entry in growth_days:
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


def write_seed_payload(
    conn: sqlite3.Connection,
    *,
    crops: Iterable[Mapping[str, Any]],
    price_samples: Iterable[Mapping[str, Any]],
    growth_days: Iterable[Mapping[str, Any]],
) -> None:
    write_crops(conn, crops)
    write_price_samples(conn, price_samples)
    write_growth_days(conn, growth_days)


__all__ = [
    "write_crops",
    "write_price_samples",
    "write_growth_days",
    "write_seed_payload",
]
