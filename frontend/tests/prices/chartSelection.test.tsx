import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { createInteractionsHarness } from '../utils/interactionsHarness'

const harness = createInteractionsHarness()
const { fetchRecommend, fetchCrops, fetchRecommendations, fetchPrice, renderApp } = harness

describe('Price chart interactions', () => {
  test('価格チャート用の行選択で fetchPrice が呼び出される', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'トマト', category: '果菜類' },
      { id: 2, name: 'レタス', category: '葉菜類' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        { crop: 'トマト', sowing_week: '2024-W28', harvest_week: '2024-W35', source: 'テストデータ', growth_days: 70 },
      ],
    })
    fetchPrice.mockResolvedValue({
      crop_id: 1,
      crop: 'トマト',
      unit: 'kg',
      source: 'テストデータ',
      prices: [],
    })

    const { user } = await renderApp()

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const targetRow = rows.find((row) => within(row).queryByText('トマト'))
    expect(targetRow).toBeDefined()

    await user.click(targetRow as HTMLTableRowElement)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledTimes(1)
      // @ts-expect-error market scope support will be implemented in fetchPrice
      expect(fetchPrice).toHaveBeenLastCalledWith(1, undefined, undefined, 'national')
    })
  })

  test('市場トグルの選択が価格取得時のスコープに反映される', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([{ id: 1, name: 'トマト', category: '果菜類' }])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        { crop: 'トマト', sowing_week: '2024-W28', harvest_week: '2024-W35', source: 'テストデータ', growth_days: 70 },
      ],
    })
    fetchPrice.mockResolvedValue({ crop_id: 1, crop: 'トマト', unit: 'kg', source: 'テストデータ', prices: [] })

    const { user } = await renderApp()

    const marketGroup = await screen.findByRole('group', { name: '市場スコープ' })
    const localToggle = within(marketGroup).getByRole('button', { name: '地域市場' })

    await user.click(localToggle)

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const targetRow = rows.find((row) => within(row).queryByText('トマト'))
    expect(targetRow).toBeDefined()

    await user.click(targetRow as HTMLTableRowElement)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledTimes(1)
      // @ts-expect-error market scope support will be implemented in fetchPrice
      expect(fetchPrice).toHaveBeenLastCalledWith(1, undefined, undefined, 'local')
    })
  })
})
