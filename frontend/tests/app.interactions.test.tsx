/**
 * エントリポイントのスモークテストのみを保持します。
 * 詳細なインタラクションケースは ./forms, ./regions, ./favorites, ./prices 以下に配置してください。
 */
import { screen, within, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { createInteractionsHarness } from './utils/interactionsHarness'

const harness = createInteractionsHarness()
const { renderApp, fetchRecommend, fetchRecommendations, fetchCrops } = harness

describe('App interactions smoke', () => {
  test('初期レンダリングで推奨データを要求する', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()

    await screen.findByLabelText('地域')
    expect(fetchRecommendations).toHaveBeenCalledWith('temperate', '2024-W30')
  })

  test('カテゴリタブで選択したカテゴリのみを表示する', async () => {
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
        { crop: 'レタス', sowing_week: '2024-W27', harvest_week: '2024-W32', source: 'テストデータ', growth_days: 55 },
      ],
    })

    const { user } = await renderApp()

    const tablist = await screen.findByRole('tablist', { name: 'カテゴリ' })
    const leafTab = within(tablist).getByRole('tab', { name: '葉菜類' })

    await user.click(leafTab)

    const table = await screen.findByRole('table')
    await waitFor(() => {
      const rows = within(table).getAllByRole('row').slice(1)
      expect(rows).toHaveLength(1)
      expect(within(rows[0]).getByText('レタス')).toBeVisible()
      expect(within(rows[0]).queryByText('トマト')).not.toBeInTheDocument()
    })
  })

  test('都市情報が欠損している場合は全国市場へのフォールバックを通知する', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([{ id: 1, name: 'トマト', category: '果菜類' }])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        { crop: 'トマト', sowing_week: '2024-W28', harvest_week: '2024-W35', source: 'テストデータ', growth_days: 70 },
      ],
    })

    const { user, waitForToastToDisappear } = await renderApp({ useFakeTimers: true })

    const marketGroup = await screen.findByRole('group', { name: '市場スコープ' })
    const localToggle = within(marketGroup).getByRole('button', { name: '地域市場' })

    await user.click(localToggle)

    const toastMessage = '地域市場データが見つからないため全国市場を表示しています'
    const toast = await screen.findByText(toastMessage)
    expect(toast).toBeVisible()

    await waitForToastToDisappear(() => screen.queryByText(toastMessage))
  })
})
