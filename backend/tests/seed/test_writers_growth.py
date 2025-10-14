from __future__ import annotations

import sqlite3

import pytest

from app.seed.writers import growth


@pytest.fixture()
def growth_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute(
        """
        CREATE TABLE growth_days (
            crop_id INTEGER NOT NULL,
            region TEXT NOT NULL,
            days INTEGER NOT NULL,
            PRIMARY KEY (crop_id, region)
        )
        """
    )
    return conn


def test_write_growth_days_coerces_numeric_strings(growth_conn: sqlite3.Connection) -> None:
    growth.write_growth_days(
        growth_conn,
        [{"crop_id": "1", "region": "jp", "days": "30"}],
    )

    row = growth_conn.execute(
        "SELECT crop_id, region, days FROM growth_days"
    ).fetchone()

    assert row == (1, "jp", 30)


def test_write_growth_days_rejects_non_numeric_values(growth_conn: sqlite3.Connection) -> None:
    with pytest.raises(TypeError):
        growth.write_growth_days(
            growth_conn,
            [{"crop_id": object(), "region": "jp", "days": "30"}],
        )
