import '@testing-library/jest-dom/vitest'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
} from '../tests/utils/renderApp'

describe('App smoke behavior', () => {
  beforeEach(() => {
    resetAppSpies()
    fetchCrops.mockResolvedValue([{ id: 1, name: '春菊', category: 'leaf' }])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    })
    fetchRecommend.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })
  })

  afterEach(() => {
    cleanup()
    resetAppSpies()
  })

  it('初期描画が成立する', async () => {
    await renderApp()
    expect(await screen.findByRole('heading', { name: 'Planting Planner' })).toBeInTheDocument()
  })
})
