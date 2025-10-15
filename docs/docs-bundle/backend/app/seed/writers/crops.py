from __future__ import annotations

import sqlite3
from collections.abc import Iterable, Mapping
from typing import Any

from . import _crops_common as common


def write_crops(conn: sqlite3.Connection, crops: Iterable[Mapping[str, Any]]) -> None:
    crops_list = list(crops)
    for crop in crops_list:
        crop_id = int(crop["id"])
        name = crop["name"]
        category = common.normalize_crop_category(crop["category"])
        conn.execute(
            "INSERT OR IGNORE INTO crops (id, name, category) VALUES (?, ?, ?)",
            (crop_id, name, category),
        )
        conn.execute(
            "UPDATE crops SET name = ?, category = ? WHERE id = ?",
            (name, category, crop_id),
        )

    for crop_id, price in common.iter_price_records(crops_list):
        week_iso = common.normalize_week_value(price["week"])
        conn.execute(
            """
            INSERT OR REPLACE INTO price_weekly (
                crop_id, week, avg_price, stddev, unit, source
            ) VALUES (?, ?, ?, ?, ?, ?)
            """.strip(),
            (
                crop_id,
                week_iso,
                common.optional_float(price.get("price")),
                common.optional_float(price.get("stddev")),
                price.get("unit", "円/kg"),
                price.get("source", "seed"),
            ),
        )

    for crop_id, price in common.iter_market_price_records(crops_list):
        scope = str(price["scope"])
        week_iso = common.normalize_week_value(price["week"])
        normalized_unit, factor = common.convert_unit(str(price.get("unit", "円/kg")))
        avg_price = price.get("avg_price", price.get("price"))
        avg_value = common.optional_float(avg_price)
        if avg_value is not None:
            avg_value *= factor
        stddev_value = common.optional_float(price.get("stddev"))
        if stddev_value is not None:
            stddev_value *= factor
        conn.execute(
            """
            INSERT OR REPLACE INTO market_prices (
                crop_id, scope, week, avg_price, stddev, unit, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """.strip(),
            (
                crop_id,
                scope,
                week_iso,
                avg_value,
                stddev_value,
                normalized_unit,
                price.get("source", "seed"),
            ),
        )


__all__ = ["write_crops"]
