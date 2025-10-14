from __future__ import annotations

import sqlite3
from collections.abc import Callable, Iterable, Mapping
from typing import Any

from . import crops as crops_module
from . import growth as growth_module
from . import markets as markets_module

WriterFn = Callable[[sqlite3.Connection, Iterable[Mapping[str, Any]]], None]


def write_seed_payload(
    conn: sqlite3.Connection,
    *,
    crops: Iterable[Mapping[str, Any]],
    price_samples: Iterable[Mapping[str, Any]],
    growth_days: Iterable[Mapping[str, Any]],
    market_scopes: Iterable[Mapping[str, Any]] = (),
    market_scope_categories: Iterable[Mapping[str, Any]] = (),
    theme_tokens: Iterable[Mapping[str, Any]] = (),
    write_theme_tokens_fn: WriterFn = markets_module.write_theme_tokens,
    write_market_scopes_fn: WriterFn = markets_module.write_market_scopes,
    write_market_scope_categories_fn: WriterFn = markets_module.write_market_scope_categories,
    write_crops_fn: WriterFn = crops_module.write_crops,
    write_price_samples_fn: WriterFn = markets_module.write_price_samples,
    write_growth_days_fn: WriterFn = growth_module.write_growth_days,
) -> None:
    theme_list = list(theme_tokens)
    if theme_list:
        write_theme_tokens_fn(conn, theme_list)

    scope_list = list(market_scopes)
    if scope_list:
        write_market_scopes_fn(conn, scope_list)

    category_list = list(market_scope_categories)
    if category_list:
        write_market_scope_categories_fn(conn, category_list)

    write_crops_fn(conn, crops)
    write_price_samples_fn(conn, price_samples)
    write_growth_days_fn(conn, growth_days)


__all__ = ["write_seed_payload"]
