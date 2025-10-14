from __future__ import annotations

import sqlite3
from collections.abc import Iterable, Mapping


def write_growth_days(
    conn: sqlite3.Connection, growth_days: Iterable[Mapping[str, object]]
) -> None:
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


__all__ = ["write_growth_days"]
