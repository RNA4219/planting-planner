from __future__ import annotations

import sqlite3
from datetime import datetime

import logging

import pytest
from fastapi.testclient import TestClient

from app import db, seed
from app.main import app

client = TestClient(app)

REFRESH_ENDPOINT = "/api/refresh"
REFRESH_STATUS_ENDPOINT = f"{REFRESH_ENDPOINT}/status"

MARKET_CACHE_LOG = "market_metadata cache refresh confirmed"


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
    response = client.get(REFRESH_STATUS_ENDPOINT)
    assert response.status_code == 200

    payload = response.json()
    assert payload == {
        "state": "stale",
        "started_at": None,
        "finished_at": None,
        "updated_records": 0,
        "last_error": None,
    }


def test_refresh_triggers_background_job_and_updates_status() -> None:
    response = client.post(REFRESH_ENDPOINT)
    assert response.status_code == 200
    assert response.json() == {"state": "running"}

    status_response = client.get(REFRESH_STATUS_ENDPOINT)
    assert status_response.status_code == 200

    payload = status_response.json()
    assert payload["state"] in {"running", "success"}
    assert payload["last_error"] is None
    assert payload["updated_records"] >= 0

    started_at = _parse_utc(payload["started_at"])
    finished_at = _parse_utc(payload["finished_at"])

    if payload["state"] == "running":
        assert started_at is not None
        assert finished_at is None
    else:
        assert started_at is not None
        assert finished_at is not None
        assert started_at <= finished_at


def test_refresh_emits_cache_update_log(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO)

    response = client.post(REFRESH_ENDPOINT)
    assert response.status_code == 200

    messages = [record.getMessage() for record in caplog.records]
    assert any(MARKET_CACHE_LOG in message for message in messages)
