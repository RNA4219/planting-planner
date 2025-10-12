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


def test_list_crops_filters_by_category(seeded_client: TestClient) -> None:
    response = seeded_client.get("/api/crops", params={"category": "leaf"})

    assert response.status_code == 200

    body = response.json()
    assert body, "expected at least one crop in leaf category"
    assert all(item["category"] == "leaf" for item in body)


def test_list_crops_category_all_returns_full_dataset(seeded_client: TestClient) -> None:
    default_response = seeded_client.get("/api/crops")
    all_response = seeded_client.get("/api/crops", params={"category": "all"})

    assert default_response.status_code == 200
    assert all_response.status_code == 200
    assert all_response.json() == default_response.json()
