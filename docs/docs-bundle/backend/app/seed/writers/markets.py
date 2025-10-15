from __future__ import annotations

import sqlite3
from collections.abc import Iterable, Mapping
from typing import Any

from . import _crops_common as common


def write_market_scopes(
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


def write_market_scope_categories(
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
                common.optional_float(row.get("avg_price")),
                common.optional_float(row.get("stddev")),
                row.get("unit", "円/kg"),
                row.get("source", "seed"),
            ),
        )


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


__all__ = [
    "write_market_scope_categories",
    "write_market_scopes",
    "write_price_samples",
    "write_theme_tokens",
]
