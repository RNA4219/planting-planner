from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import seed


@pytest.fixture(scope="module")
def seeded_client() -> Iterator[TestClient]:
    seed()
    client = TestClient(app)
    try:
        yield client
    finally:
        client.close()


def test_list_crops_returns_seeded_data(seeded_client: TestClient) -> None:
    response = seeded_client.get("/api/crops")

    assert response.status_code == 200

    body = response.json()
    assert isinstance(body, list)
    assert body, "seed should provide at least one crop"
    for item in body:
        assert isinstance(item, dict)
        assert set(item) >= {"id", "name", "category"}


def test_list_crops_method_not_allowed(seeded_client: TestClient) -> None:
    response = seeded_client.post("/api/crops")

    assert response.status_code == 405
