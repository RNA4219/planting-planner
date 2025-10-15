from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import pytest

from app.seed import writers


class DummyConnection:
    pass


@pytest.fixture()
def dummy_conn() -> DummyConnection:
    return DummyConnection()


def test_write_crops_delegates_to_split_module(
    monkeypatch: pytest.MonkeyPatch, dummy_conn: DummyConnection
) -> None:
    calls: list[tuple[Any, list[Any]]] = []

    def stub(conn: Any, payload: Iterable[Any]) -> None:
        calls.append((conn, list(payload)))

    monkeypatch.setattr(writers.crops, "write_crops", stub)

    crops_payload = [{"id": 1}]
    writers.write_crops(dummy_conn, crops_payload)

    assert calls == [(dummy_conn, crops_payload)]


def test_write_market_scopes_delegates(
    monkeypatch: pytest.MonkeyPatch, dummy_conn: DummyConnection
) -> None:
    calls: list[tuple[Any, list[Any]]] = []

    def stub(conn: Any, payload: Iterable[Any]) -> None:
        calls.append((conn, list(payload)))

    monkeypatch.setattr(writers.markets, "write_market_scopes", stub)

    scopes_payload = [{"scope": "global"}]
    writers.write_market_scopes(dummy_conn, scopes_payload)

    assert calls == [(dummy_conn, scopes_payload)]


def test_write_seed_payload_validates_and_delegates(
    monkeypatch: pytest.MonkeyPatch, dummy_conn: DummyConnection
) -> None:
    order: list[str] = []

    def record(name: str):
        def _inner(conn: Any, payload: Iterable[Any]) -> None:
            order.append(name)
            assert conn is dummy_conn
            if name in {"theme_tokens", "market_scopes", "market_scope_categories"}:
                collected = list(payload)
                assert collected, name
            else:
                assert list(payload)

        return _inner

    monkeypatch.setattr(writers, "write_theme_tokens", record("theme_tokens"))
    monkeypatch.setattr(writers.markets, "write_market_scopes", record("market_scopes"))
    monkeypatch.setattr(
        writers.markets, "write_market_scope_categories", record("market_scope_categories")
    )
    monkeypatch.setattr(writers.crops, "write_crops", record("crops"))
    monkeypatch.setattr(writers, "write_price_samples", record("price_samples"))
    monkeypatch.setattr(writers, "write_growth_days", record("growth_days"))

    payload = {
        "crops": [{"id": 1}],
        "price_samples": [{"crop_id": 1}],
        "growth_days": [{"crop_id": 1, "days": 30, "region": "jp"}],
        "market_scopes": [{"scope": "global", "display_name": "Global"}],
        "market_scope_categories": [{"scope": "global", "category": "leaf"}],
        "theme_tokens": [{"token": "leaf", "hex_color": "#00ff00"}],
    }

    writers.write_seed_payload(
        dummy_conn,
        crops=payload["crops"],
        price_samples=payload["price_samples"],
        growth_days=payload["growth_days"],
        market_scopes=payload["market_scopes"],
        market_scope_categories=payload["market_scope_categories"],
        theme_tokens=payload["theme_tokens"],
    )

    assert order == [
        "theme_tokens",
        "market_scopes",
        "market_scope_categories",
        "crops",
        "price_samples",
        "growth_days",
    ]
