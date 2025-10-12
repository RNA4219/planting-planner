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
import type { RecommendResponseWithFallback } from '../../../src/lib/api'

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
  postRefresh,
  fetchRefreshStatus,
  fetchPrice,
}))

export const resetApiMocks = () => {
  fetchRecommendations.mockReset()
  fetchRecommend.mockReset()
  fetchCrops.mockReset()
  postRefresh.mockReset()
  fetchRefreshStatus.mockReset()
  fetchPrice.mockReset()
}
