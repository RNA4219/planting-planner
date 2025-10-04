from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_DATA_DIR = Path(__file__).resolve().parents[3] / "data"


@dataclass(frozen=True)
class SeedPayload:
    crops: list[dict[str, Any]]
    price_samples: list[dict[str, Any]]
    growth_days: list[dict[str, Any]]


def _ensure_list(payload: Any, *, source: Path) -> list[dict[str, Any]]:
    if not isinstance(payload, list):
        raise ValueError(f"Expected list in {source}")
    return [dict(item) for item in payload]


def _load_json(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as fh:
        return _ensure_list(json.load(fh), source=path)


def load_seed_payload(data_dir: Path | None = None) -> SeedPayload:
    base_dir = data_dir or DEFAULT_DATA_DIR
    crops_data = _load_json(base_dir / "crops.json")
    growth_days_data = _load_json(base_dir / "growth_days.json")

    price_sample_path = base_dir / "price_weekly.sample.json"
    price_sample_data: list[dict[str, Any]] = []
    if price_sample_path.exists():
        price_sample_data = _load_json(price_sample_path)

    return SeedPayload(
        crops=crops_data,
        price_samples=price_sample_data,
        growth_days=growth_days_data,
    )


__all__ = [
    "DEFAULT_DATA_DIR",
    "SeedPayload",
    "load_seed_payload",
]
