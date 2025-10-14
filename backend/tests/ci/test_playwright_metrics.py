from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from app.ci.playwright_metrics import collect_playwright_metrics


@pytest.fixture()
def transport() -> httpx.MockTransport:
    runs_response = {
        "workflow_runs": [
            {"id": 101, "run_attempt": 1},
            {"id": 102, "run_attempt": 1},
            {"id": 103, "run_attempt": 2},
        ]
    }
    jobs_by_run = {
        101: {
            "jobs": [
                {
                    "name": "frontend e2e (playwright)",
                    "run_attempt": 1,
                    "status": "completed",
                    "conclusion": "success",
                }
            ]
        },
        102: {
            "jobs": [
                {
                    "name": "frontend e2e (playwright)",
                    "run_attempt": 1,
                    "status": "completed",
                    "conclusion": "failure",
                }
            ]
        },
        103: {
            "jobs": [
                {
                    "name": "frontend e2e (playwright)",
                    "run_attempt": 2,
                    "status": "completed",
                    "conclusion": "success",
                }
            ]
        },
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/runs"):
            return httpx.Response(200, json=runs_response)
        if request.url.path.endswith("/jobs"):
            run_id = int(request.url.path.split("/")[-2])
            return httpx.Response(200, json=jobs_by_run[run_id])
        raise AssertionError(f"unexpected request: {request.method} {request.url}")

    return httpx.MockTransport(handler)


def test_collect_playwright_metrics(tmp_path: Path, transport: httpx.MockTransport) -> None:
    client = httpx.Client(transport=transport, base_url="https://api.github.com")
    output_path = tmp_path / "playwright-e2e-metrics.json"

    result = collect_playwright_metrics(
        owner="acme",
        repo="demo",
        workflow_file="ci.yml",
        output_path=output_path,
        client=client,
    )

    assert result.success_count == 2
    assert result.failure_count == 1
    assert result.flaky_count == 1
    assert pytest.approx(result.flake_rate, rel=1e-6) == 1 / 3

    payload = json.loads(output_path.read_text(encoding="utf-8"))
    assert payload == {
        "success_count": 2,
        "failure_count": 1,
        "flaky_count": 1,
        "flake_rate": pytest.approx(1 / 3),
    }
