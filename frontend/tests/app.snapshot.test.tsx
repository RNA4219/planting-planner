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

describe('App snapshot', () => {
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
        category: '果菜類',
      },
      {
        id: 2,
        name: 'レタス',
        category: '葉菜類',
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
    })
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
    resetAppSpies()
  })

  test('初期表示をスナップショット保存する', async () => {
    await renderApp()
    await waitFor(() => {
      expect(screen.getByRole('row', { name: /トマト/ })).toBeInTheDocument()
    })

    const container = document.body.firstElementChild
    expect(container).not.toBeNull()
    expect(container).toMatchSnapshot()
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })
})
