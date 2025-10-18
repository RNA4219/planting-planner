from __future__ import annotations

import argparse
import datetime as dt
import os
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Sequence

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
for path in (BACKEND_DIR, ROOT_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from app import db as db_module  # noqa: E402
from app import seed as seed_module  # noqa: E402

load_seed_payload = seed_module.load_seed_payload
write_seed_payload = seed_module.write_seed_payload
SeedPayload = seed_module.SeedPayload

_DATA_DIR = ROOT_DIR / "data"
_METADATA_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
""".strip()


def _today() -> dt.date:
    return dt.date.today()


def _utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _default_output(today: dt.date) -> Path:
    return _DATA_DIR / f"seed-{today:%Y%m%d}.db"


def _resolve_schema_version() -> str:
    for key in ("PLANTING_SCHEMA_VERSION", "VITE_SCHEMA_VERSION"):
        value = os.getenv(key)
        if value:
            return value
    return "unknown"


def _resolve_git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        return "unknown"


def _ensure_output_path(path: Path) -> None:
    if path.exists():
        raise SystemExit(f"Output file already exists: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)


def _open_connection(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _write_metadata(
    conn: sqlite3.Connection,
    *,
    schema_version: str,
    data_fetched_at: str,
    git_commit: str,
    exported_at: str,
) -> None:
    conn.execute(_METADATA_TABLE_SQL)
    records = [
        ("schema_version", schema_version),
        ("data_fetched_at", data_fetched_at),
        ("git_commit", git_commit),
        ("exported_at", exported_at),
    ]
    conn.executemany("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)", records)


def _export_database(
    output_path: Path,
    *,
    data_dir: Path | None,
    data_date: str | None,
    today: dt.date,
) -> None:
    _ensure_output_path(output_path)
    payload: SeedPayload = load_seed_payload(data_dir=data_dir)
    conn = _open_connection(output_path)
    try:
        db_module.init_db(conn)
        write_seed_payload(
            conn,
            crops=payload.crops,
            price_samples=payload.price_samples,
            growth_days=payload.growth_days,
            market_scopes=payload.market_scopes,
            market_scope_categories=payload.market_scope_categories,
            theme_tokens=payload.theme_tokens,
        )
        exported_at = _utcnow().isoformat()
        fetched_at = data_date or today.isoformat()
        _write_metadata(
            conn,
            schema_version=_resolve_schema_version(),
            data_fetched_at=fetched_at,
            git_commit=_resolve_git_commit(),
            exported_at=exported_at,
        )
        conn.commit()
    finally:
        conn.close()


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export seed payload into sqlite database")
    parser.add_argument("--output", type=Path, help="Output database path")
    parser.add_argument("--data-dir", type=Path, help="Seed data directory", default=None)
    parser.add_argument("--data-date", type=str, help="Data acquisition date (YYYY-MM-DD)")
    args = parser.parse_args(argv)

    today = _today()
    output_path = args.output if args.output is not None else _default_output(today)

    _export_database(
        output_path,
        data_dir=args.data_dir,
        data_date=args.data_date,
        today=today,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
