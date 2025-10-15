import '@testing-library/jest-dom/vitest'
import { focusManager } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
} from './utils/renderApp'

describe('App window focus behavior', () => {
  beforeEach(() => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    })
  })

  afterEach(() => {
    resetAppSpies()
  })

  it('再フォーカス時に fetchRecommendations を再度呼び出さない', async () => {
    await renderApp()

    const initialCalls = fetchRecommendations.mock.calls.length
    expect(initialCalls).toBeGreaterThanOrEqual(1)

    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchRecommendations).toHaveBeenCalledTimes(initialCalls)
  })
})
