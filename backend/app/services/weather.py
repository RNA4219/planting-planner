from __future__ import annotations

import importlib
import inspect
from collections.abc import Callable, Mapping
from contextlib import suppress
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import partial
from http import HTTPStatus
from threading import Lock
from typing import Any, Protocol, cast

from pydantic import ValidationError

from .. import schemas

CacheKey = str


class WeatherAdapter(Protocol):
    def get_daily(self, lat: float, lon: float) -> Any:  # pragma: no cover - protocol definition
        ...


class AdapterProviderSpec(Protocol):
    def factory(self) -> WeatherAdapter:
        ...


class AdapterRegistry(Protocol):
    def get(self, name: str) -> AdapterProviderSpec:
        ...


def _load_adapter_registry() -> AdapterRegistry | None:
    with suppress(ModuleNotFoundError):
        module = importlib.import_module("adapter")
        registry = getattr(module, "registry", None)
        if registry is None:
            return None
        return cast(AdapterRegistry, registry)
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

    def _resolve_adapter(self) -> WeatherAdapter:
        if self._adapter_factory is not None:
            if self._adapter is None:
                self._adapter = self._adapter_factory()
            return self._adapter

        if self._adapter is None:
            if adapter_registry is None:
                raise WeatherServiceError(
                    "weather adapter is not configured",
                    status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                )
            try:
                spec = adapter_registry.get("weather")
            except KeyError as exc:  # pragma: no cover - defensive guard
                raise WeatherServiceError(
                    "weather adapter is not configured",
                    status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                ) from exc
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
        except Exception as exc:  # pragma: no cover - adapter failure
            raise WeatherServiceError(
                "weather adapter request failed",
                status_code=HTTPStatus.BAD_GATEWAY,
            ) from exc

        if inspect.isawaitable(result):
            result = await result

        if not isinstance(result, Mapping):
            raise WeatherServiceError(
                "weather adapter returned unexpected payload",
                status_code=HTTPStatus.BAD_GATEWAY,
            )

        return result


__all__ = ["WeatherService", "WeatherServiceError", "WeatherAdapter"]
