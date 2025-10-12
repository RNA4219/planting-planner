/**
 * エントリポイントのスモークテストのみを保持します。
 * 詳細なインタラクションケースは ./forms, ./regions, ./favorites, ./prices 以下に配置してください。
 */
import { screen } from '@testing-library/react'
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

  test.skip('市場トグルの初期スコープを伝搬する', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()

    await screen.findByLabelText('市場スコープ')
    expect(fetchRecommendations).toHaveBeenCalledWith('temperate', '2024-W30', 'domestic')
  })

  test.skip('カテゴリフィルタで表データを絞り込む', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        { cropId: 1, crop: 'ほうれん草', category: '葉菜類' },
        { cropId: 2, crop: 'トマト', category: '果菜類' },
      ],
    })

    await renderApp()

    const categoryTab = await screen.findByRole('tab', { name: '葉菜類' })
    categoryTab.click()

    await screen.findByRole('row', { name: /ほうれん草/ })
    expect(screen.queryByRole('row', { name: /トマト/ })).toBeNull()
  })

  test.skip('市場価格フォールバックで都市欠損を通知する', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()

    await screen.findByText('都市データが不足しているため最新価格を表示します')
  })
})
