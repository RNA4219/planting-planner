from __future__ import annotations

import logging

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_telemetry_event_is_logged(caplog: logging.LogCaptureFixture) -> None:
    payload = {
        "event": "sw-cache-hit",
        "requestId": "abc-123",
        "appVersion": "1.2.3",
        "schemaVersion": "2024-01",
        "dataEpoch": "2024-02-01",
        "payload": {"cache": "install"},
        "timestamp": "2024-05-01T00:00:00Z",
    }

    with caplog.at_level(logging.INFO):
        response = client.post("/api/telemetry", json=payload)

    assert response.status_code == 202

    records = [
        record
        for record in caplog.records
        if record.levelno == logging.INFO and record.message == "telemetry event received"
    ]
    assert records, "telemetry log entry not found"

    record = records[-1]
    assert record.event == payload["event"]
    assert record.request_id == payload["requestId"]
    assert record.payload == payload["payload"]


def test_telemetry_validation_errors() -> None:
    response = client.post(
        "/api/telemetry",
        json={"event": "missing-app-version"},
    )

    assert response.status_code == 422
