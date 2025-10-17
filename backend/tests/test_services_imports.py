from __future__ import annotations

import importlib

import pytest

import app.services


def test_reload_app_services_does_not_raise_name_error() -> None:
    try:
        importlib.reload(app.services)
    except NameError as exc:
        pytest.fail(f"reloading app.services raised NameError: {exc}")
