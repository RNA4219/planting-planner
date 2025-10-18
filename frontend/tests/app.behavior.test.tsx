import '@testing-library/jest-dom/vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import type { RecommendResponseWithFallback } from '../src/lib/api'
import {
  fetchRecommend,
  fetchRecommendations,
  fetchCrops,
  renderApp,
  resetAppSpies,
} from './utils/renderApp'
import { queueRecommendationResponses } from './utils/mocks/api'

const createFallbackResponse = (): RecommendResponseWithFallback => ({
  week: '2024-W30',
  region: 'temperate',
  items: [],
  isMarketFallback: true,
})

describe('App behavior', () => {
  beforeEach(() => {
    resetAppSpies()
    fetchCrops.mockResolvedValue([])
  })

  afterEach(() => {
    resetAppSpies()
  })

  test('市場APIがフォールバックモードの場合に警告トーストを表示する', async () => {
    fetchRecommendations.mockResolvedValue(createFallbackResponse())
    fetchRecommend.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    const { user } = await renderApp()

    const [toastStack] = await screen.findAllByTestId('toast-stack')
    const warningToast = within(toastStack).getByText(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )

    expect(warningToast).toBeInTheDocument()
  })

  test('推奨データ取得時に直前のキャッシュを復元できる', async () => {
    queueRecommendationResponses({
      items: [
        {
          crop: 'ホウレンソウ',
          sowing_week: '2024-W30',
          harvest_week: '2024-W34',
          source: 'modern',
          growth_days: 30,
        },
      ],
    })
    fetchRecommendations.mockRejectedValueOnce(new Error('network failure'))

    const { user } = await renderApp()

    const initialCard = await screen.findByText('ホウレンソウ')
    expect(initialCard).toBeInTheDocument()

    const [submitButton] = screen.getAllByRole('button', { name: 'この条件で見る' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalledTimes(2)
    })

    expect(screen.getByText('ホウレンソウ')).toBeInTheDocument()

    const toastStacks = await screen.findAllByTestId('toast-stack')
    await waitFor(() => {
      toastStacks.forEach((stack) => {
        expect(within(stack).queryByText(/取得不可/)).toBeNull()
      })
    })
  })

  test('推奨データの取得に失敗しキャッシュがない場合は取得不可トーストを表示する', async () => {
    fetchRecommendations.mockRejectedValue(new Error('network failure'))

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalled()
    })

    const toastStacks = await screen.findAllByTestId('toast-stack')
    await waitFor(() => {
      const found = toastStacks.some((stack) => within(stack).queryByText(/取得不可/))
      expect(found).toBe(true)
    })
  })
})
