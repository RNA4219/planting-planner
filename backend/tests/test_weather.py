from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes.weather import get_weather_service
from app.services.weather import WeatherService


class StubWeatherAdapter:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload
        self.calls: list[tuple[float, float]] = []

    async def get_daily(self, lat: float, lon: float) -> dict[str, Any]:
        self.calls.append((lat, lon))
        return self._payload


def create_clock(start: datetime, *, delta: timedelta) -> Callable[[], datetime]:
    moments = [start, start + delta]

    def _clock() -> datetime:
        if moments:
            return moments.pop(0)
        return start + delta

    return _clock


@pytest.fixture(name="weather_client")
def _weather_client() -> TestClient:
    return TestClient(app)


@pytest.fixture(name="reset_weather_dependency")
def _reset_weather_dependency() -> list[None]:
    resets: list[None] = []
    yield resets
    app.dependency_overrides.pop(get_weather_service, None)


def test_weather_endpoint_returns_cached_payload_within_24h(
    weather_client: TestClient, reset_weather_dependency: list[None]
) -> None:
    base_payload = {
        "daily": [
            {"date": "2024-01-01", "tmax": 25, "tmin": 15, "rain": 12, "wind": 5},
        ],
        "fetchedAt": "2024-01-01T00:00:00+00:00",
    }
    adapter = StubWeatherAdapter(base_payload)
    clock = create_clock(datetime(2024, 1, 1, tzinfo=timezone.utc), delta=timedelta(hours=1))
    service = WeatherService(adapter_factory=lambda: adapter, clock=clock)
    app.dependency_overrides[get_weather_service] = lambda: service

    first = weather_client.get("/api/weather", params={"lat": "35.0", "lon": "139.0"})
    assert first.status_code == 200
    assert first.json() == base_payload

    second = weather_client.get("/api/weather", params={"lat": "35.0", "lon": "139.0"})
    assert second.status_code == 200
    assert second.json() == base_payload
    assert adapter.calls == [(35.0, 139.0)]


def test_weather_endpoint_requires_lat_and_lon(
    weather_client: TestClient, reset_weather_dependency: list[None]
) -> None:
    response = weather_client.get("/api/weather", params={"lat": "35.0"})
    assert response.status_code == 422

    response = weather_client.get("/api/weather", params={"lon": "139.0"})
    assert response.status_code == 422
