from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app import db, etl, etl_runner

from ._helpers import make_conn, prepare_crops


def test_start_etl_job_records_failure_metadata(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_path = tmp_path / "etl_failure.db"

    def conn_factory() -> sqlite3.Connection:
        return make_conn(db_path)

    with conn_factory() as conn:
        db.init_db(conn)
        prepare_crops(conn)

    attempts: dict[str, int] = {"count": 0}

    def failing_run_etl(conn: sqlite3.Connection, *, data_loader: object | None = None) -> int:
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
        return make_conn(db_path)

    with conn_factory() as conn:
        db.init_db(conn)
        prepare_crops(conn)

    attempts: dict[str, int] = {"count": 0}

    def flaky_run_etl(conn: sqlite3.Connection, *, data_loader: object | None = None) -> int:
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
