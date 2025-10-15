from __future__ import annotations

import sqlite3
from collections.abc import Iterable, Mapping
from typing import SupportsInt, TypeGuard


def _is_supports_int(value: object) -> TypeGuard[SupportsInt]:
    return hasattr(value, "__int__")


def _coerce_int(value: object, *, field: str) -> int:
    if isinstance(value, bool):
        raise TypeError(f"{field} must be an integer, got bool")
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        return int(value)
    if _is_supports_int(value):
        return int(value)
    raise TypeError(f"{field} must be an integer, got {type(value).__name__}")


def _coerce_str(value: object, *, field: str) -> str:
    if isinstance(value, str):
        return value
    raise TypeError(f"{field} must be a string, got {type(value).__name__}")


def write_growth_days(
    conn: sqlite3.Connection, growth_days: Iterable[Mapping[str, object]]
) -> None:
    for entry in growth_days:
        crop_id = _coerce_int(entry["crop_id"], field="crop_id")
        region = _coerce_str(entry["region"], field="region")
        days = _coerce_int(entry["days"], field="days")
        conn.execute(
            "INSERT OR IGNORE INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
            (crop_id, region, days),
        )
        conn.execute(
            "UPDATE growth_days SET days = ? WHERE crop_id = ? AND region = ?",
            (days, crop_id, region),
        )


__all__ = ["write_growth_days"]
