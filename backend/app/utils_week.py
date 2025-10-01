from __future__ import annotations

import re
from datetime import date, timedelta


ISO_WEEK_PATTERN = re.compile(r"^(\d{4})-W(\d{2})$")


class WeekFormatError(ValueError):
    pass


def iso_week_to_date(week: str) -> date:
    match = ISO_WEEK_PATTERN.fullmatch(week)
    if match is None:
        raise WeekFormatError("week must be in ISO format YYYY-Www")

    year = int(match.group(1))
    week_number = int(match.group(2))
    if not 1 <= week_number <= 53:
        raise WeekFormatError("week number must be between 1 and 53")

    return date.fromisocalendar(year, week_number, 1)


def iso_week_to_date_mid(week: str) -> date:
    base = iso_week_to_date(week)
    return base + timedelta(days=2)


def date_to_iso_week(value: date) -> str:
    iso = value.isocalendar()
    return f"{iso.year:04d}-W{iso.week:02d}"


def subtract_days_to_iso_week(week: str, days: int) -> str:
    base_date = iso_week_to_date_mid(week)
    target_date = base_date - timedelta(days=days)
    return date_to_iso_week(target_date)


def iso_week_from_int(week: int) -> str:
    iso_week = f"{week // 100:04d}-W{week % 100:02d}"
    iso_week_to_date_mid(iso_week)
    return iso_week


def current_iso_week() -> str:
    return date_to_iso_week(date.today())
