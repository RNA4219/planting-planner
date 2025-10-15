from __future__ import annotations

from contextlib import closing

import pytest
from fastapi.testclient import TestClient

from app.db.connection import get_conn
from app.dependencies import prepare_database
from app.etl_runner import metadata as etl_metadata
from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_healthz_returns_component_status(monkeypatch: pytest.MonkeyPatch) -> None:
    prepare_database()

    monkeypatch.setenv("APP_VERSION", "1.2.3")

    response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["app"]["version"] == "1.2.3"
    assert payload["db"] == {"status": "ok"}
    assert payload["migrations"]["pending"] == 0


def test_healthz_reports_pending_migrations_when_etl_columns_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prepare_database()

    monkeypatch.delenv("APP_VERSION", raising=False)

    with closing(get_conn()) as conn:
        conn.execute("BEGIN")
        conn.execute("ALTER TABLE etl_runs RENAME TO etl_runs_backup")
        conn.execute(
            """
            CREATE TABLE etl_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_records INTEGER NOT NULL,
                error_message TEXT,
                state TEXT,
                started_at TEXT,
                finished_at TEXT
            )
            """
        )
        conn.execute(
            """
            INSERT INTO etl_runs (
                id,
                run_at,
                status,
                updated_records,
                error_message,
                state,
                started_at,
                finished_at
            )
            SELECT
                id,
                run_at,
                status,
                updated_records,
                error_message,
                state,
                started_at,
                finished_at
            FROM etl_runs_backup
            """
        )
        conn.execute("DROP TABLE etl_runs_backup")
        conn.commit()

    try:
        response = client.get("/healthz")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "degraded"
        assert payload["migrations"]["pending"] > 0
    finally:
        with closing(get_conn()) as conn:
            etl_metadata._ensure_schema(conn)

