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

        for table in ("crops", "growth_days", "price_weekly", "etl_runs"):
            assert "AUTOINCREMENT" in table_sql[table]
    finally:
        conn.close()


def test_get_conn_creates_db_with_foreign_keys(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
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
