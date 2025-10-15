from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.seed import markets_writer, write_seed_payload, writers


def _executed_calls(conn: MagicMock) -> list[tuple[str, tuple[object, ...]]]:
    return [call.args for call in conn.execute.call_args_list]


def test_write_market_scopes_applies_defaults() -> None:
    conn = MagicMock()
    scopes = [
        {
            "scope": "pref:kanagawa",
            "display_name": "神奈川",
            "theme_token": "accent.kanagawa",
        }
    ]

    markets_writer.write_market_scopes(conn, scopes)

    executed = _executed_calls(conn)

    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_scopes")
        and params == ("pref:kanagawa", "神奈川", "Asia/Tokyo", 100, "accent.kanagawa")
        for sql, params in executed
    )


def test_writers_facade_calls_markets_writer(monkeypatch: pytest.MonkeyPatch) -> None:
    conn = MagicMock()
    scopes = object()
    stub = MagicMock()
    monkeypatch.setattr(markets_writer, "write_market_scopes", stub)

    writers.write_market_scopes(conn, scopes)  # type: ignore[arg-type]

    stub.assert_called_once_with(conn, scopes)


def test_write_seed_payload_delegates_market_sections(monkeypatch: pytest.MonkeyPatch) -> None:
    conn = MagicMock()
    scopes = [
        {
            "scope": "pref:osaka",
            "display_name": "大阪",
            "timezone": "Asia/Tokyo",
            "priority": 50,
            "theme_token": "accent.osaka",
        }
    ]
    categories = [
        {
            "scope": "pref:osaka",
            "category": "leaf",
        }
    ]

    crops = [{"id": 200, "name": "Spinach", "category": "leaf"}]
    price_samples = [{"crop_id": 200, "week": "2023-W01"}]
    growth_days = [{"crop_id": 200, "region": "osaka", "days": 42}]

    stub_scope = MagicMock()
    stub_categories = MagicMock()
    stub_crops = MagicMock()
    stub_price = MagicMock()
    stub_growth = MagicMock()

    monkeypatch.setattr(markets_writer, "write_market_scopes", stub_scope)
    monkeypatch.setattr(markets_writer, "write_market_scope_categories", stub_categories)
    monkeypatch.setattr("app.seed.writers.write_crops", stub_crops)
    monkeypatch.setattr("app.seed.writers.write_price_samples", stub_price)
    monkeypatch.setattr("app.seed.writers.write_growth_days", stub_growth)

    write_seed_payload(
        conn,
        crops=crops,
        price_samples=price_samples,
        growth_days=growth_days,
        market_scopes=scopes,
        market_scope_categories=categories,
    )

    stub_scope.assert_called_once_with(conn, scopes)
    stub_categories.assert_called_once_with(conn, categories)
    stub_crops.assert_called_once_with(conn, crops)
    stub_price.assert_called_once_with(conn, price_samples)
    stub_growth.assert_called_once_with(conn, growth_days)
