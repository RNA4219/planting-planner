import type { MarketScope } from '../types'

export interface MarketScopeTheme {
  readonly token: string
  readonly hex: string
  readonly text: string
}

export interface MarketScopeDefinition {
  readonly scope: MarketScope
  readonly displayName: string
  readonly theme: MarketScopeTheme
}

export interface MarketScopeApiTheme {
  readonly token: string
  readonly hex_color: string
  readonly text_color: string
}

export interface MarketScopeApiDefinition {
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
): MarketScopeDefinition => ({
  scope: definition.scope,
  displayName: definition.display_name,
  theme: {
    token: definition.theme.token,
    hex: definition.theme.hex_color,
    text: definition.theme.text_color,
  },
})

export const MARKET_SCOPE_FALLBACK_DEFINITIONS: MarketScopeDefinition[] = [
  {
    scope: 'national',
    displayName: '全国平均',
    theme: {
      token: 'market.national',
      hex: '#2E7D32',
      text: '#FFFFFF',
    },
  },
  {
    scope: 'city:tokyo',
    displayName: '東京都中央卸売',
    theme: {
      token: 'market.city_tokyo',
      hex: '#1565C0',
      text: '#FFFFFF',
    },
  },
  {
    scope: 'city:osaka',
    displayName: '大阪市中央卸売',
    theme: {
      token: 'market.city_osaka',
      hex: '#EF6C00',
      text: '#FFFFFF',
    },
  },
  {
    scope: 'city:nagoya',
    displayName: '名古屋市中央卸売',
    theme: {
      token: 'market.city_nagoya',
      hex: '#6A1B9A',
      text: '#FFFFFF',
    },
  },
]

export const MARKET_SCOPE_OPTIONS: MarketScopeOption[] =
  MARKET_SCOPE_FALLBACK_DEFINITIONS.map(toMarketScopeOption)
