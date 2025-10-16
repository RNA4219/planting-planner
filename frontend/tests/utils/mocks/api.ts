import { vi } from 'vitest'

import type {
  Crop,
  CropCategory,
  MarketScope,
  RecommendResponse,
  RefreshResponse,
  RefreshStatusResponse,
  Region,
} from '../../../src/types'
import type {
  MarketsResponse,
  PriceSeriesResponse,
  RecommendResponseWithFallback,
} from '../../../src/lib/api'
import { MARKET_SCOPE_OPTIONS } from '../../../src/constants/marketScopes'

interface WeatherDaily {
  readonly date: string
  readonly tmax: number
  readonly tmin: number
  readonly rain: number
  readonly wind: number
}

interface WeatherPayload {
  readonly daily: WeatherDaily[]
  readonly fetchedAt: string
}

export interface WeatherApiResult {
  readonly weather: WeatherPayload
  readonly requestId: string
}

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
  ) => Promise<PriceSeriesResponse>
>()

export const fetchWeather = vi.fn<
  (lat: number, lon: number, options?: { readonly requestId?: string }) => Promise<WeatherApiResult>
>()

vi.mock('../../../src/lib/api', () => ({
  fetchRecommendations,
  fetchRecommend,
  fetchCrops,
  fetchMarkets,
  postRefresh,
  fetchRefreshStatus,
  fetchPrice,
  fetchWeather,
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
  fetchWeather.mockReset()
}

export const createRecommendResponse = (
  overrides: Partial<RecommendResponseWithFallback> = {},
): RecommendResponseWithFallback => ({
  week: overrides.week ?? '2024-W30',
  region: overrides.region ?? 'temperate',
  items: overrides.items ?? [],
  isMarketFallback: overrides.isMarketFallback ?? false,
})

export interface RecommendationCallSnapshot {
  readonly region: Region
  readonly week: string | undefined
  readonly marketScope: MarketScope
  readonly category: CropCategory
}

export const getRecommendationCallSnapshots = (): RecommendationCallSnapshot[] =>
  fetchRecommendations.mock.calls.map(([region, week, options]) => ({
    region,
    week,
    marketScope: options.marketScope,
    category: options.category,
  }))

export const queueRecommendationResponses = (
  ...responses: ReadonlyArray<Partial<RecommendResponseWithFallback>>
) => {
  responses.forEach((response) => {
    fetchRecommendations.mockImplementationOnce(async () =>
      createRecommendResponse(response),
    )
  })
}
