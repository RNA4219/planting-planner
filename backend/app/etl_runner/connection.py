from __future__ import annotations

import sqlite3
from collections.abc import Callable

from .. import db as db_legacy


def _resolve_conn_factory(
    conn_factory: Callable[[], sqlite3.Connection] | None,
) -> Callable[[], sqlite3.Connection]:
    if conn_factory is not None:
        return conn_factory
    return lambda: db_legacy.get_conn()


def _open_connection(factory: Callable[[], sqlite3.Connection]) -> sqlite3.Connection:
    return factory()
