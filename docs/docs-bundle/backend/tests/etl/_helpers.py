from __future__ import annotations

import sqlite3
from collections.abc import Iterable
from pathlib import Path

TokenRow = tuple[str, str, str]
ScopeRow = tuple[str, str, str, int, str]
CategoryRow = tuple[str, str, str, int, str]


def make_conn(path: Path | None = None) -> sqlite3.Connection:
    if path is None:
        conn = sqlite3.connect(":memory:", check_same_thread=False)
    else:
        conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def prepare_crops(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO crops (id, name, category) VALUES (1, 'A', 'leaf')")
    conn.execute("INSERT INTO crops (id, name, category) VALUES (2, 'B', 'root')")
    conn.commit()


def seed_theme_tokens(conn: sqlite3.Connection, tokens: Iterable[TokenRow]) -> None:
    conn.executemany(
        """
        INSERT OR REPLACE INTO theme_tokens (token, hex_color, text_color)
        VALUES (?, ?, ?)
        """,
        list(tokens),
    )
    conn.commit()


def seed_market_scopes(conn: sqlite3.Connection, scopes: Iterable[ScopeRow]) -> None:
    conn.executemany(
        """
        INSERT OR REPLACE INTO market_scopes (
            scope, display_name, timezone, priority, theme_token
        ) VALUES (?, ?, ?, ?, ?)
        """,
        list(scopes),
    )
    conn.commit()


def seed_market_scope_categories(
    conn: sqlite3.Connection, categories: Iterable[CategoryRow]
) -> None:
    conn.executemany(
        """
        INSERT OR REPLACE INTO market_scope_categories (
            scope, category, display_name, priority, source
        ) VALUES (?, ?, ?, ?, ?)
        """,
        list(categories),
    )
    conn.commit()
