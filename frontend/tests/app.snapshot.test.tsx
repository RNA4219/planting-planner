import { cleanup, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import {
  fetchCrops,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
} from './utils/renderApp'

describe('App snapshot', () => {
  beforeEach(() => {
    resetAppSpies()
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
    cleanup()
    resetAppSpies()
  })

  test('初期表示をスナップショット保存する', async () => {
    await renderApp()
    await waitFor(() => {
      const rows = document.querySelectorAll('.recommend__row')
      expect(rows.length).toBeGreaterThan(0)
    })

    const container = document.body.firstElementChild
    expect(container).not.toBeNull()
    expect(container).toMatchSnapshot()
  })
})
