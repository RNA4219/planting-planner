from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.parametrize("path", ["/api/refresh", "/refresh"])
def test_refresh_without_idempotency_key_returns_bad_request(path: str) -> None:
    response = client.post(path)

    assert response.status_code == 400


@pytest.mark.parametrize("path", ["/api/refresh", "/refresh"])
def test_refresh_with_idempotency_key_returns_success(path: str) -> None:
    response = client.post(path, headers={"Idempotency-Key": "test-key"})

    assert response.status_code in {200, 202}
    assert response.json() == {"state": "running"}
