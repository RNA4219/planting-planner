import type { ChangeEvent, FormEvent } from 'react'

import { RegionSelect } from './RegionSelect'
import type { CropCategory, MarketScope, Region } from '../types'
import { SEARCH_CONTROLS_TEXT } from '../constants/messages'

const MARKET_SCOPE_OPTIONS: ReadonlyArray<{ value: MarketScope; label: string }> = [
  { value: 'national', label: '全国平均' },
  { value: 'city:tokyo', label: '東京都（市況）' },
]

const CATEGORY_TABS: ReadonlyArray<{ value: CropCategory; label: string }> = [
  { value: 'leaf', label: '葉菜類' },
  { value: 'root', label: '根菜類' },
  { value: 'flower', label: '花卉類' },
]

interface SearchControlsProps {
  queryWeek: string
  currentWeek: string
  onWeekChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRegionChange: (region: Region) => void
  marketScope: MarketScope
  onMarketScopeChange: (scope: MarketScope) => void
  category: CropCategory
  onCategoryChange: (category: CropCategory) => void
  searchKeyword: string
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRefresh: () => void | Promise<void>
  refreshing: boolean
}

export const SearchControls = ({
  queryWeek,
  currentWeek,
  onWeekChange,
  onRegionChange,
  marketScope,
  onMarketScopeChange,
  category,
  onCategoryChange,
  searchKeyword,
  onSearchChange,
  onSubmit,
  onRefresh,
  refreshing,
}: SearchControlsProps) => {
  return (
    <form className="app__controls" onSubmit={onSubmit} noValidate>
      <RegionSelect onChange={onRegionChange} />
      <div className="app__controls-group">
        <label className="app__market" htmlFor="market-scope-select">
          市場
          <select
            id="market-scope-select"
            name="marketScope"
            value={marketScope}
            onChange={(event) => {
              onMarketScopeChange(event.target.value as MarketScope)
            }}
            aria-label="市場"
          >
            {MARKET_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <input
          id="search-input"
          name="search"
          type="search"
          value={searchKeyword}
          onChange={onSearchChange}
          placeholder={SEARCH_CONTROLS_TEXT.searchPlaceholder}
          aria-label={SEARCH_CONTROLS_TEXT.searchAriaLabel}
        />
        <label className="app__week" htmlFor="week-input">
          {SEARCH_CONTROLS_TEXT.weekLabel}
          <input
            id="week-input"
            name="week"
            type="text"
            value={queryWeek}
            onChange={onWeekChange}
            placeholder={currentWeek}
            pattern="\d{4}-W\d{2}"
            inputMode="text"
          />
        </label>
        <div className="app__category-tabs" role="tablist" aria-label="カテゴリ">
          {CATEGORY_TABS.map((tab) => {
            const selected = tab.value === category
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                className={`app__category-tab${selected ? ' app__category-tab--active' : ''}`}
                onClick={() => {
                  if (!selected) {
                    onCategoryChange(tab.value)
                  }
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="app__controls-actions">
          <button type="submit">{SEARCH_CONTROLS_TEXT.submitButton}</button>
          <button
            className={`app__refresh${refreshing ? ' app__refresh--loading' : ''}`}
            type="button"
            onClick={() => {
              void onRefresh()
            }}
            disabled={refreshing}
          >
            {refreshing
              ? SEARCH_CONTROLS_TEXT.refreshingButton
              : SEARCH_CONTROLS_TEXT.refreshButton}
          </button>
        </div>
      </div>
    </form>
  )
}

SearchControls.displayName = 'SearchControls'
