import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import type { RecommendResponseWithFallback } from '../src/lib/api'
import {
  fetchRecommend,
  fetchRecommendations,
  fetchCrops,
  renderApp,
  resetAppSpies,
} from './utils/renderApp'

const createFallbackResponse = (): RecommendResponseWithFallback => ({
  week: '2024-W30',
  region: 'temperate',
  items: [],
  isMarketFallback: true,
})

describe('App behavior', () => {
  beforeEach(() => {
    resetAppSpies()
    fetchCrops.mockResolvedValue([])
  })

  afterEach(() => {
    resetAppSpies()
  })

  test('市場APIがフォールバックモードの場合に警告トーストを表示する', async () => {
    fetchRecommendations.mockResolvedValue(createFallbackResponse())
    fetchRecommend.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()

    const warningToast = await screen.findByText(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )
    expect(warningToast).toBeInTheDocument()
  })
})
