from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import Response
from pydantic import BaseModel

CACHE_CONTROL_VALUE = "public, max-age=300, stale-while-revalidate=60"


def _to_jsonable(payload: Any) -> Any:
    if isinstance(payload, BaseModel):
        return payload.model_dump(mode="json")
    if hasattr(payload, "model_dump"):
        try:
            return payload.model_dump(mode="json")
        except TypeError:  # pragma: no cover - fallback for unexpected signatures
            pass
    return payload


def _canonical_json(payload: Any) -> str:
    data = _to_jsonable(payload)
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def apply_cache_headers(response: Response, payload: Any) -> None:
    canonical = _canonical_json(payload)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    etag = f'W/"{digest}"'
    response.headers.setdefault("Cache-Control", CACHE_CONTROL_VALUE)
    response.headers.setdefault("ETag", etag)
