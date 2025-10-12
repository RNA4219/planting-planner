import { vi } from 'vitest'

import type {
  Crop,
  CropCategory,
  MarketScope,
  PriceSeries,
  RecommendResponse,
  RefreshResponse,
  RefreshStatusResponse,
  Region,
} from '../../../src/types'
import type { MarketsResponse, RecommendResponseWithFallback } from '../../../src/lib/api'
import { MARKET_SCOPE_OPTIONS } from '../../../src/constants/marketScopes'

export const fetchRecommendations = vi.fn<
  (
    region: Region,
    week: string | undefined,
    options: { marketScope: MarketScope; category: CropCategory },
  ) => Promise<RecommendResponseWithFallback>
>()

export const fetchRecommend = vi.fn<
  (input: { region: Region; week?: string }) => Promise<RecommendResponse>
>()

export const fetchCrops = vi.fn<() => Promise<Crop[]>>()

export const fetchMarkets = vi.fn<() => Promise<MarketsResponse>>().mockResolvedValue({
  markets: MARKET_SCOPE_OPTIONS,
  generated_at: '1970-01-01T00:00:00.000Z',
})

export const postRefresh = vi.fn<() => Promise<RefreshResponse>>()

export const fetchRefreshStatus = vi.fn<() => Promise<RefreshStatusResponse>>()

export const fetchPrice = vi.fn<
  (
    cropId: number,
    frm?: string,
    to?: string,
    marketScope?: MarketScope,
  ) => Promise<PriceSeries>
>()

vi.mock('../../../src/lib/api', () => ({
  fetchRecommendations,
  fetchRecommend,
  fetchCrops,
  fetchMarkets,
  postRefresh,
  fetchRefreshStatus,
  fetchPrice,
}))

export const resetApiMocks = () => {
  fetchRecommendations.mockReset()
  fetchRecommend.mockReset()
  fetchCrops.mockReset()
  fetchMarkets.mockReset()
  fetchMarkets.mockResolvedValue({
    markets: MARKET_SCOPE_OPTIONS,
    generated_at: '1970-01-01T00:00:00.000Z',
  })
  postRefresh.mockReset()
  fetchRefreshStatus.mockReset()
  fetchPrice.mockReset()
}
