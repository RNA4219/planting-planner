import type { ChangeEvent, FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'

import { RegionSelect } from './RegionSelect'
import type { MarketScope, Region } from '../types'
import { SEARCH_CONTROLS_TEXT } from '../constants/messages'
import { MARKET_SCOPE_OPTIONS } from '../constants/marketScopes'
import { fetchMarkets } from '../lib/api'

interface SearchControlsProps {
  queryWeek: string
  currentWeek: string
  onWeekChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRegionChange: (region: Region) => void
  marketScope: MarketScope
  onMarketScopeChange: (scope: MarketScope) => void
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
  searchKeyword,
  onSearchChange,
  onSubmit,
  onRefresh,
  refreshing,
}: SearchControlsProps) => {
  const { data: marketsResponse, isSuccess } = useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarkets,
  })

  const marketOptions = isSuccess ? marketsResponse.markets : MARKET_SCOPE_OPTIONS

  return (
    <form className="app__controls" onSubmit={onSubmit} noValidate>
      <RegionSelect onChange={onRegionChange} />
      <select
        aria-label="市場"
        name="marketScope"
        value={marketScope}
        onChange={(event) => {
          onMarketScopeChange(event.target.value as MarketScope)
        }}
      >
        {marketOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="app__controls-group">
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
