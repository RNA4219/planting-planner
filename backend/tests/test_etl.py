"""Regression shims and market metadata regression tests."""

from __future__ import annotations

import json
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
        national = next(item for item in payload["markets"] if item["scope"] == "national")
        assert national["effective_from"] == "2024-W01"
        assert payload["generated_at"].endswith("Z")
    finally:
        conn.close()
