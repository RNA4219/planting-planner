from __future__ import annotations

import sqlite3
from datetime import datetime

from fastapi.testclient import TestClient

from app import db, seed
from app.main import app

client = TestClient(app)


def _reset_etl_runs() -> None:
    conn = db.connect()
    try:
        try:
            conn.execute("DELETE FROM etl_runs")
        except sqlite3.OperationalError:
            db.init_db(conn)
            seed.seed(conn)
            conn.execute("DELETE FROM etl_runs")
        conn.commit()
    finally:
        conn.close()


def _parse_utc(timestamp: str | None) -> datetime | None:
    if timestamp is None:
        return None
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))


def setup_function(_: object) -> None:
    _reset_etl_runs()


def teardown_function(_: object) -> None:
    _reset_etl_runs()


def test_refresh_status_returns_default_payload() -> None:
    response = client.get("/refresh/status")
    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "stale"
    assert payload["state"] == "stale"
    assert payload["last_run"] is None
    assert payload["started_at"] is None
    assert payload["finished_at"] is None
    assert payload["updated_records"] == 0
    assert payload["last_error"] is None


def test_refresh_triggers_background_job_and_updates_status() -> None:
    response = client.post("/refresh")
    assert response.status_code == 200
    assert response.json() == {"status": "refresh started"}

    status_response = client.get("/refresh/status")
    assert status_response.status_code == 200

    payload = status_response.json()
    assert payload["status"] == "success"
    assert payload["state"] == "success"
    assert payload["last_error"] is None
    assert payload["updated_records"] >= 0

    started_at = _parse_utc(payload["started_at"])
    finished_at = _parse_utc(payload["finished_at"])
    last_run = _parse_utc(payload["last_run"])

    assert started_at is not None
    assert finished_at is not None
    assert last_run == finished_at
    assert started_at <= finished_at
