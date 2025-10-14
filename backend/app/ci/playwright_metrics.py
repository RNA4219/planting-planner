from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Sequence

import httpx


@dataclass(frozen=True)
class PlaywrightMetrics:
    success_count: int
    failure_count: int
    flaky_count: int
    flake_rate: float


class MetricsRetrievalError(RuntimeError):
    """Raised when the GitHub API could not provide the job history."""


_RETRIABLE_STATUS = {502, 503, 504}


def collect_playwright_metrics(
    *,
    owner: str,
    repo: str,
    workflow_file: str,
    output_path: Path,
    client: httpx.Client | None = None,
    token: str | None = None,
    max_runs: int = 20,
    job_name: str = "frontend-e2e",
) -> PlaywrightMetrics:
    """Fetch the recent job results for the workflow and persist flaky statistics.

    If a token is provided the request is authenticated first; otherwise the
    public unauthenticated endpoint is used. Transient server errors are retried
    once before failing with :class:`MetricsRetrievalError`.
    """

    session = client or _build_client(token)
    close_client = client is None
    try:
        runs_url = f"/repos/{owner}/{repo}/actions/workflows/{workflow_file}/runs"
        runs_payload = _request_json(
            session,
            url=runs_url,
            params={"status": "completed", "per_page": max_runs},
        )
        workflow_runs = list(runs_payload.get("workflow_runs", []))[:max_runs]

        success = 0
        failure = 0
        flaky = 0
        for run in workflow_runs:
            run_id = run.get("id")
            if not isinstance(run_id, int):
                continue
            jobs_url = f"/repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
            jobs_payload = _request_json(session, url=jobs_url, params={"per_page": 100})
            for job in jobs_payload.get("jobs", []):
                if job.get("name") != job_name:
                    continue
                conclusion = job.get("conclusion")
                if conclusion == "success":
                    success += 1
                    if int(job.get("run_attempt", 1)) > 1:
                        flaky += 1
                elif conclusion == "failure":
                    failure += 1

        total = success + failure
        flake_rate = (flaky / total) if total else 0.0
        payload = {
            "success_count": success,
            "failure_count": failure,
            "flaky_count": flaky,
            "flake_rate": flake_rate,
        }
        output_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        return PlaywrightMetrics(
            success_count=success,
            failure_count=failure,
            flaky_count=flaky,
            flake_rate=flake_rate,
        )
    finally:
        if close_client:
            session.close()


def _build_client(token: str | None) -> httpx.Client:
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return httpx.Client(base_url="https://api.github.com", timeout=15.0, headers=headers)


def _request_json(client: httpx.Client, *, url: str, params: dict[str, Any]) -> dict[str, Any]:
    for attempt in range(2):
        try:
            response = client.get(url, params=params)
        except httpx.RequestError as exc:  # pragma: no cover - network failure path
            if attempt == 1:
                raise MetricsRetrievalError(str(exc)) from exc
            continue
        if response.status_code in _RETRIABLE_STATUS and attempt == 0:
            continue
        if response.status_code >= 400:
            raise MetricsRetrievalError(
                f"GitHub API returned {response.status_code} for {url}",
            )
        data = response.json()
        if not isinstance(data, dict):
            raise MetricsRetrievalError(f"Unexpected payload type for {url}")
        return data
    raise MetricsRetrievalError(f"No response after retries for {url}")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Collect Playwright E2E job metrics")
    parser.add_argument("--owner", required=False, help="GitHub repository owner")
    parser.add_argument("--repo", required=False, help="GitHub repository name")
    parser.add_argument(
        "--workflow-file",
        required=True,
        help="Workflow file name that defines the frontend-e2e job",
    )
    parser.add_argument(
        "--output",
        default="playwright-e2e-metrics.json",
        help="Destination path for the JSON report",
    )
    parser.add_argument("--max-runs", type=int, default=20, help="Maximum runs to inspect")
    args = parser.parse_args(argv)

    owner = args.owner
    repo = args.repo
    if not owner or not repo:
        repository = os.environ.get("GITHUB_REPOSITORY", "")
        if "/" in repository:
            owner, repo = repository.split("/", 1)
    if not owner or not repo:
        raise MetricsRetrievalError("Repository owner/repo must be specified")

    token = os.environ.get("GITHUB_TOKEN")
    metrics = collect_playwright_metrics(
        owner=owner,
        repo=repo,
        workflow_file=args.workflow_file,
        output_path=Path(args.output),
        token=token,
        max_runs=args.max_runs,
    )
    print(json.dumps(asdict(metrics), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
