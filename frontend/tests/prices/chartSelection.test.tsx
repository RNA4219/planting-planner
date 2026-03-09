import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { createInteractionsHarness } from '../utils/interactionsHarness'

const harness = createInteractionsHarness()
const { fetchRecommend, fetchCrops, fetchRecommendations, fetchPrice, renderApp } = harness

describe('Price chart interactions', () => {
  test('価格チャート用の行選択で fetchPrice が呼び出される', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'トマト', category: 'flower' },
      { id: 2, name: 'レタス', category: 'leaf' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: ' トマト　',
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
      isMarketFallback: true,
    })

    const { user } = await renderApp()

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const targetRow = rows.find((row) => within(row).queryByText(/トマト/))
    expect(targetRow).toBeDefined()

    await user.click(targetRow as HTMLTableRowElement)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledTimes(1)
    })
    expect(fetchPrice).toHaveBeenLastCalledWith(1, undefined, undefined, 'national')

    const warnings = await screen.findAllByText(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )
    const chartWarning = warnings.find((element) => element.getAttribute('role') === 'alert')
    expect(chartWarning).toBeDefined()
  })

  test('主要野菜プルダウンからの選択でも fetchPrice が呼び出される', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'トマト', category: 'flower' },
      { id: 2, name: 'レタス', category: 'leaf' },
      { id: 3, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    })
    fetchPrice.mockResolvedValue({
      series: {
        crop_id: 2,
        crop: 'レタス',
        unit: 'kg',
        source: 'テストデータ',
        prices: [],
      },
      isMarketFallback: false,
    })

    const { user } = await renderApp()

    const featuredSelect = await screen.findByRole('combobox', { name: '主要野菜' })
    await user.selectOptions(featuredSelect, '2')

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledTimes(1)
    })
    expect(fetchPrice).toHaveBeenLastCalledWith(2, undefined, undefined, 'national')
  })
})
