from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from .. import schemas
from ..services.weather import WeatherService, WeatherServiceError

router = APIRouter()

_weather_service = WeatherService()


def get_weather_service() -> WeatherService:
    return _weather_service


@router.get("/api/weather", response_model=schemas.WeatherResponse)
async def read_weather(
    lat: float = Query(..., description="latitude"),
    lon: float = Query(..., description="longitude"),
    service: WeatherService = Depends(get_weather_service),
) -> schemas.WeatherResponse:
    try:
        return await service.get_weather(lat, lon)
    except WeatherServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
