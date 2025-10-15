from __future__ import annotations

import logging
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _extract_request_ids(caplog: pytest.LogCaptureFixture, logger_name: str) -> list[str]:
    return [
        record.request_id
        for record in caplog.records
        if record.name == logger_name and hasattr(record, "request_id")
    ]


def test_request_id_propagates_from_header(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO)
    request_id = "req-test-123"

    response = client.get("/api/health", headers={"x-request-id": request_id})

    assert response.status_code == 200
    request_ids = _extract_request_ids(caplog, "app.request")
    assert request_id in request_ids


def test_request_id_is_generated_when_missing(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO)

    response = client.get("/api/health")

    assert response.status_code == 200
    request_ids = _extract_request_ids(caplog, "app.request")
    assert request_ids
    generated_id = request_ids[-1]
    UUID(generated_id)
