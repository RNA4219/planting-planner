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

    conn.execute("DELETE FROM growth_days")
    conn.execute("DELETE FROM prices")
    conn.execute("DELETE FROM crops")

    name_to_id: dict[str, int] = {}
    for crop in crops_data:
        name = crop["name"]
        category = crop["category"]
        cursor = conn.execute(
            "INSERT INTO crops (name, category) VALUES (?, ?)",
            (name, category),
        )
        crop_id = int(cursor.lastrowid)
        name_to_id[name] = crop_id

        for price in crop.get("prices", []):
            conn.execute(
                "INSERT INTO prices (crop_id, week, price, source) VALUES (?, ?, ?, ?)",
                (crop_id, int(price["week"]), float(price["price"]), price["source"]),
            )

    for entry in growth_days_data:
        crop_name = entry["crop"]
        crop_id = name_to_id.get(crop_name)
        if crop_id is None:
            raise KeyError(f"growth_days refers to unknown crop '{crop_name}'")
        conn.execute(
            "INSERT OR REPLACE INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
            (crop_id, entry["region"], int(entry["days"])),
        )

    conn.commit()


def seed_from_default_db() -> None:
    conn = db.connect()
    try:
        seed(conn)
    finally:
        conn.close()
