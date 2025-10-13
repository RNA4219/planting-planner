"""Regression shims and market metadata regression tests."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from app import db, etl

from .etl import test_connection as _test_connection
from .etl import test_retry as _test_retry
from .etl import test_runner as _test_runner
from .etl import test_schema as _test_schema
from .etl._helpers import make_conn, prepare_crops

__all__ = [
    "_test_connection",
    "_test_schema",
    "_test_runner",
    "_test_retry",
]


def test_run_etl_populates_market_prices_and_cache(tmp_path: Path) -> None:
    conn = make_conn(tmp_path / "market-etl.db")
    try:
        db.init_db(conn)
        prepare_crops(conn)
        conn.executemany(
            """
            INSERT OR REPLACE INTO theme_tokens (token, hex_color, text_color)
            VALUES (?, ?, ?)
            """,
            [
                ("accent.national", "#22c55e", "#000000"),
                ("accent.tokyo", "#2563eb", "#ffffff"),
            ],
        )
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_scopes (
                scope, display_name, timezone, priority, theme_token
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("national", "全国平均", "Asia/Tokyo", 10, "accent.national"),
                ("city:tokyo", "東京都中央卸売", "Asia/Tokyo", 20, "accent.tokyo"),
            ],
        )
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_scope_categories (
                scope, category, display_name, priority, source
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("city:tokyo", "leaf", "葉菜類", 5, "seed"),
            ],
        )
        conn.commit()

        records = [
            {
                "crop_id": 1,
                "scope": "national",
                "week": "2024-01-01",
                "avg_price": 12,
                "stddev": 1,
                "unit": "円/100g",
                "source": "market",
            },
            {
                "crop_id": 1,
                "scope": "city:tokyo",
                "week": "2024-W02",
                "avg_price": 200,
                "stddev": 10,
                "unit": "円/kg",
                "source": "market",
            },
        ]

        updated = etl.run_etl(conn, data_loader=lambda: records)
        assert updated == len(records)

        rows = [
            (
                row["scope"],
                row["week"],
                row["avg_price"],
                row["stddev"],
                row["unit"],
                row["source"],
            )
            for row in conn.execute(
                "SELECT scope, week, avg_price, stddev, unit, source"
                " FROM market_prices ORDER BY scope, week"
            ).fetchall()
        ]
        assert rows == [
            (
                "city:tokyo",
                "2024-W02",
                pytest.approx(200.0),
                pytest.approx(10.0),
                "円/kg",
                "market",
            ),
            (
                "national",
                "2024-W01",
                pytest.approx(120.0),
                pytest.approx(10.0),
                "円/kg",
                "market",
            ),
        ]

        cache_row = conn.execute(
            "SELECT payload FROM metadata_cache WHERE cache_key = 'market_metadata'"
        ).fetchone()
        assert cache_row is not None
        payload = json.loads(str(cache_row["payload"]))
        assert sorted(item["scope"] for item in payload["markets"]) == [
            "city:tokyo",
            "national",
        ]
        tokyo = next(item for item in payload["markets"] if item["scope"] == "city:tokyo")
        assert tokyo["effective_from"] == "2024-W02"
        assert tokyo["theme"]["token"] == "accent.tokyo"
        assert tokyo["categories"] == [
            {
                "category": "leaf",
                "display_name": "葉菜類",
                "priority": 5,
                "source": "seed",
            }
        ]
        national = next(item for item in payload["markets"] if item["scope"] == "national")
        assert national["effective_from"] == "2024-W01"
        assert payload["generated_at"].endswith("Z")
        assert national["categories"] == [
            {
                "category": "leaf",
                "display_name": "leaf",
                "priority": 100,
                "source": "fallback",
            }
        ]
    finally:
        conn.close()


def test_run_etl_invokes_great_expectations_validation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    conn = make_conn(tmp_path / "market-validation.db")
    try:
        db.init_db(conn)
        prepare_crops(conn)
        conn.executemany(
            """
            INSERT OR REPLACE INTO theme_tokens (token, hex_color, text_color)
            VALUES (?, ?, ?)
            """,
            [("accent.national", "#22c55e", "#000000")],
        )
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_scopes (
                scope, display_name, timezone, priority, theme_token
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [("national", "全国平均", "Asia/Tokyo", 10, "accent.national")],
        )
        conn.commit()

        captured: dict[str, object] = {}

        def fake_validate(
            conn_param: sqlite3.Connection,
            dataset: list[dict[str, object]],
        ) -> bool:
            captured["conn"] = conn_param
            captured["dataset"] = dataset
            return True

        monkeypatch.setattr(etl.expectations, "validate_market_prices", fake_validate)

        records = [
            {
                "crop_id": 1,
                "scope": "national",
                "week": "2024-W05",
                "avg_price": 220,
                "stddev": 10,
                "unit": "円/kg",
                "source": "test",
            },
        ]

        updated = etl.run_etl(conn, data_loader=lambda: records)
        assert updated == 1
        assert captured["conn"] is conn
        assert captured["dataset"] == [
            {
                "crop_id": 1,
                "scope": "national",
                "week": "2024-W05",
                "avg_price": 220.0,
                "stddev": 10.0,
                "unit": "円/kg",
                "source": "test",
            }
        ]
    finally:
        conn.close()


def test_run_etl_logs_and_continues_when_validation_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    conn = make_conn(tmp_path / "market-validation-failure.db")
    try:
        db.init_db(conn)
        prepare_crops(conn)
        conn.executemany(
            """
            INSERT OR REPLACE INTO theme_tokens (token, hex_color, text_color)
            VALUES (?, ?, ?)
            """,
            [("accent.national", "#22c55e", "#000000")],
        )
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_scopes (
                scope, display_name, timezone, priority, theme_token
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [("national", "全国平均", "Asia/Tokyo", 10, "accent.national")],
        )
        conn.commit()

        def failing_validate(*_: object, **__: object) -> bool:
            raise RuntimeError("boom")

        monkeypatch.setattr(etl.expectations, "validate_market_prices", failing_validate)

        caplog.set_level("WARNING")

        records = [
            {
                "crop_id": 1,
                "scope": "national",
                "week": "2024-W05",
                "avg_price": 220,
                "stddev": 10,
                "unit": "円/kg",
                "source": "test",
            },
        ]

        updated = etl.run_etl(conn, data_loader=lambda: records)
        assert updated == 1
        assert "市場メタデータ検証の失敗" in caplog.text
        rows = conn.execute("SELECT scope, week FROM market_prices").fetchall()
        assert [(row["scope"], row["week"]) for row in rows] == [("national", "2024-W05")]
    finally:
        conn.close()


def test_run_etl_filters_city_scopes_when_validation_rejects(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    conn = make_conn(tmp_path / "market-validation-reject.db")
    try:
        db.init_db(conn)
        prepare_crops(conn)
        conn.executemany(
            """
            INSERT OR REPLACE INTO theme_tokens (token, hex_color, text_color)
            VALUES (?, ?, ?)
            """,
            [
                ("accent.national", "#22c55e", "#000000"),
                ("accent.tokyo", "#2563eb", "#ffffff"),
            ],
        )
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_scopes (
                scope, display_name, timezone, priority, theme_token
            ) VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("national", "全国平均", "Asia/Tokyo", 10, "accent.national"),
                ("city:tokyo", "東京都中央卸売", "Asia/Tokyo", 20, "accent.tokyo"),
            ],
        )
        conn.commit()

        captured: dict[str, object] = {}

        def fake_validate(
            conn_param: sqlite3.Connection,
            dataset: list[dict[str, object]],
        ) -> bool:
            captured["conn"] = conn_param
            captured["dataset"] = dataset
            return False

        monkeypatch.setattr(etl.expectations, "validate_market_prices", fake_validate)

        records = [
            {
                "crop_id": 1,
                "scope": "national",
                "week": "2024-W05",
                "avg_price": 220,
                "stddev": 10,
                "unit": "円/kg",
                "source": "test",
            },
            {
                "crop_id": 1,
                "scope": "city:tokyo",
                "week": "2024-W05",
                "avg_price": 330,
                "stddev": 12,
                "unit": "円/kg",
                "source": "test",
            },
        ]

        updated = etl.run_etl(conn, data_loader=lambda: records)
        assert updated == 1
        assert captured["conn"] is conn
        dataset = captured["dataset"]
        assert isinstance(dataset, list)
        assert sorted(item["scope"] for item in dataset) == ["city:tokyo", "national"]

        rows = conn.execute(
            "SELECT scope, week, avg_price FROM market_prices ORDER BY scope"
        ).fetchall()
        assert [(row["scope"], row["week"], row["avg_price"]) for row in rows] == [
            ("national", "2024-W05", pytest.approx(220.0)),
        ]

        cache_row = conn.execute(
            "SELECT payload FROM metadata_cache WHERE cache_key = 'market_metadata'"
        ).fetchone()
        assert cache_row is not None
        payload = json.loads(str(cache_row["payload"]))
        assert sorted(item["scope"] for item in payload["markets"]) == [
            "city:tokyo",
            "national",
        ]
        tokyo = next(item for item in payload["markets"] if item["scope"] == "city:tokyo")
        assert tokyo["effective_from"] is None
        national = next(item for item in payload["markets"] if item["scope"] == "national")
        assert national["effective_from"] == "2024-W05"
    finally:
        conn.close()
