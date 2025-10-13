"""Regression shims and market metadata regression tests."""

from __future__ import annotations

import pytest

from .etl.test_connection import *  # noqa: F401,F403
from .etl.test_retry import *  # noqa: F401,F403
from .etl.test_run_etl_market_cache import *  # noqa: F401,F403
from .etl.test_run_etl_validation import (  # noqa: F401,F403
    _validation_market_setup as _validation_market_setup_impl,
)
from .etl.test_run_etl_validation import *  # noqa: F401,F403
from .etl.test_runner import *  # noqa: F401,F403
from .etl.test_schema import *  # noqa: F401,F403


@pytest.fixture(name="validation_market_setup")
def _validation_market_setup_proxy() -> dict[str, object]:
    wrapped = getattr(_validation_market_setup_impl, "__wrapped__", None)
    if wrapped is None:
        return _validation_market_setup_impl()  # type: ignore[misc]
    return wrapped()
