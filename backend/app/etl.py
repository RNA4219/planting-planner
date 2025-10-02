from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from collections.abc import Callable, Iterable
from datetime import date
from pathlib import Path
from typing import Any

from . import etl_runner as _etl_runner
from . import utils_week

STATE_FAILURE = _etl_runner.STATE_FAILURE
STATE_RUNNING = _etl_runner.STATE_RUNNING
STATE_STALE = _etl_runner.STATE_STALE
STATE_SUCCESS = _etl_runner.STATE_SUCCESS
start_etl_job = _etl_runner.start_etl_job
get_last_status = _etl_runner.get_last_status

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_DEFAULT_PRICE_SOURCE = _DATA_DIR / "price_weekly.sample.json"
_UNIT_FACTORS: dict[str, float] = {"円/kg": 1.0, "円/100g": 10.0, "円/500g": 2.0, "円/g": 1000.0}

DataLoader = Callable[[], Iterable[dict[str, Any]]]


def load_price_feed(path: Path | None = None) -> list[dict[str, Any]]:
    target = _DEFAULT_PRICE_SOURCE if path is None else path
    if not target.exists():
        return []
    with target.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        raise ValueError(f"Expected list payload in {target}")
    return [dict(item) for item in payload]


def _normalize_week(value: Any) -> str:
    if isinstance(value, int):
        return utils_week.iso_week_from_int(int(value))
    if isinstance(value, str):
        raw = value.strip()
        try:
            utils_week.iso_week_to_date_mid(raw)
        except utils_week.WeekFormatError:
            try:
                parsed = date.fromisoformat(raw)
            except ValueError as exc:  # pragma: no cover - defensive
                raise ValueError(f"Unsupported week value: {value!r}") from exc
            return utils_week.date_to_iso_week(parsed)
        return raw
    raise TypeError(f"Unsupported week value: {value!r}")


def _scaled_number(value: Any, factor: float) -> float | None:
    if value is None:
        return None
    if isinstance(value, int | float):
        return float(value) * factor
    raise TypeError(f"Unsupported numeric value: {value!r}")


def run_etl(conn: sqlite3.Connection, *, data_loader: DataLoader | None = None) -> int:
    loader = load_price_feed if data_loader is None else data_loader
    records = list(loader())
    if not records:
        return 0

    converted: list[tuple[int, str, float | None, float | None, str]] = []
    for record in records:
        unit_raw = str(record.get("unit", "円/kg")).strip()
        factor = _UNIT_FACTORS.get(unit_raw)
        if factor is None:
            raise ValueError(f"Unsupported unit: {unit_raw}")
        converted.append(
            (
                int(record["crop_id"]),
                _normalize_week(record.get("week")),
                _scaled_number(record.get("avg_price"), factor),
                _scaled_number(record.get("stddev"), factor),
                str(record.get("source", "external")),
            )
        )

    converted.sort(key=lambda item: (item[0], utils_week.iso_week_to_date_mid(item[1])))
    history: dict[int, list[float | None]] = defaultdict(list)
    transformed: list[tuple[int, str, float | None, float | None, str, str]] = []
    for crop_id, week_iso, avg_price, stddev, source in converted:
        recent = [value for value in history[crop_id][-3:] if value is not None]
        if avg_price is None and recent:
            avg_price = sum(recent) / len(recent)
        history[crop_id].append(avg_price)
        transformed.append((crop_id, week_iso, avg_price, stddev, "円/kg", source))

    conn.executemany(
        """
        INSERT INTO price_weekly (
            crop_id, week, avg_price, stddev, unit, source
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(crop_id, week) DO UPDATE SET
            avg_price = excluded.avg_price,
            stddev = excluded.stddev,
            unit = excluded.unit,
            source = excluded.source
        """,
        transformed,
    )
    conn.commit()
    return len(transformed)


