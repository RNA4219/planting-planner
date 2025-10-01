from __future__ import annotations

import json
from pathlib import Path

from pytest import MonkeyPatch

from app import db, seed


DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _load_json(path: Path) -> list[dict[str, object]]:
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise TypeError(f"Expected list in {path}")
    return [dict(item) for item in data]


def test_seed_inserts_declared_ids_and_growth_days(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    db_path = tmp_path / "seed.sqlite"
    monkeypatch.setenv("DATABASE_FILE", str(db_path))

    conn = db.get_conn()
    try:
        db.init_db(conn)
        seed.seed(conn)

        crops_expected = _load_json(DATA_DIR / "crops.json")
        crop_rows = conn.execute(
            "SELECT id, name, category FROM crops ORDER BY id"
        ).fetchall()
        assert [
            (int(row["id"]), row["name"], row["category"])
            for row in crop_rows
        ] == [
            (int(item["id"]), str(item["name"]), str(item["category"]))
            for item in crops_expected
        ]

        growth_expected = _load_json(DATA_DIR / "growth_days.json")
        growth_rows = conn.execute(
            "SELECT crop_id, region, days FROM growth_days ORDER BY crop_id, region"
        ).fetchall()
        assert [
            (int(row["crop_id"]), row["region"], int(row["days"]))
            for row in growth_rows
        ] == [
            (
                int(item["crop_id"]),
                str(item["region"]),
                int(item["days"]),
            )
            for item in sorted(
                growth_expected,
                key=lambda entry: (int(entry["crop_id"]), str(entry["region"]))
            )
        ]
    finally:
        conn.close()
