from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from . import db


DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _load_json(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        raise ValueError(f"Expected list in {path}")
    return [dict(item) for item in payload]


def seed(conn: sqlite3.Connection) -> None:
    crops_path = DATA_DIR / "crops.json"
    growth_days_path = DATA_DIR / "growth_days.json"

    crops_data = _load_json(crops_path)
    growth_days_data = _load_json(growth_days_path)

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
            conn.execute(
                "INSERT OR REPLACE INTO price_weekly (crop_id, week, price, source) VALUES (?, ?, ?, ?)",
                (crop_id, int(price["week"]), float(price["price"]), price["source"]),
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


def seed_from_default_db() -> None:
    conn = db.get_conn()
    try:
        db.init_db(conn)
        seed(conn)
    finally:
        conn.close()
