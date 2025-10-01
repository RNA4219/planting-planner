from __future__ import annotations

from datetime import date, timedelta


class WeekFormatError(ValueError):
    pass


def _split_week(week: int) -> tuple[int, int]:
    week_str = str(week)
    if len(week_str) != 6:
        raise WeekFormatError("week must be in YYYYWW format")
    year = int(week_str[:4])
    week_number = int(week_str[4:])
    if not 1 <= week_number <= 53:
        raise WeekFormatError("week number must be between 1 and 53")
    return year, week_number


def week_to_date(week: int) -> date:
    year, week_number = _split_week(week)
    return date.fromisocalendar(year, week_number, 1)


def date_to_week(value: date) -> int:
    iso = value.isocalendar()
    return iso.year * 100 + iso.week


def add_weeks(week: int, delta: int) -> int:
    base = week_to_date(week)
    new_date = base + timedelta(weeks=delta)
    return date_to_week(new_date)


def subtract_weeks(week: int, delta: int) -> int:
    return add_weeks(week, -delta)


def weeks_from_days(days: int) -> int:
    if days <= 0:
        return 0
    return (days + 6) // 7


def current_week() -> int:
    return date_to_week(date.today())
