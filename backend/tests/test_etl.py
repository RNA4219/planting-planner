from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app import db, etl
from app import etl_runner


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


def test_resolve_conn_factory_uses_default(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = {"count": 0}

    def fake_get_conn() -> sqlite3.Connection:
        calls["count"] += 1
        return _make_conn()

    monkeypatch.setattr(db, "get_conn", fake_get_conn)

    factory = etl_runner._resolve_conn_factory(None)
    with factory() as conn:  # type: ignore[call-arg]
        assert isinstance(conn, sqlite3.Connection)

    assert calls["count"] == 1


def test_ensure_schema_backfills_missing_columns(tmp_path: Path) -> None:
    conn = _make_conn(tmp_path / "legacy.db")
    try:
        conn.execute(
            """
            CREATE TABLE etl_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_records INTEGER NOT NULL,
                error_message TEXT
            )
            """
        )
        conn.commit()

        etl_runner._ensure_schema(conn)

        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info('etl_runs')").fetchall()
        }
        assert {"state", "started_at", "finished_at", "last_error"}.issubset(columns)
    finally:
        conn.close()


def test_insert_run_metadata_persists_defaults() -> None:
    conn = _make_conn()
    try:
        db.init_db(conn)
        started_at = "2024-05-01T00:00:00Z"

        run_id = etl_runner._insert_run_metadata(conn, started_at)

        row = conn.execute(
            "SELECT status, state, updated_records, last_error, error_message"
            " FROM etl_runs WHERE id = ?",
            (run_id,),
        ).fetchone()
        assert row is not None
        assert row["status"] == "running"
        assert row["state"] == "running"
        assert row["updated_records"] == 0
        assert row["last_error"] is None
        assert row["error_message"] is None
    finally:
        conn.close()


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


def test_start_etl_job_records_failure_metadata(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_path = tmp_path / "etl_failure.db"

    def conn_factory() -> sqlite3.Connection:
        return _make_conn(db_path)

    with conn_factory() as conn:
        db.init_db(conn)
        _prepare_crops(conn)

    attempts: dict[str, int] = {"count": 0}

    def failing_run_etl(
        conn: sqlite3.Connection, *, data_loader: object | None = None
    ) -> int:
        attempts["count"] += 1
        raise RuntimeError("boom")

    monkeypatch.setattr(etl_runner, "_load_run_etl", lambda: failing_run_etl)

    with pytest.raises(RuntimeError):
        etl.start_etl_job(conn_factory=conn_factory, max_retries=5, retry_delay=0)

    assert attempts["count"] == 1

    with conn_factory() as conn:
        row = conn.execute(
            """
            SELECT state, status, started_at, finished_at, updated_records, last_error
            FROM etl_runs
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()
        assert row is not None
        assert row["state"] == "failure"
        assert row["status"] == "failure"
        assert row["last_error"] == "boom"
        assert row["finished_at"] is not None
        assert row["started_at"] is not None
        assert row["updated_records"] == 0


def test_start_etl_job_retries_database_errors(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_path = tmp_path / "etl_retry.db"

    def conn_factory() -> sqlite3.Connection:
        return _make_conn(db_path)

    with conn_factory() as conn:
        db.init_db(conn)
        _prepare_crops(conn)

    attempts: dict[str, int] = {"count": 0}

    def flaky_run_etl(
        conn: sqlite3.Connection, *, data_loader: object | None = None
    ) -> int:
        attempts["count"] += 1
        raise sqlite3.OperationalError("db locked")

    monkeypatch.setattr(etl_runner, "_load_run_etl", lambda: flaky_run_etl)

    with pytest.raises(sqlite3.OperationalError):
        etl.start_etl_job(conn_factory=conn_factory, max_retries=3, retry_delay=0)

    assert attempts["count"] == 3

    with conn_factory() as conn:
        row = conn.execute(
            """
            SELECT state, status, updated_records, last_error
            FROM etl_runs
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()
        assert row is not None
        assert row["state"] == "failure"
        assert row["status"] == "failure"
        assert row["updated_records"] == 0
        assert row["last_error"] == "db locked"
