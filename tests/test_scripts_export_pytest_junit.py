from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.export_pytest_junit import export_pytest_junit


def test_status_is_normalized(tmp_path: Path) -> None:
    junit_path = tmp_path / "report.xml"
    junit_path.write_text(
        (
            "<testsuite name=\"demo\" tests=\"3\" failures=\"1\" skipped=\"1\">"
            "<testcase classname=\"pkg.module\" name=\"test_ok\" time=\"0.01\" />"
            "<testcase classname=\"pkg.module\" name=\"test_fail\" time=\"0.02\">"
            "<failure message=\"boom\" type=\"AssertionError\" />"
            "</testcase>"
            "<testcase classname=\"pkg.module\" name=\"test_skip\" time=\"0.0\">"
            "<skipped message=\"not now\" />"
            "</testcase>"
            "</testsuite>"
        ),
        encoding="utf-8",
    )

    output_path = tmp_path / "report.jsonl"
    export_pytest_junit(junit_path, output_path)

    records = [
        json.loads(line)
        for line in output_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    statuses = {record["name"]: record["status"] for record in records}
    assert statuses["pkg.module::test_fail"] == "fail"
    assert statuses["pkg.module::test_skip"] == "skip"
    assert statuses["pkg.module::test_ok"] == "pass"
