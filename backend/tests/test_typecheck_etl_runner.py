from __future__ import annotations

from pathlib import Path

from mypy import api as mypy_api


def test_etl_runner_mypy_clean() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    config = backend_root / "pyproject.toml"
    target = backend_root / "app" / "etl_runner.py"
    result_stdout, result_stderr, exit_status = mypy_api.run(
        ["--config-file", str(config), str(target)]
    )
    assert exit_status == 0, result_stdout + result_stderr
