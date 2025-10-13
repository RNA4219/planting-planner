from __future__ import annotations

import logging
import sys
import sqlite3
from collections.abc import Iterable, Mapping
from typing import Any

from .. import utils_week

logger = logging.getLogger(__name__)

_NUMERIC_TYPES = (int, float, str)
_UNIT_CONVERSIONS: dict[str, tuple[str, float]] = {
    "円/kg": ("円/kg", 1.0),
    "円/100g": ("円/kg", 10.0),
    "円/500g": ("円/kg", 2.0),
    "円/g": ("円/kg", 1000.0),
}

_CATEGORY_ALIASES: dict[str, str] = {
    "leaf": "leaf",
    "leafy": "leaf",
    "leaf vegetables": "leaf",
    "leaf vegetable": "leaf",
    "葉菜": "leaf",
    "葉菜類": "leaf",
    "green": "leaf",
    "greens": "leaf",
    "root": "root",
    "root vegetable": "root",
    "root vegetables": "root",
    "根菜": "root",
    "flower": "flower",
    "flowering": "flower",
    "花": "flower",
    "花菜": "flower",
    "unknown": "leaf",
}


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, _NUMERIC_TYPES):
        return float(value)
    raise TypeError(f"Unsupported numeric value: {value!r}")


def _normalize_week_value(value: Any) -> str:
    if isinstance(value, int):
        return utils_week.iso_week_from_int(int(value))
    return str(value)


def _convert_unit(value: str) -> tuple[str, float]:
    normalized_unit, factor = _UNIT_CONVERSIONS.get(value, (value, 1.0))
    return normalized_unit, factor


def _normalize_crop_category(value: Any) -> str:
    if not isinstance(value, str):
        raise TypeError(f"Unsupported crop category value: {value!r}")

    raw_value = value.strip()
    key = raw_value.lower()

    normalized = _CATEGORY_ALIASES.get(key)
    if normalized is not None:
        if key == "unknown":
            logger.warning(
                "Unknown crop category %s; defaulting to '%s' via alias",
                raw_value,
                normalized,
            )
        return normalized

    key_collapsed = key.replace("-", " ").replace("_", " ")
    key_spaced = " ".join(key_collapsed.split())
    normalized = _CATEGORY_ALIASES.get(key_spaced)
    if normalized is not None:
        return normalized

    key_compact = key_spaced.replace(" ", "")
    normalized = _CATEGORY_ALIASES.get(key_compact)
    if normalized is not None:
        return normalized

    if key.startswith("leaf"):
        return "leaf"
    if key.startswith("root"):
        return "root"
    if key.startswith("flower"):
        return "flower"

    logger.warning("Unknown crop category %s; defaulting to 'leaf'", raw_value)
    return "leaf"


def _iter_price_records(
    crops: Iterable[Mapping[str, Any]],
) -> Iterable[tuple[int, Mapping[str, Any]]]:
    for crop in crops:
        crop_id = int(crop["id"])
        for price in crop.get("price_weekly", []) or []:
            yield crop_id, price


def _iter_market_price_records(
    crops: Iterable[Mapping[str, Any]],
) -> Iterable[tuple[int, Mapping[str, Any]]]:
    for crop in crops:
        crop_id = int(crop["id"])
        for price in crop.get("market_prices", []) or []:
            yield crop_id, price


def _write_crops_impl(conn: sqlite3.Connection, crops: Iterable[Mapping[str, Any]]) -> None:
    crops_list = list(crops)
    for crop in crops_list:
        crop_id = int(crop["id"])
        name = crop["name"]
        category = _normalize_crop_category(crop["category"])
        conn.execute(
            "INSERT OR IGNORE INTO crops (id, name, category) VALUES (?, ?, ?)",
            (crop_id, name, category),
        )
        conn.execute(
            "UPDATE crops SET name = ?, category = ? WHERE id = ?",
            (name, category, crop_id),
        )

    for crop_id, price in _iter_price_records(crops_list):
        week_iso = _normalize_week_value(price["week"])
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

    for crop_id, price in _iter_market_price_records(crops_list):
        scope = str(price["scope"])
        week_iso = _normalize_week_value(price["week"])
        normalized_unit, factor = _convert_unit(str(price.get("unit", "円/kg")))
        avg_price = price.get("avg_price", price.get("price"))
        avg_value = _optional_float(avg_price)
        if avg_value is not None:
            avg_value *= factor
        stddev_value = _optional_float(price.get("stddev"))
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


