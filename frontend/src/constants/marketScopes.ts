import type { MarketScope } from '../types'

export interface MarketScopeOption {
  value: MarketScope
  label: string
}

export const MARKET_SCOPE_OPTIONS: MarketScopeOption[] = [
  { value: 'national', label: '全国平均' },
  { value: 'city:tokyo', label: '東京都中央卸売' },
  { value: 'city:osaka', label: '大阪市中央卸売' },
  { value: 'city:nagoya', label: '名古屋市中央卸売' },
]
