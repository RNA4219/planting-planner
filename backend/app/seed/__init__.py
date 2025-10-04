from __future__ import annotations

import sqlite3
from pathlib import Path

from .. import db as db_legacy
from .data_loader import DEFAULT_DATA_DIR, SeedPayload, load_seed_payload
from .writers import write_crops, write_growth_days, write_price_samples, write_seed_payload

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
