import { vi, type MockInstance } from 'vitest'

import type { RecommendResponse } from '../../src/types'

import { fetchRecommend, resetAppSpies } from './renderApp'

type UseRecommendationsModule = typeof import('../../src/hooks/useRecommendations')
export type RecommendationItem = RecommendResponse['items'][number]

export const defaultCrops = [
  { id: 1, name: '春菊', category: 'leaf' },
  { id: 2, name: 'にんじん', category: 'root' },
  { id: 3, name: 'キャベツ', category: 'leaf' },
  { id: 4, name: 'コスモス', category: 'flower' },
] as const

export const createRecommendResponse = (
  overrides: Partial<RecommendResponse> = {},
): RecommendResponse => ({
  week: '2024-W30',
  region: 'temperate',
  items: [],
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
  fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
  const useRecommendationsModule: UseRecommendationsModule = await import(
    '../../src/hooks/useRecommendations'
  )
  const useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
  return { useRecommendationsModule, useRecommendationsSpy }
}

interface SearchFilterFixtures {
  crops: { id: number; name: string; category: string }[]
  items: RecommendationItem[]
  favorites: number[]
  queries: {
    name: string
    category: string
    nfkc: string
    caseInsensitive: string
    favoriteCategory: string
  }
  expected: {
    favoriteOrder: string[]
  }
}

export const createSearchFilterFixtures = (): SearchFilterFixtures => {
  const crops = [
    { id: 1, name: '春菊', category: 'leaf' },
    { id: 2, name: 'にんじん', category: 'root' },
    { id: 3, name: 'キャベツ', category: 'leaf' },
    { id: 4, name: 'コスモス', category: 'flower' },
    { id: 5, name: 'Basil', category: 'herb' },
    { id: 6, name: 'ミツバ', category: 'leaf' },
  ]

  const items = [
    createItem({ crop: '春菊', sowing_week: '2024-W19', harvest_week: '2024-W30', source: 'leaf-db' }),
    createItem({ crop: 'にんじん', sowing_week: '2024-W22', harvest_week: '2024-W40', source: 'root-db' }),
    createItem({ crop: 'キャベツ', sowing_week: '2024-W21', harvest_week: '2024-W35', source: 'leaf-db' }),
    createItem({ crop: 'コスモス', sowing_week: '2024-W24', harvest_week: '2024-W36', source: 'flower-db' }),
    createItem({ crop: 'Basil', sowing_week: '2024-W23', harvest_week: '2024-W33', source: 'herb-db' }),
    createItem({ crop: 'ミツバ', sowing_week: '2024-W18', harvest_week: '2024-W26', source: 'leaf-db' }),
  ]

  return {
    crops,
    items,
    favorites: [6],
    queries: {
      name: '春菊',
      category: 'flower',
      nfkc: 'ﾐﾂﾊﾞ',
      caseInsensitive: 'bASIL',
      favoriteCategory: 'leaf',
    },
    expected: {
      favoriteOrder: ['ミツバ', '春菊', 'キャベツ'],
    },
  }
}
