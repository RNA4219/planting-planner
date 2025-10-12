from __future__ import annotations

import logging
import sqlite3
import time
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, TypeAlias, cast

from typing_extensions import Protocol

from . import connection, metadata

logger = logging.getLogger(__name__)

DataLoader: TypeAlias = Callable[[], Iterable[dict[str, Any]]]


class _RunEtlFunc(Protocol):
    def __call__(
        self, conn: sqlite3.Connection, *, data_loader: DataLoader | None = None
    ) -> int: ...


_RunEtlFactory: TypeAlias = Callable[[], _RunEtlFunc]


def _utc_now() -> str:
    return datetime.now(tz=UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


if TYPE_CHECKING:
    from ..etl import run_etl as _typed_run_etl

    def _load_run_etl() -> _RunEtlFunc:
        return _typed_run_etl

else:

    def _load_run_etl() -> _RunEtlFunc:
        from .. import etl as _etl_module  # Local import to avoid circular dependency

        return cast(_RunEtlFunc, _etl_module.run_etl)


def _resolve_run_etl_factory() -> _RunEtlFactory:
    from .. import etl_runner as shim

    return shim._load_run_etl


def _run_etl_with_retries(
    *,
    load_run_etl: _RunEtlFactory,
    conn: sqlite3.Connection,
    data_loader: DataLoader | None,
    max_retries: int,
    retry_delay: float,
) -> int:
    attempt = 0
    while True:
        try:
            run_etl = load_run_etl()
            return run_etl(conn, data_loader=data_loader)
        except sqlite3.DatabaseError:
            attempt += 1
            if attempt >= max_retries:
                raise
            if retry_delay:
                time.sleep(retry_delay)


def start_etl_job(
    *,
    data_loader: DataLoader | None = None,
    conn_factory: Callable[[], sqlite3.Connection] | None = None,
    max_retries: int = 3,
    retry_delay: float = 0.1,
) -> None:
    factory = connection._resolve_conn_factory(conn_factory)
    conn = connection._open_connection(factory)
    try:
        metadata._ensure_schema(conn)
        started_at = _utc_now()
        run_id = metadata._insert_run_metadata(conn, started_at)
        try:
            load_run_etl = _resolve_run_etl_factory()
            updated_records = _run_etl_with_retries(
                load_run_etl=load_run_etl,
                conn=conn,
                data_loader=data_loader,
                max_retries=max_retries,
                retry_delay=retry_delay,
            )
        except Exception as exc:  # pragma: no cover - defensive path
            finished_at = _utc_now()
            metadata._mark_run_failure(
                conn, run_id, finished_at=finished_at, error_message=str(exc)
            )
            raise
        else:
            finished_at = _utc_now()
            metadata._mark_run_success(
                conn, run_id, finished_at=finished_at, updated_records=updated_records
            )
            logger.info(
                "market_metadata cache refresh confirmed",
                extra={"updated_records": updated_records},
            )
    finally:
        conn.close()
