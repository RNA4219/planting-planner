from __future__ import annotations

import logging
import sqlite3
import time
from datetime import datetime

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


def _wait_for_refresh_success(timeout: float = 5.0) -> dict[str, object]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        status_response = client.get(REFRESH_STATUS_ENDPOINT)
        assert status_response.status_code == 200

        payload = status_response.json()
        if payload["state"] == "failure":
            pytest.fail(f"refresh failed: {payload['last_error']}")
        if payload["state"] == "success":
            return payload
        time.sleep(0.1)
    pytest.fail("timed out waiting for refresh success")


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


def test_refresh_emits_cache_update_log_on_success(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)

    response = client.post(REFRESH_ENDPOINT)
    assert response.status_code == 200

    payload = _wait_for_refresh_success()

    caplog.clear()

    status_response = client.get(REFRESH_STATUS_ENDPOINT)
    assert status_response.status_code == 200

    target_record = None
    for record in caplog.records:
        if record.name == "app.services" and MARKET_CACHE_LOG in record.getMessage():
            target_record = record
            break
    assert target_record is not None
    assert target_record.levelno == logging.INFO
    assert getattr(target_record, "updated_records", None) == payload["updated_records"]
