from __future__ import annotations

import importlib
import inspect
from collections.abc import Callable, Mapping
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import partial
from http import HTTPStatus
from threading import Lock
from typing import Any, Protocol, cast

import httpx
from pydantic import ValidationError

from .. import schemas
from ..compat import UTC

CacheKey = str
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_FORECAST_DAYS = 2


class AdapterRegistry(Protocol):
    def get(self, name: str) -> Any:  # pragma: no cover - protocol definition
        ...


class WeatherAdapter(Protocol):
    def get_daily(self, lat: float, lon: float) -> Any:  # pragma: no cover - protocol definition
        ...


def _load_adapter_registry() -> AdapterRegistry | None:
    with suppress(ModuleNotFoundError):  # pragma: no cover - optional dependency
        module = importlib.import_module("adapter")
        return cast(AdapterRegistry | None, getattr(module, "registry", None))
    return None


adapter_registry = _load_adapter_registry()


@dataclass
class CacheEntry:
    payload: schemas.WeatherResponse
    cached_at: datetime


class WeatherServiceError(RuntimeError):
    def __init__(self, message: str, *, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


class OpenMeteoWeatherAdapter:
    def __init__(
        self,
        *,
        client: httpx.AsyncClient | None = None,
        base_url: str = OPEN_METEO_FORECAST_URL,
        clock: Callable[[], datetime] | None = None,
        forecast_days: int = OPEN_METEO_FORECAST_DAYS,
    ) -> None:
        self._client = client
        self._base_url = base_url
        self._clock = clock or partial(datetime.now, UTC)
        self._forecast_days = forecast_days

    async def get_daily(self, lat: float, lon: float) -> dict[str, Any]:
        payload = await self._request(lat, lon)
        return self._normalize_payload(payload)

    async def _request(self, lat: float, lon: float) -> Mapping[str, Any]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": ",".join(
                [
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                    "wind_speed_10m_max",
                ]
            ),
            "forecast_days": self._forecast_days,
            "timezone": "auto",
            "wind_speed_unit": "ms",
        }
        try:
            if self._client is not None:
                response = await self._client.get(self._base_url, params=params)
            else:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(self._base_url, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise WeatherServiceError(
                "weather provider request failed",
                status_code=HTTPStatus.BAD_GATEWAY,
            ) from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise WeatherServiceError(
                "weather provider returned invalid JSON",
                status_code=HTTPStatus.BAD_GATEWAY,
            ) from exc

        if not isinstance(payload, Mapping):
            raise WeatherServiceError(
                "weather provider returned unexpected payload",
                status_code=HTTPStatus.BAD_GATEWAY,
            )
        return payload

    def _normalize_payload(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        daily = payload.get("daily")
        if not isinstance(daily, Mapping):
            raise WeatherServiceError(
                "weather provider returned unexpected payload",
                status_code=HTTPStatus.BAD_GATEWAY,
            )

        series_names = {
            "time": "date",
            "temperature_2m_max": "tmax",
            "temperature_2m_min": "tmin",
            "precipitation_sum": "rain",
            "wind_speed_10m_max": "wind",
        }
        series: dict[str, list[Any]] = {}
        for source_name in series_names:
            values = daily.get(source_name)
            if not isinstance(values, list):
                raise WeatherServiceError(
                    "weather provider returned unexpected payload",
                    status_code=HTTPStatus.BAD_GATEWAY,
                )
            series[source_name] = values

        expected_length = len(series["time"])
        if expected_length == 0:
            raise WeatherServiceError(
                "weather provider returned empty forecast",
                status_code=HTTPStatus.BAD_GATEWAY,
            )

        for values in series.values():
            if len(values) != expected_length:
                raise WeatherServiceError(
                    "weather provider returned inconsistent forecast",
                    status_code=HTTPStatus.BAD_GATEWAY,
                )

        normalized_daily: list[dict[str, Any]] = []
        for index in range(expected_length):
            normalized_daily.append(
                {
                    "date": str(series["time"][index]),
                    "tmax": float(series["temperature_2m_max"][index]),
                    "tmin": float(series["temperature_2m_min"][index]),
                    "rain": float(series["precipitation_sum"][index]),
                    "wind": float(series["wind_speed_10m_max"][index]),
                }
            )

        fetched_at = self._clock().replace(microsecond=0).isoformat()
        return {"daily": normalized_daily, "fetchedAt": fetched_at}


class WeatherService:
    def __init__(
        self,
        *,
        adapter_factory: Callable[[], WeatherAdapter] | None = None,
        cache_ttl: timedelta | None = None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._adapter_factory = adapter_factory
        self._cache_ttl = cache_ttl or timedelta(hours=24)
        self._clock = clock or partial(datetime.now, UTC)
        self._cache: dict[CacheKey, CacheEntry] = {}
        self._lock = Lock()
        self._adapter: WeatherAdapter | None = None

    async def get_weather(self, lat: float, lon: float) -> schemas.WeatherResponse:
        key = self._build_cache_key(lat, lon)
        now = self._clock()
        with self._lock:
            cached = self._cache.get(key)
            if cached and now - cached.cached_at < self._cache_ttl:
                return cached.payload

        payload = await self._fetch_from_adapter(lat, lon)

        try:
            response = schemas.WeatherResponse.model_validate(payload)
        except ValidationError as exc:  # pragma: no cover - defensive guard
            raise WeatherServiceError(
                "weather adapter returned invalid payload",
                status_code=HTTPStatus.BAD_GATEWAY,
            ) from exc

        with self._lock:
            self._cache[key] = CacheEntry(payload=response, cached_at=now)
        return response

    def _build_cache_key(self, lat: float, lon: float) -> CacheKey:
        return f"{lat:.6f}:{lon:.6f}"

    def _create_default_adapter(self) -> WeatherAdapter:
        return OpenMeteoWeatherAdapter()

    def _resolve_adapter(self) -> WeatherAdapter:
        if self._adapter_factory is not None:
            if self._adapter is None:
                self._adapter = self._adapter_factory()
            return self._adapter

        if self._adapter is None:
            if adapter_registry is None:
                adapter = self._create_default_adapter()
            else:
                try:
                    spec = adapter_registry.get("weather")
                except KeyError:
                    adapter = self._create_default_adapter()
                else:
                    adapter = spec.factory()
            if not hasattr(adapter, "get_daily"):
                raise WeatherServiceError(
                    "weather adapter does not implement get_daily",
                    status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                )
            self._adapter = adapter
        return self._adapter

    async def _fetch_from_adapter(self, lat: float, lon: float) -> Mapping[str, Any]:
        adapter = self._resolve_adapter()
        try:
            result = adapter.get_daily(lat, lon)
        except WeatherServiceError:
            raise
        except Exception as exc:  # pragma: no cover - adapter failure
            raise WeatherServiceError(
                "weather adapter request failed",
                status_code=HTTPStatus.BAD_GATEWAY,
            ) from exc

        if inspect.isawaitable(result):
            try:
                result = await result
            except WeatherServiceError:
                raise
            except Exception as exc:  # pragma: no cover - adapter failure
                raise WeatherServiceError(
                    "weather adapter request failed",
                    status_code=HTTPStatus.BAD_GATEWAY,
                ) from exc

        if not isinstance(result, Mapping):
            raise WeatherServiceError(
                "weather adapter returned unexpected payload",
                status_code=HTTPStatus.BAD_GATEWAY,
            )

        return result


__all__ = [
    "WeatherService",
    "WeatherServiceError",
    "WeatherAdapter",
    "OpenMeteoWeatherAdapter",
]
