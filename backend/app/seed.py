"""Legacy compatibility shim for seed routines.

This module remains to avoid breaking imports while the seeding
implementation lives in :mod:`backend.app.seed`. When editing, confirm:
- New entry points stay re-exported here.
- Default behaviour matches :mod:`backend.app.seed`.
"""

from __future__ import annotations

from .seed import (  # noqa: F401
    DEFAULT_DATA_DIR,
    SeedPayload,
    load_seed_payload,
    seed,
    seed_from_default_db,
    write_crops,
    write_growth_days,
    write_price_samples,
    write_seed_payload,
)

__all__ = [
    "DEFAULT_DATA_DIR",
    "SeedPayload",
    "load_seed_payload",
    "seed",
    "seed_from_default_db",
    "write_crops",
    "write_growth_days",
    "write_price_samples",
    "write_seed_payload",
]
