from __future__ import annotations

import logging

from app.schemas import TelemetryEvent
from app.services import log_telemetry_event


def test_log_telemetry_event_includes_metadata(caplog: logging.LogCaptureFixture) -> None:
    event = TelemetryEvent(
        event="sw-cache-hit",
        request_id="req-123",
        app_version="1.2.3",
        schema_version="2024-01",
        data_epoch="2024-02-01",
        payload={"cache": "install"},
        timestamp="2024-05-01T00:00:00Z",
    )

    with caplog.at_level(logging.INFO):
        log_telemetry_event(event)

    records = [
        record
        for record in caplog.records
        if record.levelno == logging.INFO and record.message == "telemetry event received"
    ]
    assert records, "telemetry log entry not found"

    record = records[-1]
    assert record.app_version == event.app_version
    assert record.schema_version == event.schema_version
    assert record.data_epoch == event.data_epoch
    assert record.timestamp == event.timestamp