def write_crops(conn: sqlite3.Connection, crops: Iterable[Mapping[str, Any]]) -> None:
    handler = getattr(sys.modules.get("app.seed.crops_writer"), "write_crops", _write_crops_impl)
    handler(conn, crops)


def write_theme_tokens(conn: sqlite3.Connection, theme_tokens: Iterable[Mapping[str, Any]]) -> None:
    for token in theme_tokens:
        conn.execute(
            """
            INSERT INTO theme_tokens (token, hex_color, text_color)
            VALUES (?, ?, ?)
            ON CONFLICT(token) DO UPDATE SET
                hex_color = excluded.hex_color,
                text_color = excluded.text_color
            """.strip(),
            (
                token["token"],
                token["hex_color"],
                token.get("text_color", "#000000"),
            ),
        )


def _write_market_scopes_impl(
    conn: sqlite3.Connection, market_scopes: Iterable[Mapping[str, Any]]
) -> None:
    for scope in market_scopes:
        conn.execute(
            """
            INSERT OR REPLACE INTO market_scopes (
                scope, display_name, timezone, priority, theme_token
            ) VALUES (?, ?, ?, ?, ?)
            """.strip(),
            (
                scope["scope"],
                scope["display_name"],
                scope.get("timezone", "Asia/Tokyo"),
                int(scope.get("priority", 100)),
                scope["theme_token"],
            ),
        )


def write_market_scopes(
    conn: sqlite3.Connection, market_scopes: Iterable[Mapping[str, Any]]
) -> None:
    handler = getattr(
        sys.modules.get("app.seed.markets_writer"),
        "write_market_scopes",
        _write_market_scopes_impl,
    )
    handler(conn, market_scopes)


def _write_market_scope_categories_impl(
    conn: sqlite3.Connection, categories: Iterable[Mapping[str, Any]]
) -> None:
    for category in categories:
        conn.execute(
            """
            INSERT OR REPLACE INTO market_scope_categories (
                scope, category, display_name, priority, source
            ) VALUES (?, ?, ?, ?, ?)
            """.strip(),
            (
                category["scope"],
                category["category"],
                category.get("display_name", category["category"]),
                int(category.get("priority", 100)),
                category.get("source", "seed"),
            ),
        )


def write_market_scope_categories(
    conn: sqlite3.Connection, categories: Iterable[Mapping[str, Any]]
) -> None:
    handler = getattr(
        sys.modules.get("app.seed.markets_writer"),
        "write_market_scope_categories",
        _write_market_scope_categories_impl,
    )
    handler(conn, categories)


def write_price_samples(
    conn: sqlite3.Connection, price_samples: Iterable[Mapping[str, Any]]
) -> None:
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
    market_scopes: Iterable[Mapping[str, Any]] = (),
    market_scope_categories: Iterable[Mapping[str, Any]] = (),
    theme_tokens: Iterable[Mapping[str, Any]] = (),
) -> None:
    theme_list = list(theme_tokens)
    if theme_list:
        write_theme_tokens(conn, theme_list)

    scope_list = list(market_scopes)
    if scope_list:
        write_market_scopes(conn, scope_list)

    category_list = list(market_scope_categories)
    if category_list:
        write_market_scope_categories(conn, category_list)

    write_crops(conn, crops)
    write_price_samples(conn, price_samples)
    write_growth_days(conn, growth_days)


__all__ = [
    "write_crops",
    "write_market_scopes",
    "write_market_scope_categories",
    "write_price_samples",
    "write_growth_days",
    "write_theme_tokens",
    "write_seed_payload",
]
