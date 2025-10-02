from __future__ import annotations

import json
import sqlite3
import time
from collections import defaultdict
from collections.abc import Callable, Iterable
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, Final, cast

from . import db, schemas, utils_week

STATE_RUNNING: Final[schemas.RefreshState] = "running"
STATE_SUCCESS: Final[schemas.RefreshState] = "success"
STATE_FAILURE: Final[schemas.RefreshState] = "failure"
STATE_STALE: Final[schemas.RefreshState] = "stale"

_STATE_LOOKUP: dict[str, schemas.RefreshState] = {
    STATE_RUNNING: STATE_RUNNING,
    STATE_SUCCESS: STATE_SUCCESS,
    STATE_FAILURE: STATE_FAILURE,
    STATE_STALE: STATE_STALE,
}

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_DEFAULT_PRICE_SOURCE = _DATA_DIR / "price_weekly.sample.json"
_UNIT_FACTORS: dict[str, float] = {"円/kg": 1.0, "円/100g": 10.0, "円/500g": 2.0, "円/g": 1000.0}

DataLoader = Callable[[], Iterable[dict[str, Any]]]


def _utc_now() -> str:
    return datetime.now(tz=UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _ensure_schema(conn: sqlite3.Connection) -> None:
    columns = {row[1] for row in conn.execute("PRAGMA table_info('etl_runs')").fetchall()}
    migrations: dict[str, str] = {
        "state": "ALTER TABLE etl_runs ADD COLUMN state TEXT",
        "started_at": "ALTER TABLE etl_runs ADD COLUMN started_at TEXT",
        "finished_at": "ALTER TABLE etl_runs ADD COLUMN finished_at TEXT",
        "last_error": "ALTER TABLE etl_runs ADD COLUMN last_error TEXT",
    }
    mutated = False
    for column, ddl in migrations.items():
        if column not in columns:
            conn.execute(ddl)
            mutated = True
    if mutated:
        conn.commit()


def _coerce_state(value: Any) -> schemas.RefreshState:
    if isinstance(value, str):
        normalized = value.lower()
        state = _STATE_LOOKUP.get(normalized)
        if state is not None:
            return state
    return STATE_STALE


def load_price_feed(path: Path | None = None) -> list[dict[str, Any]]:
    target = _DEFAULT_PRICE_SOURCE if path is None else path
    if not target.exists():
        return []
    with target.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        raise ValueError(f"Expected list payload in {target}")
    return [dict(item) for item in payload]


def _normalize_week(value: Any) -> str:
    if isinstance(value, int):
        return utils_week.iso_week_from_int(int(value))
    if isinstance(value, str):
        raw = value.strip()
        try:
            utils_week.iso_week_to_date_mid(raw)
        except utils_week.WeekFormatError:
            try:
                parsed = date.fromisoformat(raw)
            except ValueError as exc:  # pragma: no cover - defensive
                raise ValueError(f"Unsupported week value: {value!r}") from exc
            return utils_week.date_to_iso_week(parsed)
        return raw
    raise TypeError(f"Unsupported week value: {value!r}")


def _scaled_number(value: Any, factor: float) -> float | None:
    if value is None:
        return None
    if isinstance(value, int | float):
        return float(value) * factor
    raise TypeError(f"Unsupported numeric value: {value!r}")


def run_etl(conn: sqlite3.Connection, *, data_loader: DataLoader | None = None) -> int:
    loader = load_price_feed if data_loader is None else data_loader
    records = list(loader())
    if not records:
        return 0

    converted: list[tuple[int, str, float | None, float | None, str]] = []
    for record in records:
        unit_raw = str(record.get("unit", "円/kg")).strip()
        factor = _UNIT_FACTORS.get(unit_raw)
        if factor is None:
            raise ValueError(f"Unsupported unit: {unit_raw}")
        converted.append(
            (
                int(record["crop_id"]),
                _normalize_week(record.get("week")),
                _scaled_number(record.get("avg_price"), factor),
                _scaled_number(record.get("stddev"), factor),
                str(record.get("source", "external")),
            )
        )

    converted.sort(key=lambda item: (item[0], utils_week.iso_week_to_date_mid(item[1])))
    history: dict[int, list[float | None]] = defaultdict(list)
    transformed: list[tuple[int, str, float | None, float | None, str, str]] = []
    for crop_id, week_iso, avg_price, stddev, source in converted:
        recent = [value for value in history[crop_id][-3:] if value is not None]
        if avg_price is None and recent:
            avg_price = sum(recent) / len(recent)
        history[crop_id].append(avg_price)
        transformed.append((crop_id, week_iso, avg_price, stddev, "円/kg", source))

    conn.executemany(
        """
        INSERT INTO price_weekly (
            crop_id, week, avg_price, stddev, unit, source
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(crop_id, week) DO UPDATE SET
            avg_price = excluded.avg_price,
            stddev = excluded.stddev,
            unit = excluded.unit,
            source = excluded.source
        """,
        transformed,
    )
    conn.commit()
    return len(transformed)


def start_etl_job(
    *,
    data_loader: DataLoader | None = None,
    conn_factory: Callable[[], sqlite3.Connection] | None = None,
    max_retries: int = 3,
    retry_delay: float = 0.1,
) -> None:
    factory = conn_factory if conn_factory is not None else db.get_conn
    conn = factory()
    try:
        _ensure_schema(conn)
        started_at = _utc_now()
        cursor = conn.execute(
            """
            INSERT INTO etl_runs (
                run_at,
                status,
                updated_records,
                error_message,
                state,
                started_at,
                finished_at,
                last_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (started_at, STATE_RUNNING, 0, None, STATE_RUNNING, started_at, None, None),
        )
        run_id_raw = cursor.lastrowid
        if run_id_raw is None:  # pragma: no cover - SQLite guarantees an id for AUTOINCREMENT
            raise RuntimeError("Failed to persist ETL run metadata")
        run_id = int(run_id_raw)
        conn.commit()

        try:
            attempt = 0
            while True:
                try:
                    updated_records = run_etl(conn, data_loader=data_loader)
                    break
                except sqlite3.DatabaseError:
                    attempt += 1
                    if attempt >= max_retries:
                        raise
                    if retry_delay:
                        time.sleep(retry_delay)
        except Exception as exc:  # pragma: no cover - defensive path
            finished_at = _utc_now()
            error_message = str(exc)
            conn.execute(
                """
                UPDATE etl_runs
                SET status = ?,
                    state = ?,
                    finished_at = ?,
                    last_error = ?,
                    error_message = ?
                WHERE id = ?
                """,
                (STATE_FAILURE, STATE_FAILURE, finished_at, error_message, error_message, run_id),
            )
            conn.commit()
            raise
        else:
            finished_at = _utc_now()
            conn.execute(
                """
                UPDATE etl_runs
                SET status = ?,
                    state = ?,
                    finished_at = ?,
                    updated_records = ?,
                    last_error = NULL,
                    error_message = NULL
                WHERE id = ?
                """,
                (STATE_SUCCESS, STATE_SUCCESS, finished_at, updated_records, run_id),
            )
            conn.commit()
    finally:
        conn.close()


def get_last_status(conn: sqlite3.Connection) -> schemas.RefreshStatus:
    _ensure_schema(conn)
    row = conn.execute(
        """
        SELECT
            COALESCE(state, status) AS state,
            COALESCE(started_at, run_at) AS started_at,
            finished_at,
            updated_records,
            COALESCE(last_error, error_message) AS last_error,
            run_at
        FROM etl_runs
        ORDER BY COALESCE(started_at, run_at) DESC
        LIMIT 1
        """,
    ).fetchone()
    if row is None:
        return schemas.RefreshStatus(
            state="stale",
            started_at=None,
            finished_at=None,
            updated_records=0,
            last_error=None,
        )

    state = _coerce_state(row["state"])
    finished_at = cast(str | None, row["finished_at"])
    raw_updated_records = cast(int | None, row["updated_records"])
    updated_records = 0 if raw_updated_records is None else int(raw_updated_records)
    return schemas.RefreshStatus(
        state=state,
        started_at=row["started_at"],
        finished_at=finished_at,
        updated_records=updated_records,
        last_error=cast(str | None, row["last_error"]),
    )
