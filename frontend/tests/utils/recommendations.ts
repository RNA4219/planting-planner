import { vi, type MockInstance } from 'vitest'

import type { RecommendResponse } from '../../src/types'

import { fetchRecommend, resetAppSpies } from './renderApp'

type UseRecommendationsModule = typeof import('../../src/hooks/useRecommendations')
export type RecommendationItem = RecommendResponse['items'][number]

export const defaultCrops = [
  { id: 1, name: '春菊', category: 'leaf' },
  { id: 2, name: 'にんじん', category: 'root' },
  { id: 3, name: 'キャベツ', category: 'leaf' },
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
