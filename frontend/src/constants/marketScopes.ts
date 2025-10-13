import type { MarketScope } from '../types'

export interface MarketScopeTheme {
  readonly token: string
  readonly hex: string
  readonly text: string
}

interface MarketScopeMetadata {
  readonly timezone?: string
  readonly priority?: number
  readonly effective_from?: string | null
  readonly categories?: readonly string[]
}

export interface MarketScopeDefinition extends MarketScopeMetadata {
  readonly scope: MarketScope
  readonly displayName: string
  readonly theme: MarketScopeTheme
}

export interface MarketScopeApiTheme {
  readonly token: string
  readonly hex_color: string
  readonly text_color: string
}

export interface MarketScopeApiDefinition extends MarketScopeMetadata {
  readonly scope: MarketScope
  readonly display_name: string
  readonly theme: MarketScopeApiTheme
}

export type MarketScopeOption = MarketScopeDefinition & {
  readonly value: MarketScope
  readonly label: string
}

export type MarketScopeSelectOption = Pick<MarketScopeOption, 'value' | 'label'>

export const toMarketScopeOption = (
  definition: MarketScopeDefinition,
): MarketScopeOption => ({
  ...definition,
  value: definition.scope,
  label: definition.displayName,
})

export const fromMarketScopeApiDefinition = (
  definition: MarketScopeApiDefinition,
): MarketScopeDefinition => {
  const { scope, display_name, theme, ...metadata } = definition

  return {
    scope,
    displayName: display_name,
    theme: {
      token: theme.token,
      hex: theme.hex_color,
      text: theme.text_color,
    },
    ...metadata,
  }
}

export const MARKET_SCOPE_FALLBACK_DEFINITIONS: MarketScopeDefinition[] = [
  {
    scope: 'national',
    displayName: '全国平均',
    theme: {
      token: 'market-national',
      hex: '#2E7D32',
      text: '#0f172a',
    },
    timezone: 'Asia/Tokyo',
    priority: 10,
    categories: [],
  },
  {
    scope: 'city:tokyo',
    displayName: '東京都中央卸売',
    theme: {
      token: 'market-tokyo',
      hex: '#1565C0',
      text: '#FFFFFF',
    },
    timezone: 'Asia/Tokyo',
    priority: 20,
    categories: [],
  },
  {
    scope: 'city:osaka',
    displayName: '大阪市中央卸売',
    theme: {
      token: 'market-osaka',
      hex: '#EF6C00',
      text: '#FFFFFF',
    },
    timezone: 'Asia/Tokyo',
    priority: 30,
    categories: [],
  },
  {
    scope: 'city:nagoya',
    displayName: '名古屋市中央卸売',
    theme: {
      token: 'market-nagoya',
      hex: '#6A1B9A',
      text: '#FFFFFF',
    },
    timezone: 'Asia/Tokyo',
    priority: 40,
    categories: [],
  },
]

export const MARKET_SCOPE_OPTIONS: MarketScopeOption[] =
  MARKET_SCOPE_FALLBACK_DEFINITIONS.map(toMarketScopeOption)
