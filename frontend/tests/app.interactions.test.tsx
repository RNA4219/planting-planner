import '@testing-library/jest-dom/vitest'
/**
 * エントリポイントのスモークテストのみを保持します。
 * 詳細なインタラクションケースは ./forms, ./regions, ./favorites, ./prices 以下に配置してください。
 */
import { screen, waitFor } from '@testing-library/react'
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
      isMarketFallback: false,
    })

    await renderApp()

    await screen.findByLabelText('地域')
    expect(fetchRecommendations).toHaveBeenCalledWith(
      'temperate',
      '2024-W30',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })

  test('市場スコープを都市に切り替えるとAPI引数が更新される', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    })

    const { user } = await renderApp()

    const marketSelect = await screen.findByLabelText('市場')
    await user.selectOptions(marketSelect, 'city:tokyo')

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'city:tokyo', category: 'leaf' }),
      )
    })
  })

  test('市場APIがフォールバックモードの場合に警告トーストを表示する', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: true,
    })

    await renderApp()

    const warningToast = await screen.findByText(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )
    const liveRegion = warningToast.closest('[aria-live]')
    expect(liveRegion).not.toBeNull()
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
  })
})
