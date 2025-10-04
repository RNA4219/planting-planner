import { afterEach, beforeEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'

import { createAppTestHarness } from './renderApp'

type UseRecommendationsModule = typeof import('../../src/hooks/useRecommendations')
type AppHarness = ReturnType<typeof createAppTestHarness>

interface InteractionsHarness {
  readonly renderApp: AppHarness['setup']
  readonly fetchRecommendations: AppHarness['fetchRecommendations']
  readonly fetchRecommend: AppHarness['fetchRecommend']
  readonly fetchCrops: AppHarness['fetchCrops']
  readonly fetchPrice: AppHarness['fetchPrice']
  readonly useRecommendationsSpy: MockInstance
}

export const createInteractionsHarness = (): InteractionsHarness => {
  const appHarness = createAppTestHarness()
  let module: UseRecommendationsModule | undefined
  let spy: MockInstance | undefined

  beforeEach(async () => {
    module = await import('../../src/hooks/useRecommendations')
    spy = vi.spyOn(module, 'useRecommendations')
  })

  afterEach(() => {
    spy?.mockRestore()
  })

  const ensureSpy = () => {
    if (!spy) {
      throw new Error('useRecommendationsSpy is not initialized yet')
    }
    return spy
  }

  return {
    renderApp: appHarness.setup,
    fetchRecommendations: appHarness.fetchRecommendations,
    fetchRecommend: appHarness.fetchRecommend,
    fetchCrops: appHarness.fetchCrops,
    fetchPrice: appHarness.fetchPrice,
    get useRecommendationsSpy() {
      return ensureSpy()
    },
  }
}
