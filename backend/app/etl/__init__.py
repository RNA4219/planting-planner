"""ETL package regrouping loader and transform logic."""

from __future__ import annotations

from .. import etl_runner as _etl_runner
from .loader import DataLoader, load_price_feed
from .transform import run_etl

STATE_FAILURE = _etl_runner.STATE_FAILURE
STATE_RUNNING = _etl_runner.STATE_RUNNING
STATE_STALE = _etl_runner.STATE_STALE
STATE_SUCCESS = _etl_runner.STATE_SUCCESS
get_last_status = _etl_runner.get_last_status
start_etl_job = _etl_runner.start_etl_job

__all__ = [
    "DataLoader",
    "load_price_feed",
    "run_etl",
    "STATE_FAILURE",
    "STATE_RUNNING",
    "STATE_STALE",
    "STATE_SUCCESS",
    "get_last_status",
    "start_etl_job",
]
