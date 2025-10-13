from __future__ import annotations

import sqlite3
from collections.abc import Sequence
from pathlib import Path


def make_conn(path: Path | None = None) -> sqlite3.Connection:
    if path is None:
        conn = sqlite3.connect(":memory:", check_same_thread=False)
    else:
        conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def prepare_crops(
    conn: sqlite3.Connection,
    crops: Sequence[tuple[int, str, str]] | None = None,
) -> None:
    rows = crops or [
        (1, "A", "leaf"),
        (2, "B", "root"),
    ]
    conn.executemany(
        "INSERT OR REPLACE INTO crops (id, name, category) VALUES (?, ?, ?)",
        rows,
    )
    conn.commit()


def seed_market_data(
    conn: sqlite3.Connection,
    *,
    theme_tokens: Sequence[tuple[str, str, str]] | None = None,
    scopes: Sequence[tuple[str, str, str, int, str]] | None = None,
    scope_categories: Sequence[tuple[str, str, str, int, str]] | None = None,
) -> None:
    if theme_tokens:
        conn.executemany(
            """
            INSERT OR REPLACE INTO theme_tokens (token, hex_color, text_color)
            VALUES (?, ?, ?)
            """,
            theme_tokens,
        )
    if scopes:
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_scopes (
                scope, display_name, timezone, priority, theme_token
            ) VALUES (?, ?, ?, ?, ?)
            """,
            scopes,
        )
    if scope_categories:
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_scope_categories (
                scope, category, display_name, priority, source
            ) VALUES (?, ?, ?, ?, ?)
            """,
            scope_categories,
        )
    conn.commit()
