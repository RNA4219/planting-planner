import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  fetchPrice,
  fetchRefreshStatus,
  renderApp,
  resetAppSpies,
  saveFavorites,
  saveRegion,
  storageState,
} from '../tests/utils/renderApp'
import { vi } from 'vitest'
import type { MockInstance } from 'vitest'

type UseRecommendationsModule = typeof import('./hooks/useRecommendations')

export {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  fetchPrice,
  fetchRefreshStatus,
  renderApp,
  resetAppSpies,
  saveFavorites,
  saveRegion,
  storageState,
}

let cachedUseRecommendationsModule: UseRecommendationsModule | null = null

async function loadUseRecommendationsModule(): Promise<UseRecommendationsModule> {
  if (!cachedUseRecommendationsModule) {
    cachedUseRecommendationsModule = await import('./hooks/useRecommendations')
  }
  return cachedUseRecommendationsModule
}

export type UseRecommendationsSpy = MockInstance

export async function createUseRecommendationsSpy(): Promise<{
  spy: UseRecommendationsSpy
  restore: () => void
}> {
  const module = await loadUseRecommendationsModule()
  const spy = vi.spyOn(module, 'useRecommendations')
  return {
    spy,
    restore: () => {
      spy.mockRestore()
    },
  }
}

export const cropsFixture = [
  { id: 1, name: '春菊', category: 'leaf' },
  { id: 2, name: 'にんじん', category: 'root' },
  { id: 3, name: 'キャベツ', category: 'leaf' },
] as const

export const defaultRecommendation = {
  week: '2024-W30',
  region: 'temperate',
} as const

export const legacyItem = {
  crop: '春菊',
  harvest_week: '2024-W35',
  sowing_week: '2024-W30',
  source: 'legacy',
  growth_days: 42,
} as const

export const localItem = {
  crop: 'にんじん',
  harvest_week: '2024-W39',
  sowing_week: '2024-W30',
  source: 'local-db',
  growth_days: 65,
} as const

export function resetAppTestState() {
  resetAppSpies()
  storageState.region = 'temperate'
  storageState.favorites = []
  fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
}
