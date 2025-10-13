from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app import db


def _column_names(conn: sqlite3.Connection, table: str) -> list[str]:
    cursor = conn.execute(f"PRAGMA table_info('{table}')")
    rows = cursor.fetchall()
    return [str(row["name"]) for row in rows]


def test_init_db_creates_expected_tables(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    test_db = tmp_path / "schema.db"
    monkeypatch.setattr(db, "DATABASE_FILE", test_db)

    conn = db.get_conn()
    try:
        db.init_db(conn)

        assert test_db.exists()

        price_columns = _column_names(conn, "price_weekly")
        assert price_columns == [
            "id",
            "crop_id",
            "week",
            "avg_price",
            "stddev",
            "unit",
            "source",
        ]

        market_price_columns = _column_names(conn, "market_prices")
        assert market_price_columns == [
            "id",
            "crop_id",
            "scope",
            "week",
            "avg_price",
            "stddev",
            "unit",
            "source",
        ]

        scope_columns = _column_names(conn, "market_scopes")
        assert scope_columns == [
            "id",
            "scope",
            "display_name",
            "timezone",
            "priority",
            "theme_token",
        ]

        token_columns = _column_names(conn, "theme_tokens")
        assert token_columns == [
            "id",
            "token",
            "hex_color",
            "text_color",
        ]

        scope_category_columns = _column_names(conn, "market_scope_categories")
        assert scope_category_columns == [
            "id",
            "scope",
            "category",
            "display_name",
            "priority",
            "source",
        ]

        etl_columns = _column_names(conn, "etl_runs")
        assert etl_columns == [
            "id",
            "run_at",
            "status",
            "updated_records",
            "error_message",
            "state",
            "started_at",
            "finished_at",
            "last_error",
        ]
    finally:
        conn.close()


def test_tables_use_autoincrement(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    test_db = tmp_path / "schema.db"
    monkeypatch.setattr(db, "DATABASE_FILE", test_db)

    conn = db.get_conn()
    try:
        db.init_db(conn)

        cursor = conn.execute("SELECT name, sql FROM sqlite_master WHERE type = 'table'")
        rows = cursor.fetchall()
        table_sql = {row["name"]: str(row["sql"]) for row in rows}

        for table in (
            "crops",
            "growth_days",
            "price_weekly",
            "market_prices",
            "market_scopes",
            "market_scope_categories",
            "theme_tokens",
            "etl_runs",
        ):
            assert "AUTOINCREMENT" in table_sql[table]
    finally:
        conn.close()


def test_market_metadata_view_exposes_expected_columns(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    test_db = tmp_path / "schema.db"
    monkeypatch.setattr(db, "DATABASE_FILE", test_db)

    conn = db.get_conn()
    try:
        db.init_db(conn)

        columns = _column_names(conn, "market_metadata")
        assert columns == [
            "scope",
            "display_name",
            "timezone",
            "priority",
            "theme_token",
            "hex_color",
            "text_color",
            "effective_from",
            "categories",
        ]
    finally:
        conn.close()


def test_market_scope_categories_index_and_view_join(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    test_db = tmp_path / "schema.db"
    monkeypatch.setattr(db, "DATABASE_FILE", test_db)

    conn = db.get_conn()
    try:
        db.init_db(conn)
        conn.executemany(
            """
            INSERT INTO theme_tokens (token, hex_color, text_color)
            VALUES (?, ?, ?)
            """,
            [
                ("market.primary", "#22c55e", "#000000"),
                ("market.secondary", "#2563eb", "#ffffff"),
            ],
        )
        conn.executemany(
            """
            INSERT INTO market_scopes (
                scope, display_name, timezone, priority, theme_token
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("national", "全国平均", "Asia/Tokyo", 10, "market.primary"),
                ("city:tokyo", "東京都中央卸売", "Asia/Tokyo", 20, "market.secondary"),
            ],
        )
        conn.executemany(
            """
            INSERT INTO market_scope_categories (
                scope, category, display_name, priority, source
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("city:tokyo", "leaf", "葉菜類", 5, "seed"),
                ("city:tokyo", "root", "根菜類", 10, "seed"),
            ],
        )
        conn.commit()

        index_names = {
            str(row["name"])
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'index'"
                " AND tbl_name = 'market_scope_categories'"
            )
        }
        assert "idx_market_scope_categories_scope_category" in index_names

        rows = conn.execute(
            "SELECT scope, categories FROM market_metadata ORDER BY scope"
        ).fetchall()
        assert [row["scope"] for row in rows] == ["city:tokyo", "national"]
        tokyo_categories = rows[0]["categories"]
        assert tokyo_categories is not None
        assert tokyo_categories.startswith("[")
        assert "葉菜類" in tokyo_categories
    finally:
        conn.close()


def test_get_conn_creates_db_with_foreign_keys(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    test_db = tmp_path / "nested" / "schema.db"
    monkeypatch.setattr(db, "DATABASE_FILE", test_db)

    conn = db.get_conn()
    try:
        assert test_db.parent.exists()
        assert conn.row_factory is sqlite3.Row

        pragma_cursor = conn.execute("PRAGMA foreign_keys")
        pragma_value = pragma_cursor.fetchone()
        assert pragma_value is not None
        assert pragma_value[0] == 1

        conn.execute("CREATE TABLE example(id INTEGER PRIMARY KEY AUTOINCREMENT)")
    finally:
        conn.close()


def test_get_conn_readonly_rejects_writes(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    test_db = tmp_path / "schema.db"
    monkeypatch.setattr(db, "DATABASE_FILE", test_db)

    writer = db.get_conn()
    try:
        writer.execute("CREATE TABLE example(id INTEGER PRIMARY KEY AUTOINCREMENT)")
        writer.execute("INSERT INTO example DEFAULT VALUES")
        writer.commit()
    finally:
        writer.close()

    reader = db.get_conn(readonly=True)
    try:
        assert reader.row_factory is sqlite3.Row
        rows = reader.execute("SELECT id FROM example").fetchall()
        assert [row["id"] for row in rows] == [1]

        with pytest.raises(sqlite3.OperationalError):
            reader.execute("INSERT INTO example DEFAULT VALUES")
    finally:
        reader.close()
