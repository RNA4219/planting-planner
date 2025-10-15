"""Legacy compatibility shim for :mod:`app.etl_runner`."""

from __future__ import annotations

from importlib import import_module
from pathlib import Path
from typing import TYPE_CHECKING, Any

__path__ = [str(Path(__file__).with_name("etl_runner"))]
_PACKAGE = import_module(f"{__name__}.etl_runner")
_MODULES = [
    import_module(f"{__name__}.etl_runner.connection"),
    import_module(f"{__name__}.etl_runner.metadata"),
    import_module(f"{__name__}.etl_runner.runner"),
    import_module(f"{__name__}.etl_runner.status"),
]

# TODO [ ] connection.py の直呼びに置き換える
# TODO [ ] metadata.py の直呼びに置き換える
# TODO [ ] runner.py の直呼びに置き換える
# TODO [ ] status.py の直呼びに置き換える

if TYPE_CHECKING:  # pragma: no cover - type checking only
    from .etl_runner import *  # noqa: F401,F403

STATE_FAILURE = _PACKAGE.STATE_FAILURE
STATE_RUNNING = _PACKAGE.STATE_RUNNING
STATE_STALE = _PACKAGE.STATE_STALE
STATE_SUCCESS = _PACKAGE.STATE_SUCCESS
DataLoader = _PACKAGE.DataLoader
_RunEtlFactory = _PACKAGE._RunEtlFactory
_RunEtlFunc = _PACKAGE._RunEtlFunc
_coerce_state = _PACKAGE._coerce_state
_ensure_schema = _PACKAGE._ensure_schema
_insert_run_metadata = _PACKAGE._insert_run_metadata
_load_run_etl = _PACKAGE._load_run_etl
_mark_run_failure = _PACKAGE._mark_run_failure
_mark_run_success = _PACKAGE._mark_run_success
_open_connection = _PACKAGE._open_connection
_resolve_conn_factory = _PACKAGE._resolve_conn_factory
_run_etl_with_retries = _PACKAGE._run_etl_with_retries
_utc_now = _PACKAGE._utc_now
get_last_status = _PACKAGE.get_last_status
start_etl_job = _PACKAGE.start_etl_job

__all__: list[str] = [
    "STATE_FAILURE",
    "STATE_RUNNING",
    "STATE_STALE",
    "STATE_SUCCESS",
    "DataLoader",
    "_RunEtlFactory",
    "_RunEtlFunc",
    "_coerce_state",
    "_ensure_schema",
    "_insert_run_metadata",
    "_load_run_etl",
    "_mark_run_failure",
    "_mark_run_success",
    "_open_connection",
    "_resolve_conn_factory",
    "_run_etl_with_retries",
    "_utc_now",
    "get_last_status",
    "start_etl_job",
]


def __getattr__(name: str) -> Any:
    return getattr(_PACKAGE, name)


def __setattr__(name: str, value: Any) -> None:
    setattr(_PACKAGE, name, value)
    for module in _MODULES:
        if hasattr(module, name):
            setattr(module, name, value)
    globals()[name] = value
