import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import type { FormEvent } from 'react'

import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
} from './utils/renderApp'

type UseRecommendationsModule = typeof import('../src/hooks/useRecommendations')

describe('App interactions', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    useRecommendationsModule = await import('../src/hooks/useRecommendations')
    useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
    resetAppSpies()
  })

  test('週入力の変更で setQueryWeek が呼び出される', async () => {
    const setQueryWeek = vi.fn()
    const handleSubmit = vi.fn<(event: FormEvent<HTMLFormElement>) => void>((event) => {
      event.preventDefault()
    })

    useRecommendationsSpy.mockReturnValue({
      region: 'temperate',
      setRegion: vi.fn(),
      queryWeek: '2024-W30',
      setQueryWeek,
      currentWeek: '2024-W30',
      displayWeek: '2024-W30',
      sortedRows: [],
      handleSubmit,
    })

    const App = (await import('../src/App')).default
    render(<App />)

    const weekInput = screen.getByLabelText('週') as HTMLInputElement
    fireEvent.change(weekInput, { target: { value: '2024-W31' } })

    expect(setQueryWeek).toHaveBeenLastCalledWith('2024-W31')
  })

  test('フォーム送信・行選択・お気に入り操作が想定通りに動作する', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'トマト', category: '果菜類' },
      { id: 2, name: 'レタス', category: '葉菜類' },
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
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W31')
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
