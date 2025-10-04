from __future__ import annotations

import sqlite3

import pytest

from app import db, etl_runner

from ._helpers import make_conn


def test_resolve_conn_factory_uses_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = {"count": 0}

    def fake_get_conn() -> sqlite3.Connection:
        calls["count"] += 1
        return make_conn()

    monkeypatch.setattr(db, "get_conn", fake_get_conn)

    factory = etl_runner._resolve_conn_factory(None)
    with factory() as conn:  # type: ignore[call-arg]
        assert isinstance(conn, sqlite3.Connection)

    assert calls["count"] == 1
