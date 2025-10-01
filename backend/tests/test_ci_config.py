from __future__ import annotations

from pathlib import Path


def test_backend_ci_has_separate_lint_job() -> None:
    ci_config = (Path(__file__).resolve().parents[2] / ".github/workflows/ci.yml").read_text(
        encoding="utf-8"
    )
    assert "backend-lint:" in ci_config
    assert "backend-test:" in ci_config
