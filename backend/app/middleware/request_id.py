from __future__ import annotations

import logging
from contextvars import ContextVar
from typing import Callable
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

RequestIdGenerator = Callable[[], str]

_request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="-")


def get_request_id(default: str = "-") -> str:
    request_id = _request_id_ctx_var.get()
    if request_id and request_id != "-":
        return request_id
    return default


class RequestIdFilter(logging.Filter):
    def __init__(self, default: str = "-") -> None:
        super().__init__()
        self._default = default

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id(self._default)
        return True


class RequestIdMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        *,
        header_name: str = "x-request-id",
        generator: RequestIdGenerator | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        super().__init__(app)
        self._header_name = header_name.lower()
        self._generator: RequestIdGenerator = generator or (lambda: str(uuid4()))
        self._logger = logger or logging.getLogger("app.request")

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(self._header_name) or self._generator()
        token = _request_id_ctx_var.set(request_id)
        request.state.request_id = request_id
        try:
            response = await call_next(request)
            response.headers[self._header_name] = request_id
            self._logger.info("%s %s", request.method, request.url.path)
            return response
        finally:
            _request_id_ctx_var.reset(token)
