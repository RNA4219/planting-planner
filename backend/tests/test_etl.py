"""Legacy shim for migrated ETL tests.

All assertions have moved under ``backend/tests/etl`` to ease maintenance.
This module remains importable for downstream references until the checklist
below is fully checked and the shim can be removed.

Checklist:
- [x] etl/test_connection.py へ移行完了
- [x] etl/test_schema.py へ移行完了
- [x] etl/test_runner.py へ移行完了
- [x] etl/test_retry.py へ移行完了
"""

from __future__ import annotations

from .etl import test_connection as _test_connection
from .etl import test_retry as _test_retry
from .etl import test_runner as _test_runner
from .etl import test_schema as _test_schema

__all__ = [
    "_test_connection",
    "_test_schema",
    "_test_runner",
    "_test_retry",
]
