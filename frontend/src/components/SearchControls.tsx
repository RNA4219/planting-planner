import type { ChangeEvent, FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'

import { RegionSelect } from './RegionSelect'
import type { MarketScope, Region } from '../types'
import { SEARCH_CONTROLS_TEXT } from '../constants/messages'
import { MARKET_SCOPE_OPTIONS } from '../constants/marketScopes'
import { fetchMarkets } from '../lib/api'

type MarketScopeThemeOption = { readonly value: MarketScope; readonly label: string; readonly scope?: MarketScope; readonly theme?: { readonly token?: string } }
const clsx = (...tokens: Array<string | false | null | undefined>): string => tokens.filter(Boolean).join(' ')
const toMarketTheme = (options: MarketScopeThemeOption[], scope: MarketScope): string => {
  const selected = options.find((option) => option.value === scope)
  const rawToken = selected?.theme?.token
  if (rawToken?.startsWith('market-')) return rawToken.replace('market-', '')
  if (rawToken) return rawToken
  const fallbackScope = selected?.scope ?? scope
  return fallbackScope === 'national'
    ? 'national'
    : fallbackScope.startsWith('city:')
      ? 'city'
      : 'national'
}

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

  const marketOptions: MarketScopeThemeOption[] = isSuccess
    ? marketsResponse.markets
    : MARKET_SCOPE_OPTIONS
  const marketTheme = toMarketTheme(marketOptions, marketScope)

  return (
    <form
      className="grid w-full gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end"
      onSubmit={onSubmit}
      noValidate
    >
      <RegionSelect onChange={onRegionChange} />
      <select
        aria-label="市場"
        name="marketScope"
        value={marketScope}
        onChange={(event) => {
          onMarketScopeChange(event.target.value as MarketScope)
        }}
        className={clsx(
          'w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:text-base',
          `bg-market-${marketTheme}`,
          `text-market-${marketTheme}`,
        )}
      >
        {marketOptions.map((option) => (
          <option key={option.value} value={option.value} className="bg-white text-slate-900">
            {option.label}
          </option>
        ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <input
          id="search-input"
          name="search"
          type="search"
          value={searchKeyword}
          onChange={onSearchChange}
          placeholder={SEARCH_CONTROLS_TEXT.searchPlaceholder}
          aria-label={SEARCH_CONTROLS_TEXT.searchAriaLabel}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:text-base"
        />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700" htmlFor="week-input">
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:text-base"
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:text-base"
          >
            {SEARCH_CONTROLS_TEXT.submitButton}
          </button>
          <button
            className={clsx(
              'inline-flex items-center justify-center rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base',
              'relative overflow-hidden before:absolute before:left-3 before:top-1/2 before:h-4 before:w-4 before:-translate-y-1/2 before:rounded-full before:border-2 before:border-current before:border-t-transparent before:opacity-0 before:content-[""]',
              refreshing &&
                'pl-10 before:animate-spin before:opacity-100 before:transition-opacity',
            )}
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
