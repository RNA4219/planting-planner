"""Legacy database shim.

このモジュールは後方互換性のために残されています。
新しい構成要素への移行が完了次第、直接 :mod:`app.db` パッケージを
利用してください。

# TODO [ ] connection.py へ移行
# TODO [ ] schema.py へ移行
# TODO [ ] migrations.py へ移行
"""

from __future__ import annotations

import sqlite3
from importlib import import_module
from pathlib import Path
from threading import RLock
from typing import Final, Protocol, cast

_PACKAGE_ROOT = Path(__file__).with_name("db")
__path__ = [str(_PACKAGE_ROOT)]


class _ConnectionModule(Protocol):
    DB_LOCK: RLock
    DATABASE_FILE: Path

    @staticmethod
    def ensure_parent(path: Path) -> None: ...

    @staticmethod
    def get_conn(*, readonly: bool = False) -> sqlite3.Connection: ...


class _MigrationsModule(Protocol):
    @staticmethod
    def init_db(conn: sqlite3.Connection | None = None) -> None: ...


_connection = cast(_ConnectionModule, import_module("app.db.connection"))
_migrations = cast(_MigrationsModule, import_module("app.db.migrations"))

DB_LOCK = _connection.DB_LOCK
DATABASE_FILE: Final[Path] = _connection.DATABASE_FILE
ensure_parent = _connection.ensure_parent
get_conn = _connection.get_conn
init_db = _migrations.init_db


def connect(*, readonly: bool = False) -> sqlite3.Connection:
    return get_conn(readonly=readonly)


__all__ = [
    "connect",
    "ensure_parent",
    "get_conn",
    "init_db",
    "DATABASE_FILE",
    "DB_LOCK",
]
