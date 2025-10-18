from __future__ import annotations

import datetime as dt
import sqlite3
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.seed import SeedPayload
from scripts import export_seed


@pytest.fixture
def sample_payload() -> SeedPayload:
    return SeedPayload(
        crops=[
            {
                "id": 1,
                "name": "Test Crop",
                "category": "leaf",
            }
        ],
        price_samples=[
            {
                "crop_id": 1,
                "week": "2024-W01",
                "avg_price": 120,
                "stddev": 5,
                "unit": "円/kg",
                "source": "seed",
            }
        ],
        growth_days=[{"crop_id": 1, "region": "tokyo", "days": 40}],
        market_scopes=[
            {
                "scope": "market:tokyo",
                "display_name": "Tokyo",
                "timezone": "Asia/Tokyo",
                "priority": 1,
                "theme_token": "theme.tokyo",
            }
        ],
        market_scope_categories=[
            {
                "scope": "market:tokyo",
                "category": "leaf",
                "display_name": "Leaf",
                "priority": 10,
                "source": "seed",
            }
        ],
        theme_tokens=[
            {
                "token": "theme.tokyo",
                "hex_color": "#00FF00",
                "text_color": "#000000",
            }
        ],
    )


def test_export_seed_script_writes_metadata(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, sample_payload: SeedPayload
) -> None:
    output_path = tmp_path / "seed-test.db"

    calls: dict[str, int] = {"load": 0}

    def fake_load_seed_payload(*, data_dir: Path | None = None) -> SeedPayload:
        calls["load"] += 1
        return sample_payload

    monkeypatch.setattr(export_seed, "load_seed_payload", fake_load_seed_payload)
    monkeypatch.setattr(export_seed, "_resolve_git_commit", lambda: "deadbeef")
    monkeypatch.setattr(export_seed, "_resolve_schema_version", lambda: "schema-1")
    monkeypatch.setattr(export_seed, "_today", lambda: dt.date(2024, 1, 2))

    fake_now = dt.datetime(2024, 1, 2, 3, 4, 5, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(export_seed, "_utcnow", lambda: fake_now)

    exit_code = export_seed.main(["--output", str(output_path)])

    assert exit_code == 0
    assert output_path.exists()
    assert calls["load"] == 1

    conn = sqlite3.connect(output_path)
    try:
        rows = dict(conn.execute("SELECT key, value FROM metadata"))
    finally:
        conn.close()

    assert rows["schema_version"] == "schema-1"
    assert rows["data_fetched_at"] == "2024-01-02"
    assert rows["git_commit"] == "deadbeef"
    assert rows["exported_at"] == fake_now.isoformat()
