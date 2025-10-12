from __future__ import annotations

from fastapi import APIRouter

from . import crops, markets, price, recommend, refresh

api_router = APIRouter()


@api_router.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


api_router.include_router(crops.router)
api_router.include_router(markets.router)
api_router.include_router(recommend.router)
api_router.include_router(price.router)
api_router.include_router(refresh.router)
