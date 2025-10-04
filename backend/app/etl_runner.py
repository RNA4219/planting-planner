from __future__ import annotations

"""Legacy compatibility shim for :mod:`app.etl_runner`."""

# TODO [ ] connection.py の直呼びに置き換える
# TODO [ ] metadata.py の直呼びに置き換える
# TODO [ ] runner.py の直呼びに置き換える
# TODO [ ] status.py の直呼びに置き換える

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

if TYPE_CHECKING:  # pragma: no cover - type checking only
    from .etl_runner import *  # noqa: F401,F403

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

for _name in __all__:
    globals()[_name] = getattr(_PACKAGE, _name)


def __getattr__(name: str) -> Any:
    return getattr(_PACKAGE, name)


def __setattr__(name: str, value: Any) -> None:
    setattr(_PACKAGE, name, value)
    for module in _MODULES:
        if hasattr(module, name):
            setattr(module, name, value)
    globals()[name] = value
