from __future__ import annotations

import sqlite3

from .. import db
from . import data_loader, writers

__all__ = [
    "seed",
    "seed_from_default_db",
    "data_loader",
    "writers",
]


def seed(conn: sqlite3.Connection | None = None) -> None:
    close_conn = False
    if conn is None:
        conn = db.get_conn()
        close_conn = True

    db.init_db(conn)

    crops_data = data_loader.load_crops()
    growth_days_data = data_loader.load_growth_days()
    price_sample_data = data_loader.load_price_samples()

    writers.write_crops_and_prices(conn, crops_data)
    writers.write_price_samples(conn, price_sample_data)
    writers.write_growth_days(conn, growth_days_data)

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
