from __future__ import annotations

from importlib import import_module

MODULES = [
    ".etl.test_connection",
    ".etl.test_schema",
    ".etl.test_runner",
    ".etl.test_retry",
]


def test_etl_modules_are_importable() -> None:
    for module_path in MODULES:
        module = import_module(module_path, package=__package__)
        assert module.__package__.endswith("tests.etl")
