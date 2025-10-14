from __future__ import annotations

import logging
from collections.abc import Iterable, Mapping
from typing import Any

from ... import utils_week

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


def optional_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, _NUMERIC_TYPES):
        return float(value)
    raise TypeError(f"Unsupported numeric value: {value!r}")


def normalize_week_value(value: Any) -> str:
    if isinstance(value, int):
        return utils_week.iso_week_from_int(int(value))
    return str(value)


def convert_unit(value: str) -> tuple[str, float]:
    normalized_unit, factor = _UNIT_CONVERSIONS.get(value, (value, 1.0))
    return normalized_unit, factor


def normalize_crop_category(value: Any) -> str:
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


def iter_price_records(
    crops: Iterable[Mapping[str, Any]],
) -> Iterable[tuple[int, Mapping[str, Any]]]:
    for crop in crops:
        crop_id = int(crop["id"])
        for price in crop.get("price_weekly", []) or []:
            yield crop_id, price


def iter_market_price_records(
    crops: Iterable[Mapping[str, Any]],
) -> Iterable[tuple[int, Mapping[str, Any]]]:
    for crop in crops:
        crop_id = int(crop["id"])
        for price in crop.get("market_prices", []) or []:
            yield crop_id, price


__all__ = [
    "convert_unit",
    "iter_market_price_records",
    "iter_price_records",
    "normalize_crop_category",
    "normalize_week_value",
    "optional_float",
]
