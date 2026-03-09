from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.compat import UTC
from app.main import app
from app.routes.weather import get_weather_service
from app.services.weather import OpenMeteoWeatherAdapter, WeatherService


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
    clock = create_clock(datetime(2024, 1, 1, tzinfo=UTC), delta=timedelta(hours=1))
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


def test_weather_module_initializes_when_registry_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    import importlib
    import sys
    from types import ModuleType

    original_adapter = sys.modules.get("adapter")
    original_weather = sys.modules.get("app.services.weather")

    monkeypatch.setitem(sys.modules, "adapter", ModuleType("adapter"))
    monkeypatch.delitem(sys.modules, "app.services.weather", raising=False)

    weather_module = importlib.import_module("app.services.weather")
    assert getattr(weather_module, "adapter_registry", None) is None

    if original_weather is not None:
        sys.modules["app.services.weather"] = original_weather
    else:
        sys.modules.pop("app.services.weather", None)

    if original_adapter is not None:
        sys.modules["adapter"] = original_adapter
    else:
        sys.modules.pop("adapter", None)


def test_open_meteo_adapter_normalizes_daily_forecast() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/forecast"
        assert request.url.params["daily"] == (
            "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"
        )
        assert request.url.params["wind_speed_unit"] == "ms"
        return httpx.Response(
            200,
            json={
                "daily": {
                    "time": ["2024-01-01", "2024-01-02"],
                    "temperature_2m_max": [11.2, 13.4],
                    "temperature_2m_min": [2.3, 4.5],
                    "precipitation_sum": [0.0, 1.2],
                    "wind_speed_10m_max": [3.4, 5.6],
                }
            },
        )

    async def run() -> dict[str, Any]:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport, base_url="https://api.open-meteo.com") as client:
            adapter = OpenMeteoWeatherAdapter(
                client=client,
                base_url="/v1/forecast",
                clock=lambda: datetime(2024, 1, 1, tzinfo=UTC),
            )
            return await adapter.get_daily(35.0, 139.0)

    payload = asyncio.run(run())

    assert payload == {
        "daily": [
            {"date": "2024-01-01", "tmax": 11.2, "tmin": 2.3, "rain": 0.0, "wind": 3.4},
            {"date": "2024-01-02", "tmax": 13.4, "tmin": 4.5, "rain": 1.2, "wind": 5.6},
        ],
        "fetchedAt": "2024-01-01T00:00:00+00:00",
    }


def test_weather_service_uses_default_adapter_when_registry_has_no_weather(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.services.weather as weather_module

    payload = {
        "daily": [
            {"date": "2024-01-01", "tmax": 10, "tmin": 3, "rain": 0, "wind": 2},
            {"date": "2024-01-02", "tmax": 12, "tmin": 4, "rain": 1, "wind": 3},
        ],
        "fetchedAt": "2024-01-01T00:00:00+00:00",
    }
    adapter = StubWeatherAdapter(payload)
    service = WeatherService(clock=lambda: datetime(2024, 1, 1, tzinfo=UTC))

    class EmptyRegistry:
        def get(self, name: str) -> Any:
            raise KeyError(name)

    monkeypatch.setattr(weather_module, "adapter_registry", EmptyRegistry())
    monkeypatch.setattr(WeatherService, "_create_default_adapter", lambda self: adapter)

    response = asyncio.run(service.get_weather(35.0, 139.0))

    assert response.model_dump(by_alias=True) == payload
    assert adapter.calls == [(35.0, 139.0)]
