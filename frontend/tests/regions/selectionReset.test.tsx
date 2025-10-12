import '@testing-library/jest-dom/vitest'

import { screen, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { createInteractionsHarness } from '../utils/interactionsHarness'

const harness = createInteractionsHarness()
const { fetchCrops, fetchRecommendations, fetchPrice, renderApp } = harness

describe('Region switching resets crop selection', () => {
  test('地域切替で選択が解除され価格チャートが初期状態に戻る', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'トマト', category: '果菜類' },
      { id: 2, name: 'キュウリ', category: '果菜類' },
    ])

    fetchRecommendations.mockResolvedValueOnce({
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

    fetchRecommendations.mockResolvedValueOnce({
      week: '2024-W30',
      region: 'warm',
      items: [
        {
          crop: 'キュウリ',
          sowing_week: '2024-W27',
          harvest_week: '2024-W33',
          source: 'テストデータ',
          growth_days: 60,
        },
      ],
      isMarketFallback: false,
    })

    fetchPrice.mockResolvedValue({
      crop_id: 1,
      crop: 'トマト',
      unit: 'kg',
      source: 'テストデータ',
      prices: [],
    })

    const { user } = await renderApp()

    await screen.findByText('トマト')

    expect(screen.getByText('作物を選択すると価格推移が表示されます。')).toBeInTheDocument()

    const tomatoRow = screen.getByRole('row', { name: /トマト/ })
    await user.click(tomatoRow)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledWith(1, undefined, undefined)
    })

    await waitFor(() => {
      expect(screen.queryByText('作物を選択すると価格推移が表示されます。')).toBeNull()
    })

    const regionSelect = await screen.findByLabelText('地域')
    await user.selectOptions(regionSelect, 'warm')

    await screen.findByText('キュウリ')

    await waitFor(() => {
      expect(screen.getByText('作物を選択すると価格推移が表示されます。')).toBeInTheDocument()
    })

    expect(screen.queryAllByRole('row', { selected: true })).toHaveLength(0)
  })
})
