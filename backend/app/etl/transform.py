from __future__ import annotations

import json
import logging
import sqlite3
from collections import defaultdict
from datetime import UTC, date, datetime
from typing import Any, cast

from .. import schemas, utils_week
from . import expectations
from .loader import DataLoader, load_price_feed

__all__ = ["run_etl"]

_UNIT_FACTORS: dict[str, float] = {"円/kg": 1.0, "円/100g": 10.0, "円/500g": 2.0, "円/g": 1000.0}
_LOGGER = logging.getLogger(__name__)

_CATEGORY_DISPLAY_NAMES: dict[schemas.CropCategory, str] = {
    "leaf": "葉菜類",
    "root": "根菜類",
    "flower": "花き",
}


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


def _utc_now() -> str:
    return datetime.now(tz=UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _transform_legacy_records(
    records: list[dict[str, Any]],
) -> list[tuple[int, str, float | None, float | None, str, str]]:
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
    return transformed


def _transform_market_records(
    records: list[dict[str, Any]],
) -> list[tuple[int, str, str, float | None, float | None, str, str]]:
    converted: list[tuple[int, str, str, float | None, float | None, str]] = []
    for record in records:
        unit_raw = str(record.get("unit", "円/kg")).strip()
        factor = _UNIT_FACTORS.get(unit_raw)
        if factor is None:
            raise ValueError(f"Unsupported unit: {unit_raw}")
        converted.append(
            (
                int(record["crop_id"]),
                str(record["scope"]),
                _normalize_week(record.get("week")),
                _scaled_number(record.get("avg_price"), factor),
                _scaled_number(record.get("stddev"), factor),
                str(record.get("source", "external")),
            )
        )

    converted.sort(
        key=lambda item: (
            item[0],
            item[1],
            utils_week.iso_week_to_date_mid(item[2]),
        )
    )
    history: dict[tuple[int, str], list[float | None]] = defaultdict(list)
    transformed: list[tuple[int, str, str, float | None, float | None, str, str]] = []
    for crop_id, scope, week_iso, avg_price, stddev, source in converted:
        key = (crop_id, scope)
        recent = [value for value in history[key][-3:] if value is not None]
        if avg_price is None and recent:
            avg_price = sum(recent) / len(recent)
        history[key].append(avg_price)
        transformed.append((crop_id, scope, week_iso, avg_price, stddev, "円/kg", source))
    return transformed


def _refresh_market_metadata_cache(conn: sqlite3.Connection) -> None:
    generated_at = _utc_now()
    cursor = conn.execute(
        """
        SELECT scope, display_name, timezone, priority, theme_token,
               hex_color, text_color, effective_from, categories
        FROM market_metadata
        ORDER BY priority ASC, scope ASC
        """
    )
    markets = [
        {
            "scope": row["scope"],
            "display_name": row["display_name"],
            "timezone": row["timezone"],
            "priority": row["priority"],
            "theme": {
                "token": row["theme_token"],
                "hex_color": row["hex_color"],
                "text_color": row["text_color"],
            },
            "effective_from": row["effective_from"],
            "categories": _resolve_categories(conn, row["scope"], row["categories"]),
        }
        for row in cursor.fetchall()
    ]
    payload = json.dumps(
        {
            "generated_at": generated_at,
            "markets": markets,
        },
        ensure_ascii=False,
    )
    conn.execute(
        """
        INSERT OR REPLACE INTO metadata_cache (cache_key, payload, generated_at)
        VALUES (?, ?, ?)
        """,
        ("market_metadata", payload, generated_at),
    )


def _resolve_categories(
    conn: sqlite3.Connection, scope: str, categories_payload: str | None
) -> list[dict[str, Any]]:
    if categories_payload:
        try:
            parsed = json.loads(categories_payload)
        except json.JSONDecodeError:  # pragma: no cover - defensive
            parsed = []
        else:
            if isinstance(parsed, list) and parsed:
                return [dict(item) for item in parsed]
    fallback_rows = conn.execute(
        """
        SELECT DISTINCT crops.category
        FROM market_prices
        JOIN crops ON crops.id = market_prices.crop_id
        WHERE market_prices.scope = ?
        ORDER BY crops.category ASC
        """,
        (scope,),
    ).fetchall()
    resolved: list[dict[str, Any]] = []
    for row in fallback_rows:
        category = str(row["category"])
        display_name = category
        try:
            category_key = schemas.parse_crop_category(category)
        except ValueError:
            display_name = category
        else:
            display_name = _CATEGORY_DISPLAY_NAMES.get(category_key, category)
        resolved.append(
            {
                "category": category,
                "display_name": display_name,
                "priority": 100,
                "source": "fallback",
            }
        )
    return resolved


def run_etl(conn: sqlite3.Connection, *, data_loader: DataLoader | None = None) -> int:
    if data_loader is None:
        loader = cast(DataLoader, load_price_feed)
    else:
        loader = data_loader
    records = list(loader())
    if not records:
        return 0

    market_records: list[dict[str, Any]] = []
    legacy_records: list[dict[str, Any]] = []
    for record in records:
        if record.get("scope"):
            market_records.append(record)
        else:
            legacy_records.append(record)

    transformed_legacy = _transform_legacy_records(legacy_records) if legacy_records else []
    transformed_market = _transform_market_records(market_records) if market_records else []

    if transformed_legacy:
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
            transformed_legacy,
        )

    inserted_market = transformed_market
    if transformed_market:
        dataset = [
            {
                "crop_id": crop_id,
                "scope": scope,
                "week": week_iso,
                "avg_price": avg_price,
                "stddev": stddev,
                "unit": unit,
                "source": source,
            }
            for crop_id, scope, week_iso, avg_price, stddev, unit, source in transformed_market
        ]
        fallback_required = False
        try:
            valid = expectations.validate_market_prices(conn, dataset)
        except Exception as exc:  # pragma: no cover - exercised via tests
            _LOGGER.warning("市場メタデータ検証の失敗: %s", exc, exc_info=True)
            fallback_required = True
        else:
            if not valid:
                _LOGGER.warning("市場メタデータ検証の失敗: バリデーション基準を満たしませんでした")
                fallback_required = True
        if fallback_required:
            inserted_market = [item for item in transformed_market if item[1] == "national"]
        if inserted_market:
            conn.executemany(
                """
                INSERT INTO market_prices (
                    crop_id, scope, week, avg_price, stddev, unit, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(crop_id, scope, week) DO UPDATE SET
                    avg_price = excluded.avg_price,
                    stddev = excluded.stddev,
                    unit = excluded.unit,
                    source = excluded.source
                """,
                inserted_market,
            )

    _refresh_market_metadata_cache(conn)
    conn.commit()
    return len(transformed_legacy) + len(inserted_market)
