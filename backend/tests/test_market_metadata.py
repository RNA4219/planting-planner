from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db.connection import get_conn
from app.main import app
from app.seed import seed

seed()
client = TestClient(app)


def _clear_cache() -> None:
    conn = get_conn()
    try:
        conn.execute("DELETE FROM metadata_cache WHERE cache_key = 'market_metadata'")
        conn.commit()
    finally:
        conn.close()


def _write_cache(payload: dict[str, Any]) -> None:
    conn = get_conn()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO metadata_cache (cache_key, payload, generated_at)
            VALUES (?, ?, ?)
            """,
            (
                "market_metadata",
                json.dumps(payload, ensure_ascii=False),
                str(payload["generated_at"]),
            ),
        )
        conn.commit()
    finally:
        conn.close()


@pytest.fixture(autouse=True)
def _reset_cache() -> Iterator[None]:
    _clear_cache()
    yield
    _clear_cache()


def test_get_markets_returns_cached_payload() -> None:
    payload = {
        "generated_at": "2024-01-01T00:00:00Z",
        "markets": [
            {
                "scope": "national",
                "display_name": "全国平均",
            }
        ],
    }
    _write_cache(payload)

    response = client.get("/api/markets")

    assert response.status_code == 200
    body = response.json()
    assert body["generated_at"] == payload["generated_at"]
    assert body["markets"] == payload["markets"]


def test_get_markets_returns_503_when_cache_missing() -> None:
    response = client.get("/api/markets")

    assert response.status_code == 503
    assert response.json() == {"detail": "market metadata cache not ready"}
