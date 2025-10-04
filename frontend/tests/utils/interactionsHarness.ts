import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'

import {
  fetchCrops,
  fetchPrice,
  fetchRecommend,
  fetchRecommendations,
  renderApp as baseRenderApp,
  resetAppSpies,
} from './renderApp'

type UseRecommendationsModule = typeof import('../../src/hooks/useRecommendations')

interface InteractionsHarness {
  readonly renderApp: typeof baseRenderApp
  readonly fetchRecommendations: typeof fetchRecommendations
  readonly fetchRecommend: typeof fetchRecommend
  readonly fetchCrops: typeof fetchCrops
  readonly fetchPrice: typeof fetchPrice
  readonly useRecommendationsSpy: MockInstance
}

export const createInteractionsHarness = (): InteractionsHarness => {
  let module: UseRecommendationsModule | undefined
  let spy: MockInstance | undefined

  beforeEach(async () => {
    resetAppSpies()
    module = await import('../../src/hooks/useRecommendations')
    spy = vi.spyOn(module, 'useRecommendations')
  })

  afterEach(() => {
    spy?.mockRestore()
    cleanup()
    resetAppSpies()
  })

  const ensureSpy = () => {
    if (!spy) {
      throw new Error('useRecommendationsSpy is not initialized yet')
    }
    return spy
  }

  return {
    renderApp: baseRenderApp,
    fetchRecommendations,
    fetchRecommend,
    fetchCrops,
    fetchPrice,
    get useRecommendationsSpy() {
      return ensureSpy()
    },
  }
}
