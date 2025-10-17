from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Final, TypedDict


class PytestJsonlRecord(TypedDict):
    name: str
    status: str
    duration: float | None


_FAIL_STATUSES: Final = {"fail", "failed", "failure", "error"}
_SKIP_STATUSES: Final = {"skip", "skipped"}
_PASS_STATUSES: Final = {"pass", "passed", "success"}


def _normalize_status(raw: str) -> str:
    lowered = raw.strip().lower()
    if lowered in _FAIL_STATUSES:
        return "fail"
    if lowered in _SKIP_STATUSES:
        return "skip"
    if lowered in _PASS_STATUSES:
        return "pass"
    return lowered


def export_pytest_junit(junit_path: Path, output_path: Path) -> None:
    root = ET.parse(junit_path).getroot()
    with output_path.open("w", encoding="utf-8") as file:
        for testcase in root.iter("testcase"):
            classname = testcase.get("classname", "").strip()
            name = testcase.get("name", "").strip()
            identifier = f"{classname}::{name}" if classname else name
            if testcase.find("skipped") is not None:
                raw_status = "skipped"
            elif testcase.find("failure") is not None or testcase.find("error") is not None:
                raw_status = "failed"
            else:
                raw_status = testcase.get("status", "passed")
            status = _normalize_status(raw_status)
            value = testcase.get("time")
            try:
                duration: float | None = float(value) if value else None
            except (TypeError, ValueError):
                duration = None
            record: PytestJsonlRecord = {"name": identifier, "status": status, "duration": duration}
            file.write(json.dumps(record, ensure_ascii=False))
            file.write("\n")


__all__ = ["export_pytest_junit", "PytestJsonlRecord"]
