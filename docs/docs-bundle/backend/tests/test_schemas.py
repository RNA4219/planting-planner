import pytest

from app.schemas import (
    DEFAULT_MARKET_SCOPE,
    MarketScope,
    parse_crop_category,
    parse_market_scope,
)


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("national", "national"),
        ("city:123", "city:123"),
        ("  city:tokyo  ", "city:tokyo"),
    ],
)
def test_parse_market_scope_valid(raw: str, expected: str) -> None:
    assert parse_market_scope(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "city:",
        "city:   ",
        "international",
        42,
    ],
)
def test_parse_market_scope_invalid(raw: object) -> None:
    with pytest.raises((TypeError, ValueError)):
        parse_market_scope(raw)  # type: ignore[arg-type]


def test_default_market_scope_constant() -> None:
    assert DEFAULT_MARKET_SCOPE == "national"
    assert isinstance(DEFAULT_MARKET_SCOPE, str)

    # Ensure type compatibility
    def _accept_scope(scope: MarketScope) -> MarketScope:
        return scope

    assert _accept_scope(DEFAULT_MARKET_SCOPE) == "national"


@pytest.mark.parametrize("raw", ["fruit", " Fruit ", "FRUIT"])
def test_parse_crop_category_rejects_fruit(raw: str) -> None:
    with pytest.raises(ValueError):
        parse_crop_category(raw)
