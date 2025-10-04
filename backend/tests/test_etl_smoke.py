from __future__ import annotations

import inspect
from importlib import import_module
import pkgutil
from types import ModuleType

ETL_PACKAGE = ".etl"
_HELPER_MODULE_SUFFIXES = {"._helpers"}


def _iter_etl_modules() -> list[str]:
    package = import_module(ETL_PACKAGE, package=__package__)
    prefix = f"{package.__name__}."
    module_names: list[str] = []
    for _, name, _ in pkgutil.iter_modules(package.__path__, prefix):
        if any(name.endswith(suffix) for suffix in _HELPER_MODULE_SUFFIXES):
            continue
        module_names.append(name)
    return module_names


def _has_collectable_tests(module: ModuleType) -> bool:
    if any(name.startswith("test_") and callable(obj) for name, obj in inspect.getmembers(module)):
        return True
    if any(name.startswith("Test") and inspect.isclass(obj) for name, obj in inspect.getmembers(module)):
        return True
    return False


def test_etl_package_modules_have_collectable_tests() -> None:
    missing: list[str] = []
    for module_name in _iter_etl_modules():
        module = import_module(module_name)
        if not _has_collectable_tests(module):
            missing.append(module_name)
    assert not missing, f"missing pytest tests in: {', '.join(missing)}"
