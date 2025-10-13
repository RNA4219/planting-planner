from __future__ import annotations

import sqlite3
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

from .. import db as db_legacy
from .data_loader import DEFAULT_DATA_DIR, SeedPayload, load_seed_payload
from . import writers as _writers
from .writers import (
    write_crops,
    write_growth_days,
    write_market_scope_categories,
    write_market_scopes,
    write_price_samples,
    write_seed_payload,
    write_theme_tokens,
)

def _module_from(functions: dict[str, Any], *, name: str) -> ModuleType:
    module = ModuleType(name)
    for attr, value in functions.items():
        setattr(module, attr, value)
    module.__all__ = tuple(functions.keys())  # type: ignore[attr-defined]
    return module


crops_writer = _module_from({"write_crops": _writers._write_crops_impl}, name="app.seed.crops_writer")
markets_writer = _module_from(
    {
        "write_market_scopes": _writers._write_market_scopes_impl,
        "write_market_scope_categories": _writers._write_market_scope_categories_impl,
    },
    name="app.seed.markets_writer",
)

sys.modules.setdefault("app.seed.crops_writer", crops_writer)
sys.modules.setdefault("app.seed.markets_writer", markets_writer)

__all__ = [
    "DEFAULT_DATA_DIR",
    "SeedPayload",
    "load_seed_payload",
    "seed",
    "seed_from_default_db",
    "write_crops",
    "write_growth_days",
    "write_market_scopes",
    "write_market_scope_categories",
    "write_price_samples",
    "write_theme_tokens",
    "write_seed_payload",
    "crops_writer",
    "markets_writer",
]


def seed(conn: sqlite3.Connection | None = None, data_dir: Path | None = None) -> None:
    close_conn = False
    if conn is None:
        conn = db.get_conn()
        close_conn = True

    db.init_db(conn)
    payload = load_seed_payload(data_dir=data_dir)
    write_seed_payload(
        conn,
        crops=payload.crops,
        price_samples=payload.price_samples,
        growth_days=payload.growth_days,
        market_scopes=payload.market_scopes,
        market_scope_categories=payload.market_scope_categories,
        theme_tokens=payload.theme_tokens,
    )
    conn.commit()

    if close_conn:
        conn.close()


def seed_from_default_db() -> None:
    conn = db.get_conn()
    try:
        db.init_db(conn)
        seed(conn)
    finally:
        conn.close()


db = db_legacy
