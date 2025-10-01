from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from . import db, utils_week

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_NUMERIC_TYPES = (int, float, str)


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, _NUMERIC_TYPES):
        return float(value)
    raise TypeError(f"Unsupported numeric value: {value!r}")


def _load_json(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        raise ValueError(f"Expected list in {path}")
    return [dict(item) for item in payload]


def seed(conn: sqlite3.Connection | None = None) -> None:
    close_conn = False
    if conn is None:
        conn = db.get_conn()
        close_conn = True

    db.init_db(conn)

    crops_path = DATA_DIR / "crops.json"
    growth_days_path = DATA_DIR / "growth_days.json"

    crops_data = _load_json(crops_path)
    growth_days_data = _load_json(growth_days_path)
    price_sample_path = DATA_DIR / "price_weekly.sample.json"
    price_sample_data: list[dict[str, Any]] = []
    if price_sample_path.exists():
        price_sample_data = _load_json(price_sample_path)

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

    for row in price_sample_data:
        week_iso = str(row["week"])
        conn.execute(
            """
            INSERT OR IGNORE INTO price_weekly (
                crop_id, week, avg_price, stddev, unit, source
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(row["crop_id"]),
                week_iso,
                _optional_float(row.get("avg_price")),
                _optional_float(row.get("stddev")),
                row.get("unit", "円/kg"),
                row.get("source", "seed"),
            ),
        )

    for entry in growth_days_data:
        crop_id = int(entry["crop_id"])
        conn.execute(
            "INSERT OR IGNORE INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
            (crop_id, entry["region"], int(entry["days"])),
        )
        conn.execute(
            "UPDATE growth_days SET days = ? WHERE crop_id = ? AND region = ?",
            (int(entry["days"]), crop_id, entry["region"]),
        )

    conn.commit()

    if close_conn:
        conn.close()


def seed_from_default_db() -> None:
    conn = db.get_conn()
    try:
        db.init_db(conn)
        seed(conn)
    finally:
        conn.close()
