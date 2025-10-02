from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app import db, etl


def _make_conn(path: Path | None = None) -> sqlite3.Connection:
    if path is None:
        conn = sqlite3.connect(":memory:", check_same_thread=False)
    else:
        conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _prepare_crops(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO crops (id, name, category) VALUES (1, 'A', 'leaf')")
    conn.execute("INSERT INTO crops (id, name, category) VALUES (2, 'B', 'root')")
    conn.commit()


def test_run_etl_transforms_and_upserts_weekly_prices() -> None:
    conn = _make_conn()
    try:
        db.init_db(conn)
        _prepare_crops(conn)
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


def test_start_etl_job_records_run_metadata(tmp_path: Path) -> None:
    db_path = tmp_path / "etl.db"

    def conn_factory() -> sqlite3.Connection:
        conn = _make_conn(db_path)
        return conn

    with conn_factory() as conn:
        db.init_db(conn)
        _prepare_crops(conn)

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
