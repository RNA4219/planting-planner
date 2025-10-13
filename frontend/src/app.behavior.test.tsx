import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'

type UseRecommendationsModule = typeof import('./hooks/recommendations/controller')

import {
  fetchCrops,
  fetchPrice,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
} from '../tests/utils/renderApp'

describe('App behavior', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    useRecommendationsModule = await import('./hooks/recommendations/controller')
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
      isMarketFallback: false,
    })

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })

  it('市場切替後の作物選択で価格APIが市場スコープを受け取る', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'トマト', category: 'flower' },
      { id: 2, name: 'レタス', category: 'leaf' },
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
      ],
      isMarketFallback: false,
    })
    fetchPrice.mockResolvedValue({
      series: {
        crop_id: 1,
        crop: 'トマト',
        unit: 'kg',
        source: 'テストデータ',
        prices: [],
      },
      isMarketFallback: false,
    })

    const { user } = await renderApp()

    const marketSelect = await screen.findByLabelText('市場')
    await user.selectOptions(marketSelect, 'city:tokyo')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const targetRow = rows.find((row) => within(row).queryByText('トマト'))
    expect(targetRow).toBeDefined()
    await user.click(targetRow as HTMLTableRowElement)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenLastCalledWith(1, undefined, undefined, 'city:tokyo')
    })
  })

  it('市場データのフォールバック時に警告メッセージを常時表示する', async () => {
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: true,
    })

    await renderApp()

    const notice = await screen.findByTestId('market-fallback-notice')
    expect(notice).toBeVisible()
    expect(notice).toHaveTextContent(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )
  })
})
