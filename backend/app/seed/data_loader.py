from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[3] / "data"


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        raise ValueError(f"Expected list in {path}")
    return [dict(item) for item in payload]


def load_crops(data_dir: Path | None = None) -> list[dict[str, Any]]:
    base_dir = data_dir or DATA_DIR
    return _load_json_list(base_dir / "crops.json")


def load_growth_days(data_dir: Path | None = None) -> list[dict[str, Any]]:
    base_dir = data_dir or DATA_DIR
    return _load_json_list(base_dir / "growth_days.json")


def load_price_samples(data_dir: Path | None = None) -> list[dict[str, Any]]:
    base_dir = data_dir or DATA_DIR
    path = base_dir / "price_weekly.sample.json"
    if not path.exists():
        return []
    return _load_json_list(path)
