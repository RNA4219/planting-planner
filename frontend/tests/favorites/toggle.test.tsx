import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { createInteractionsHarness } from '../utils/interactionsHarness'

const harness = createInteractionsHarness()
const { fetchRecommend, fetchCrops, fetchRecommendations, renderApp } = harness

describe('Favorites interactions', () => {
  test('フォーム送信・行選択・お気に入り操作が想定通りに動作する', async () => {
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
      isMarketFallback: false,
    })

    const { user } = await renderApp()

    await screen.findByText('トマト')
    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalled()
    })

    fetchRecommendations.mockClear()

    const weekInput = screen.getByLabelText('週') as HTMLInputElement
    await user.clear(weekInput)
    await user.type(weekInput, '2024-W31')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W31',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })

    const tomatoCell = screen.getByText('トマト')
    const tomatoRow = tomatoCell.closest('tr')
    expect(tomatoRow).not.toBeNull()
    const selectedRow = tomatoRow as HTMLTableRowElement
    expect(selectedRow.classList.contains('recommend__row--selected')).toBe(false)
    await user.click(selectedRow)
    await waitFor(() => {
      expect(selectedRow.classList.contains('recommend__row--selected')).toBe(true)
    })

    const favButton = within(selectedRow).getByRole('button', {
      name: 'トマトをお気に入りに追加',
    })
    expect(favButton.getAttribute('aria-pressed')).toBe('false')
    await user.click(favButton)
    await waitFor(() => {
      expect(favButton.getAttribute('aria-pressed')).toBe('true')
    })
  })
})
