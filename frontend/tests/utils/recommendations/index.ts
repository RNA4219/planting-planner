import { vi, type MockInstance } from 'vitest'

import type { CropCategory, MarketScope, RecommendResponse, Region } from '../../../src/types'
import type { RecommendResponseWithFallback } from '../../../src/lib/api'
import type { RecommendationFetchResult } from '../../../src/hooks/recommendationFetcher'

import { normalizeRecommendationResponse } from '../../../src/utils/recommendations'

import { fetchRecommend, fetchRecommendations, resetAppSpies } from '../renderApp'

type UseRecommendationsModule = typeof import('../../../src/hooks/useRecommendations')
export type RecommendationItem = RecommendResponse['items'][number]

const fetcherMock = vi.fn<
  (input: {
    region: Region
    week: string
    preferLegacy?: boolean
    marketScope: MarketScope
    category: CropCategory
  }) => Promise<RecommendationFetchResult>
>()
const cropCatalogState = { catalog: new Map(), isLoading: false }

const CATEGORY_DISPLAY_MAP: Record<CropCategory, string> = {
  leaf: '葉菜類',
  root: '根菜類',
  flower: '花き',
}

vi.mock('../../../src/hooks/recommendationFetcher', () => ({
  useRecommendationFetcher: () => fetcherMock,
}))

vi.mock('../../../src/hooks/useCropCatalog', () => ({
  useCropCatalog: () => cropCatalogState,
}))

export const recommendationControllerMocks = {
  fetcherMock,
  cropCatalogState,
}

export const defaultCrops = [
  { id: 1, name: '春菊', category: 'leaf' },
  { id: 2, name: 'にんじん', category: 'root' },
  { id: 3, name: 'キャベツ', category: 'leaf' },
  { id: 4, name: 'トルコギキョウ', category: 'flower' },
] as const

const applyDefaultRecommendationMocks = () => {
  fetcherMock.mockImplementation(
    async ({
      region,
      week,
      preferLegacy,
      marketScope,
      category,
    }: {
      region: Region
      week: string
      preferLegacy?: boolean
      marketScope: MarketScope
      category: CropCategory
    }) => {
      const callModern = async () => {
        try {
          const response = await fetchRecommendations(region, week, { marketScope, category })
          const { isMarketFallback, ...rest } = response
          return { response: rest, source: 'modern' as const, isMarketFallback }
        } catch {
          return undefined
        }
      }
      const callLegacy = async () => {
        try {
          const response = await fetchRecommend({ region, week })
          return { response, source: 'legacy' as const, isMarketFallback: false }
        } catch {
          return undefined
        }
      }
      const primary = preferLegacy ? callLegacy : callModern
      const secondary = preferLegacy ? callModern : callLegacy
      const result = (await primary()) ?? (await secondary())
      if (!result) {
        return { result: null, isMarketFallback: false }
      }
      return {
        result: normalizeRecommendationResponse(result.response, week, result.source),
        isMarketFallback: result.isMarketFallback,
      }
    },
  )
  cropCatalogState.catalog = new Map(
    defaultCrops.map((crop) => [
      crop.name,
      {
        id: crop.id,
        name: crop.name,
        category: crop.category,
        displayCategory: CATEGORY_DISPLAY_MAP[crop.category],
      },
    ]),
  )
  cropCatalogState.isLoading = false
}

applyDefaultRecommendationMocks()

export const toFullWidthAscii = (value: string): string =>
  value.replace(/[!-~]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0xfee0))

export const createRecommendResponse = (
  overrides: Partial<RecommendResponseWithFallback> = {},
): RecommendResponseWithFallback => ({
  week: '2024-W30',
  region: 'temperate',
  items: [],
  isMarketFallback: false,
  ...overrides,
})

export const createItem = (
  overrides: Partial<RecommendationItem> & { crop: string },
): RecommendationItem => ({
  crop: overrides.crop,
  sowing_week: '2024-W30',
  harvest_week: '2024-W35',
  source: 'local-db',
  growth_days: 42,
  ...overrides,
})

interface SetupRecommendationsTestResult {
  useRecommendationsModule: UseRecommendationsModule
  useRecommendationsSpy: MockInstance
}

export const setupRecommendationsTest = async (): Promise<SetupRecommendationsTestResult> => {
  resetAppSpies()
  applyDefaultRecommendationMocks()
  fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
  const useRecommendationsModule: UseRecommendationsModule = await import(
    '../../../src/hooks/useRecommendations'
  )
  const useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
  return { useRecommendationsModule, useRecommendationsSpy }
}

export const resetRecommendationControllerMocks = (): void => {
  recommendationControllerMocks.fetcherMock.mockReset()
  applyDefaultRecommendationMocks()
}
