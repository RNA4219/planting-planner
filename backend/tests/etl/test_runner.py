from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from app import db, etl

from ._helpers import make_conn, prepare_crops


def test_load_price_feed_uses_default_sample() -> None:
    expected_path = Path(__file__).resolve().parents[3] / "data" / "price_weekly.sample.json"
    with expected_path.open("r", encoding="utf-8") as fh:
        expected_payload = json.load(fh)

    loaded = etl.load_price_feed()

    assert isinstance(loaded, list)
    assert loaded == expected_payload
    assert all(isinstance(item, dict) for item in loaded)


def test_load_price_feed_returns_empty_for_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "missing.json"

    loaded = etl.load_price_feed(missing)

    assert loaded == []


def test_run_etl_transforms_and_upserts_weekly_prices() -> None:
    conn = make_conn()
    try:
        db.init_db(conn)
        prepare_crops(conn)
        conn.execute(
            "INSERT INTO price_weekly (crop_id, week, avg_price, stddev, unit, source)"
            " VALUES (1, '2024-W01', 50.0, 5.0, '円/kg', 'seed')"
        )
        conn.commit()

        records = [
            {
                "crop_id": 1,
                "week": "2024-01-01",
                "avg_price": 12,
                "stddev": 0.8,
                "unit": "円/100g",
                "source": "market",
            },
            {
                "crop_id": 1,
                "week": "2024-W02",
                "avg_price": None,
                "stddev": None,
                "unit": "円/kg",
                "source": "market",
            },
            {
                "crop_id": 1,
                "week": "2024-01-15",
                "avg_price": 13,
                "stddev": 0.5,
                "unit": "円/500g",
                "source": "market",
            },
            {
                "crop_id": 2,
                "week": "2024-01-08",
                "avg_price": None,
                "stddev": None,
                "unit": "円/kg",
                "source": "market",
            },
            {
                "crop_id": 2,
                "week": "2024-01-15",
                "avg_price": 25,
                "stddev": 1.1,
                "unit": "円/100g",
                "source": "market",
            },
        ]

        updated = etl.run_etl(conn, data_loader=lambda: records)
        assert updated == len(records)

        rows = [
            (
                row["crop_id"],
                row["week"],
                row["avg_price"],
                row["stddev"],
                row["unit"],
                row["source"],
            )
            for row in conn.execute(
                "SELECT crop_id, week, avg_price, stddev, unit, source"
                " FROM price_weekly ORDER BY crop_id, week"
            ).fetchall()
        ]
        assert rows == [
            (1, "2024-W01", pytest.approx(120.0), pytest.approx(8.0), "円/kg", "market"),
            (1, "2024-W02", pytest.approx(120.0), None, "円/kg", "market"),
            (1, "2024-W03", pytest.approx(26.0), pytest.approx(1.0), "円/kg", "market"),
            (2, "2024-W02", None, None, "円/kg", "market"),
            (2, "2024-W03", pytest.approx(250.0), pytest.approx(11.0), "円/kg", "market"),
        ]
    finally:
        conn.close()


def test_run_etl_no_records_short_circuits(tmp_path: Path) -> None:
    conn = make_conn(tmp_path / "etl.sqlite")
    try:
        db.init_db(conn)
        prepare_crops(conn)

        updated = etl.run_etl(conn, data_loader=lambda: [])

        assert updated == 0
        rows = conn.execute("SELECT COUNT(*) FROM price_weekly").fetchone()
        assert rows[0] == 0
    finally:
        conn.close()


def test_start_etl_job_records_run_metadata(tmp_path: Path) -> None:
    db_path = tmp_path / "etl.db"

    def conn_factory() -> sqlite3.Connection:
        conn = make_conn(db_path)
        return conn

    with conn_factory() as conn:
        db.init_db(conn)
        prepare_crops(conn)

    payload = [
        {
            "crop_id": 1,
            "week": "2024-01-01",
            "avg_price": 10,
            "stddev": 0.4,
            "unit": "円/100g",
            "source": "loader",
        }
    ]
    attempts = {"count": 0}

    def loader() -> list[dict[str, object]]:
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise sqlite3.OperationalError("transient failure")
        return payload

    etl.start_etl_job(
        data_loader=loader,
        conn_factory=conn_factory,
        max_retries=2,
        retry_delay=0,
    )

    with conn_factory() as conn:
        row = conn.execute(
            "SELECT avg_price, unit, source FROM price_weekly"
            " WHERE crop_id = 1 AND week = '2024-W01'"
        ).fetchone()
        assert (
            row["avg_price"],
            row["unit"],
            row["source"],
        ) == (pytest.approx(100.0), "円/kg", "loader")

        run_row = conn.execute(
            "SELECT state, updated_records, last_error FROM etl_runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        assert run_row["state"] == "success"
        assert run_row["updated_records"] == len(payload)
        assert run_row["last_error"] is None

    assert attempts["count"] == 2
