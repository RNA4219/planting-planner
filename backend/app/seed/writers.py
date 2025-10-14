"""互換 API を提供する `app.seed.writers` のファサード。"""

from __future__ import annotations

import importlib.util
import sqlite3
import sys
from collections.abc import Callable, Iterable, Mapping
from importlib.machinery import ModuleSpec
from pathlib import Path
from types import ModuleType
from typing import Any, TypeVar

_T = TypeVar("_T")



_PACKAGE_DIR = Path(__file__).with_name("writers")
_module = sys.modules[__name__]
_module.__path__ = getattr(_module, "__path__", []) or [str(_PACKAGE_DIR)]
if _module.__spec__ is not None:
    _module.__spec__.submodule_search_locations = list(_module.__path__)
else:
    _module.__spec__ = ModuleSpec(__name__, loader=None, is_package=True)
    _module.__spec__.submodule_search_locations = list(_module.__path__)


def _load_submodule(name: str) -> ModuleType:
    full_name = f"{__name__}.{name}"
    module = sys.modules.get(full_name)
    if module is not None:
        return module

    module_path = Path(__file__).with_name("writers") / f"{name}.py"
    spec = importlib.util.spec_from_file_location(full_name, module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load submodule {full_name}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[full_name] = module
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    setattr(sys.modules[__name__], name, module)
    return module


crops = _load_submodule("crops")
markets = _load_submodule("markets")
growth = _load_submodule("growth")
payload = _load_submodule("payload")


def _resolve_override(module_name: str, attr: str, default: _T) -> _T:
    override_module = sys.modules.get(module_name)
    if override_module is not None and hasattr(override_module, attr):
        return getattr(override_module, attr)
    return default


def write_crops(conn: sqlite3.Connection, crops_data: Iterable[Mapping[str, Any]]) -> None:
    handler: Callable[[sqlite3.Connection, Iterable[Mapping[str, Any]]], None]
    handler = _resolve_override("app.seed.crops_writer", "write_crops", crops.write_crops)
    handler(conn, crops_data)


def write_market_scopes(
    conn: sqlite3.Connection, market_scopes: Iterable[Mapping[str, Any]]
) -> None:
    handler: Callable[[sqlite3.Connection, Iterable[Mapping[str, Any]]], None]
    handler = _resolve_override(
        "app.seed.markets_writer",
        "write_market_scopes",
        markets.write_market_scopes,
    )
    handler(conn, market_scopes)


def write_market_scope_categories(
    conn: sqlite3.Connection, categories: Iterable[Mapping[str, Any]]
) -> None:
    handler: Callable[[sqlite3.Connection, Iterable[Mapping[str, Any]]], None]
    handler = _resolve_override(
        "app.seed.markets_writer",
        "write_market_scope_categories",
        markets.write_market_scope_categories,
    )
    handler(conn, categories)


write_price_samples = markets.write_price_samples
write_theme_tokens = markets.write_theme_tokens
write_growth_days = growth.write_growth_days


def write_seed_payload(
    conn: sqlite3.Connection,
    *,
    crops: Iterable[Mapping[str, Any]],
    price_samples: Iterable[Mapping[str, Any]],
    growth_days: Iterable[Mapping[str, Any]],
    market_scopes: Iterable[Mapping[str, Any]] = (),
    market_scope_categories: Iterable[Mapping[str, Any]] = (),
    theme_tokens: Iterable[Mapping[str, Any]] = (),
) -> None:
    payload.write_seed_payload(
        conn,
        crops=crops,
        price_samples=price_samples,
        growth_days=growth_days,
        market_scopes=market_scopes,
        market_scope_categories=market_scope_categories,
        theme_tokens=theme_tokens,
        write_theme_tokens_fn=write_theme_tokens,
        write_market_scopes_fn=write_market_scopes,
        write_market_scope_categories_fn=write_market_scope_categories,
        write_crops_fn=write_crops,
        write_price_samples_fn=write_price_samples,
        write_growth_days_fn=write_growth_days,
    )


__all__ = [
    "write_crops",
    "write_market_scopes",
    "write_market_scope_categories",
    "write_price_samples",
    "write_growth_days",
    "write_theme_tokens",
    "write_seed_payload",
]
