from __future__ import annotations

from typing import Mapping

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

DEFAULT_SECURITY_HEADERS: Mapping[str, str] = {
    "Content-Security-Policy": (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; "
        "connect-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'"
    ),
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Apply a set of default security headers to every response."""

    def __init__(self, app: ASGIApp, headers: Mapping[str, str] | None = None) -> None:
        super().__init__(app)
        self._headers = dict(DEFAULT_SECURITY_HEADERS)
        if headers:
            self._headers.update(headers)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        for header, value in self._headers.items():
            response.headers.setdefault(header, value)
        return response


__all__ = ["SecurityHeadersMiddleware", "DEFAULT_SECURITY_HEADERS"]
