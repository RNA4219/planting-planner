from __future__ import annotations

try:
    from datetime import UTC
except ImportError:  # pragma: no cover - Python 3.10 fallback
    from datetime import timezone

    UTC = timezone.utc  # noqa: UP017


__all__ = ["UTC"]
