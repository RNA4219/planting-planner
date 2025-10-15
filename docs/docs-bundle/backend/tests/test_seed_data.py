from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from app import seed as seed_module
from app.seed import data_loader
from app.utils_week import iso_week_from_int


@pytest.fixture
def seed_payload() -> data_loader.SeedPayload:
    return data_loader.SeedPayload(
        crops=[
            {
                "id": 1,
                "name": "Lettuce",
                "category": "Leafy",
                "price_weekly": [
                    {
                        "week": 202301,
                        "price": 120,
                        "stddev": 5,
                        "unit": "円/kg",
                        "source": "survey",
                    }
                ],
                "market_prices": [
                    {
                        "scope": "national",
                        "week": "2023-W01",
                        "avg_price": 130,
                        "stddev": 3,
                        "unit": "円/kg",
                        "source": "national_seed",
                    },
                    {
                        "scope": "city:tokyo",
                        "week": 202302,
                        "avg_price": 15,
                        "stddev": 0.4,
                        "unit": "円/100g",
                        "source": "city_seed",
                    },
                ],
            }
        ],
        price_samples=[
            {
                "crop_id": 2,
                "week": "2023-W02",
                "avg_price": 150,
                "stddev": 10,
                "unit": "円/kg",
                "source": "seed",
            }
        ],
        growth_days=[
            {"crop_id": 1, "region": "tokyo", "days": 65},
        ],
        market_scopes=[
            {
                "scope": "national",
                "display_name": "全国平均",
                "timezone": "Asia/Tokyo",
                "priority": 10,
                "theme_token": "accent.national",
            },
            {
                "scope": "city:tokyo",
                "display_name": "東京都中央卸売",
                "timezone": "Asia/Tokyo",
                "priority": 20,
                "theme_token": "accent.tokyo",
            },
        ],
        market_scope_categories=[
            {
                "scope": "national",
                "category": "leaf",
                "display_name": "葉菜類",
                "priority": 5,
                "source": "seed",
            },
            {
                "scope": "city:tokyo",
                "category": "leaf",
                "display_name": "葉菜類",
                "priority": 10,
                "source": "seed",
            },
        ],
        theme_tokens=[
            {
                "token": "accent.national",
                "hex_color": "#22c55e",
                "text_color": "#ffffff",
            },
            {
                "token": "accent.tokyo",
                "hex_color": "#2563eb",
                "text_color": "#ffffff",
            },
        ],
    )


@pytest.fixture
def theme_token_set() -> set[str]:
    path = data_loader.DEFAULT_DATA_DIR / "theme_tokens.json"
    assert path.exists(), "theme_tokens.json が存在しません"

    with path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    tokens = {item["token"] for item in payload}
    return tokens


def test_seed_inserts_expected_records(
    monkeypatch: pytest.MonkeyPatch, seed_payload: data_loader.SeedPayload
) -> None:
    monkeypatch.setattr(seed_module.db, "init_db", lambda conn: None)
    monkeypatch.setattr(seed_module, "load_seed_payload", lambda data_dir=None: seed_payload)

    conn = MagicMock()

    seed_module.seed(conn=conn)

    executed = [call.args for call in conn.execute.call_args_list]

    assert (
        "INSERT OR IGNORE INTO crops (id, name, category) VALUES (?, ?, ?)",
        (1, "Lettuce", "leaf"),
    ) in executed
    assert (
        "UPDATE crops SET name = ?, category = ? WHERE id = ?",
        ("Lettuce", "leaf", 1),
    ) in executed

    assert any(
        sql.startswith("INSERT OR REPLACE INTO price_weekly")
        and params
        == (
            1,
            iso_week_from_int(202301),
            120.0,
            5.0,
            "円/kg",
            "survey",
        )
        for sql, params in executed
    )
    assert any(
        sql.startswith("INSERT OR IGNORE INTO price_weekly")
        and params == (2, "2023-W02", 150.0, 10.0, "円/kg", "seed")
        for sql, params in executed
    )

    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_prices")
        and params
        == (
            1,
            "national",
            "2023-W01",
            130.0,
            3.0,
            "円/kg",
            "national_seed",
        )
        for sql, params in executed
    )
    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_prices")
        and params
        == (
            1,
            "city:tokyo",
            "2023-W02",
            150.0,
            4.0,
            "円/kg",
            "city_seed",
        )
        for sql, params in executed
    )

    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_scopes")
        and params == ("national", "全国平均", "Asia/Tokyo", 10, "accent.national")
        for sql, params in executed
    )
    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_scopes")
        and params == ("city:tokyo", "東京都中央卸売", "Asia/Tokyo", 20, "accent.tokyo")
        for sql, params in executed
    )

    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_scope_categories")
        and params == ("national", "leaf", "葉菜類", 5, "seed")
        for sql, params in executed
    )
    assert any(
        sql.startswith("INSERT OR REPLACE INTO market_scope_categories")
        and params == ("city:tokyo", "leaf", "葉菜類", 10, "seed")
        for sql, params in executed
    )

    assert any(
        sql.startswith("INSERT INTO theme_tokens")
        and "ON CONFLICT" in sql.upper()
        and params == ("accent.national", "#22c55e", "#ffffff")
        for sql, params in executed
    )
    assert any(
        sql.startswith("INSERT INTO theme_tokens")
        and "ON CONFLICT" in sql.upper()
        and params == ("accent.tokyo", "#2563eb", "#ffffff")
        for sql, params in executed
    )

    assert (
        "INSERT OR IGNORE INTO growth_days (crop_id, region, days) VALUES (?, ?, ?)",
        (1, "tokyo", 65),
    ) in executed
    assert (
        "UPDATE growth_days SET days = ? WHERE crop_id = ? AND region = ?",
        (65, 1, "tokyo"),
    ) in executed

    conn.commit.assert_called_once_with()


def test_seed_normalizes_crop_categories(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(seed_module.db, "init_db", lambda conn: None)

    payload = data_loader.SeedPayload(
        crops=[
            {"id": 10, "name": "Kale", "category": "Leafy"},
            {"id": 11, "name": "Carrot", "category": "ROOT"},
            {"id": 12, "name": "Broccoli", "category": "flowering"},
            {"id": 13, "name": "Mystery", "category": "unknown"},
        ],
        price_samples=[],
        growth_days=[],
        market_scopes=[],
        market_scope_categories=[],
        theme_tokens=[],
    )

    monkeypatch.setattr(seed_module, "load_seed_payload", lambda data_dir=None: payload)

    conn = MagicMock()

    seed_module.seed(conn=conn)

    executed = [call.args for call in conn.execute.call_args_list]

    insert_categories = {
        params[0]: params[2]
        for sql, params in executed
        if sql.startswith("INSERT OR IGNORE INTO crops")
    }
    update_categories = {
        params[2]: params[1]
        for sql, params in executed
        if sql.startswith("UPDATE crops SET name = ?, category = ? WHERE id = ?")
    }

    expected = {10: "leaf", 11: "root", 12: "flower", 13: "leaf"}

    assert insert_categories == expected
    assert update_categories == expected


def test_market_scopes_use_market_theme_tokens(theme_token_set: set[str]) -> None:
    payload = data_loader.load_seed_payload()

    market_scope_tokens = {scope["theme_token"] for scope in payload.market_scopes}

    missing_tokens = market_scope_tokens - theme_token_set
    assert not missing_tokens, f"未登録のテーマトークン: {sorted(missing_tokens)}"
    assert market_scope_tokens == {
        "accent.national",
        "accent.tokyo",
        "accent.osaka",
        "accent.nagoya",
    }
