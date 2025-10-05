from __future__ import annotations

import json
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

DataLoader = Callable[[], Iterable[dict[str, Any]]]

_DATA_DIR = Path(__file__).resolve().parents[3] / "data"
_DEFAULT_PRICE_SOURCE = _DATA_DIR / "price_weekly.sample.json"

__all__ = ["DataLoader", "load_price_feed"]


def load_price_feed(path: Path | None = None) -> list[dict[str, Any]]:
    target = _DEFAULT_PRICE_SOURCE if path is None else path
    if not target.exists():
        return []
    with target.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        raise ValueError(f"Expected list payload in {target}")
    return [dict(item) for item in payload]
