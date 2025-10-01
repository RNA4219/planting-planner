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
    conn.execute("DELETE FROM crops")

    valid_crop_ids: set[int] = set()
    for crop in crops_data:
        crop_id = int(crop["id"])
        name = str(crop["name"])
        category = str(crop["category"])
        conn.execute(
            "INSERT INTO crops (id, name, category) VALUES (?, ?, ?)",
            (crop_id, name, category),
        )
        valid_crop_ids.add(crop_id)

    for entry in growth_days_data:
        crop_id = int(entry["crop_id"])
        if crop_id not in valid_crop_ids:
            raise KeyError(f"growth_days refers to unknown crop id '{crop_id}'")
        conn.execute(
            "INSERT INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
            (crop_id, str(entry["region"]), int(entry["days"])),
        )

    conn.commit()


def seed_from_default_db() -> None:
    conn = db.connect()
    try:
        seed(conn)
    finally:
        conn.close()
