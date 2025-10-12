from __future__ import annotations

import sqlite3
from typing import Any

__all__ = ["validate_market_prices"]


def validate_market_prices(conn: sqlite3.Connection, dataset: list[dict[str, Any]]) -> bool:
    scopes = {str(row[0]) for row in conn.execute("SELECT scope FROM market_scopes")}
    for record in dataset:
        scope = str(record.get("scope", ""))
        if scope not in scopes:
            raise ValueError(f"Unknown market scope: {scope}")
        avg_price = record.get("avg_price")
        if avg_price is None:
            continue
        price_value = float(avg_price)
        if not (0.0 <= price_value <= 1_000_000.0):
            raise ValueError(f"avg_price out of range: {price_value}")
    return True
