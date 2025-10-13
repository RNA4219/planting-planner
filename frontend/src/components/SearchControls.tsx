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

  const refreshButtonClassName = refreshing
    ? 'inline-flex items-center justify-center rounded-lg border border-market-accent/50 bg-market-accent/10 px-3 py-2 text-sm font-semibold text-market-accent shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-accent disabled:cursor-not-allowed disabled:opacity-70'
    : 'inline-flex items-center justify-center rounded-lg border border-market-accent/50 bg-transparent px-3 py-2 text-sm font-semibold text-market-accent shadow-sm transition hover:bg-market-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-accent disabled:cursor-not-allowed disabled:opacity-70'

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-market-neutral/40 bg-market-neutral/10 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 md:flex-nowrap md:items-center"
      onSubmit={onSubmit}
      noValidate
    >
      <RegionSelect onChange={onRegionChange} />
      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:w-auto">
        <span>市場</span>
        <select
          aria-label="市場"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-market-accent focus:outline-none focus:ring-2 focus:ring-market-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100"
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
      </label>
      <div className="flex w-full flex-col gap-4 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 md:flex-nowrap md:items-center">
        <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:flex-1">
          <span className="sr-only">{SEARCH_CONTROLS_TEXT.searchAriaLabel}</span>
          <input
            id="search-input"
            name="search"
            type="search"
            value={searchKeyword}
            onChange={onSearchChange}
            placeholder={SEARCH_CONTROLS_TEXT.searchPlaceholder}
            aria-label={SEARCH_CONTROLS_TEXT.searchAriaLabel}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-market-accent focus:outline-none focus:ring-2 focus:ring-market-accent focus:ring-offset-2"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:w-40">
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
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-market-accent focus:outline-none focus:ring-2 focus:ring-market-accent focus:ring-offset-2"
          />
        </label>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-market-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-market-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            {SEARCH_CONTROLS_TEXT.submitButton}
          </button>
          <button
            className={refreshButtonClassName}
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
