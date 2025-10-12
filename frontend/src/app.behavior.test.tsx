import '@testing-library/jest-dom/vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'

type UseRecommendationsModule = typeof import('./hooks/useRecommendations')

import { fetchCrops, fetchRecommendations, renderApp, resetAppSpies } from '../tests/utils/renderApp'

describe('App behavior', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    useRecommendationsModule = await import('./hooks/useRecommendations')
    useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
  })

  it('初期レンダーで現在の地域・週の推奨を取得する', async () => {
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalledWith(
        'temperate',
        '2024-W30',
        'domestic',
        'all',
      )
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })
})
