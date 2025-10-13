import type { ChangeEvent, FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'

import { RegionSelect } from './RegionSelect'
import type { MarketScope, Region } from '../types'
import { SEARCH_CONTROLS_TEXT } from '../constants/messages'
import {
  MARKET_SCOPE_FALLBACK_DEFINITIONS,
  MARKET_SCOPE_OPTIONS,
  type MarketScopeOption,
  type MarketScopeTheme,
} from '../constants/marketScopes'
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

const MARKET_THEME_BACKGROUND_CLASSES: Record<string, string> = {
  'market-national': 'bg-market-national',
  'market-city': 'bg-market-city',
  'market-neutral': 'bg-market-neutral',
}

const FALLBACK_THEME_BY_SCOPE = new Map<MarketScope, MarketScopeTheme>(
  MARKET_SCOPE_FALLBACK_DEFINITIONS.map((definition) => [definition.scope, definition.theme]),
)

const FALLBACK_THEME_BY_GROUP: Record<'national' | 'city' | 'default', MarketScopeTheme> = {
  national: { token: 'market-national', hex: '#22c55e', text: '#FFFFFF' },
  city: { token: 'market-city', hex: '#2563eb', text: '#f8fafc' },
  default: { token: 'market-neutral', hex: '#64748b', text: '#f8fafc' },
}

const normalizeBackgroundToken = (scope: MarketScope, token: string): string => {
  if (token in MARKET_THEME_BACKGROUND_CLASSES) {
    return token
  }
  if (scope === 'national') {
    return 'market-national'
  }
  if (scope.startsWith('city:')) {
    return 'market-city'
  }
  return 'market-neutral'
}

const getMarketSelectTheme = (
  scope: MarketScope,
  optionTheme: MarketScopeOption['theme'] | undefined,
  fallbackTheme: MarketScopeTheme,
): {
  readonly backgroundClass: string
  readonly dataTheme: string
  readonly textColor: string
  readonly fallbackTheme: MarketScopeTheme
  readonly optionTheme: MarketScopeTheme | undefined
} => {
  const backgroundToken = optionTheme?.token
    ? normalizeBackgroundToken(scope, optionTheme.token)
    : normalizeBackgroundToken(scope, fallbackTheme.token)

  const backgroundClass =
    MARKET_THEME_BACKGROUND_CLASSES[backgroundToken] ?? MARKET_THEME_BACKGROUND_CLASSES['market-neutral'] ?? 'bg-market-neutral'
  const textColor = optionTheme?.text ?? fallbackTheme.text ?? FALLBACK_THEME_BY_GROUP.default.text
  const dataTheme = optionTheme?.token ?? fallbackTheme.token

  return { backgroundClass, dataTheme, textColor, fallbackTheme, optionTheme }
}

const resolveMarketTheme = (
  scope: MarketScope,
  options: readonly MarketScopeOption[],
): {
  readonly backgroundClass: string
  readonly dataTheme: string
  readonly textColor: string
  readonly fallbackTheme: MarketScopeTheme
  readonly optionTheme: MarketScopeTheme | undefined
} => {
  const fallbackByScope = FALLBACK_THEME_BY_SCOPE.get(scope)
  const fallbackByGroup = scope === 'national'
    ? FALLBACK_THEME_BY_GROUP.national
    : scope.startsWith('city:')
      ? FALLBACK_THEME_BY_GROUP.city
      : FALLBACK_THEME_BY_GROUP.default
  const fallbackTheme = fallbackByScope ?? fallbackByGroup

  const activeOption = options.find((option) => option.value === scope)

  return getMarketSelectTheme(scope, activeOption?.theme, fallbackTheme)
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

  const marketOptions: readonly MarketScopeOption[] = isSuccess ? marketsResponse.markets : MARKET_SCOPE_OPTIONS
  const { fallbackTheme, optionTheme } = resolveMarketTheme(marketScope, marketOptions)
  const marketTheme = getMarketSelectTheme(marketScope, optionTheme, fallbackTheme)

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
          className={`w-full rounded-md border border-slate-300 ${marketTheme.backgroundClass} px-3 py-2 text-sm shadow-sm transition focus:border-market-accent focus:outline-none focus:ring-2 focus:ring-market-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100`}
          data-theme={marketTheme.dataTheme}
          name="marketScope"
          style={{ color: marketTheme.textColor }}
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
