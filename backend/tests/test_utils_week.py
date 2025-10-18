import pytest

from app.utils_week import (
    WeekFormatError,
    iso_week_from_int,
    iso_week_to_date,
    subtract_days_to_iso_week,
)


class TestIsoWeekToDate:
    def test_end_of_year_week(self) -> None:
        result = iso_week_to_date("2020-W53")
        assert result.isoformat() == "2020-12-28"

    def test_start_of_year_week(self) -> None:
        result = iso_week_to_date("2021-W01")
        assert result.isoformat() == "2021-01-04"

    def test_invalid_week_raises(self) -> None:
        with pytest.raises(WeekFormatError):
            iso_week_to_date("2021-W53")


class TestSubtractDaysToIsoWeek:
    def test_cross_year(self) -> None:
        result = subtract_days_to_iso_week("2024-W01", 7)
        assert result == "2023-W52"


class TestIsoWeekFromInt:
    def test_valid_weeks(self) -> None:
        assert iso_week_from_int(202053) == "2020-W53"
        assert iso_week_from_int(202101) == "2021-W01"

    def test_invalid_week_number(self) -> None:
        with pytest.raises(WeekFormatError):
            iso_week_from_int(202154)

    def test_invalid_week_for_year(self) -> None:
        with pytest.raises(WeekFormatError):
            iso_week_from_int(202153)
