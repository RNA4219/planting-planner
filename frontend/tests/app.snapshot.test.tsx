import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MockInstance } from 'vitest'

type UseRecommendationsModule = typeof import('../src/hooks/useRecommendations')

import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
} from './utils/renderApp'

describe('App tailwind theme', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    useRecommendationsModule = await import('../src/hooks/useRecommendations')
    useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
    fetchCrops.mockResolvedValue([
      {
        id: 1,
        name: 'トマト',
        category: 'flower',
      },
      {
        id: 2,
        name: 'レタス',
        category: 'leaf',
      },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: 'トマト',
          sowing_week: '2024-W28',
          harvest_week: '2024-W35',
          source: 'テストデータ',
          growth_days: 70,
        },
        {
          crop: 'レタス',
          sowing_week: '2024-W29',
          harvest_week: '2024-W32',
          source: 'テストデータ',
          growth_days: 45,
        },
      ],
      isMarketFallback: false,
    })
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
    resetAppSpies()
  })

  test('ヘッダーとメインコンテナが market カラーのユーティリティクラスを持つ', async () => {
    await renderApp()
    await waitFor(() => {
      expect(screen.getByRole('row', { name: /トマト/ })).toBeInTheDocument()
    })

    expect(useRecommendationsSpy).toHaveBeenCalled()

    const header = screen.getByRole('banner')
    const main = screen.getByRole('main')

    expect(header).toHaveClass('bg-market-neutral-container')
    expect(header).toHaveClass('text-market-neutral-strong')
    expect(main).toHaveClass('bg-market-neutral/5')
  })

  test('マーケットフォールバック通知が market カラーの警告スタイルを使う', async () => {
    fetchRecommendations.mockResolvedValueOnce({
      week: '2024-W31',
      region: 'temperate',
      items: [],
      isMarketFallback: true,
    })

    await renderApp()

    const notice = await screen.findByTestId('market-fallback-notice')
    expect(notice).toHaveClass('border-market-warning')
    expect(notice).toHaveClass('bg-market-warning/10')
    expect(notice).toHaveClass('text-market-warning')
  })
})
