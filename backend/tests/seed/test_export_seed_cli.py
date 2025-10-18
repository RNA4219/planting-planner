from __future__ import annotations

import datetime as dt
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]


def test_export_seed_cli_creates_database_with_metadata(tmp_path: Path) -> None:
    output_path = tmp_path / "seed.db"
    env = os.environ.copy()
    env["PLANTING_SCHEMA_VERSION"] = "cli-test-schema"

    result = subprocess.run(
        [
            sys.executable,
            str(ROOT_DIR / "scripts" / "export_seed.py"),
            "--output",
            str(output_path),
            "--data-dir",
            str(ROOT_DIR / "data"),
            "--data-date",
            "2024-01-02",
        ],
        cwd=ROOT_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert output_path.exists()

    conn = sqlite3.connect(output_path)
    try:
        rows = dict(conn.execute("SELECT key, value FROM metadata"))
    finally:
        conn.close()

    assert rows["schema_version"] == "cli-test-schema"
    assert rows["data_fetched_at"] == "2024-01-02"
    assert rows["git_commit"]
    dt.datetime.fromisoformat(rows["exported_at"])
