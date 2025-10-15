import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance } from 'vitest'

import {
  fetchCrops,
  fetchRecommendations,
  renderApp,
  saveRegion,
} from '../utils/renderApp'
import {
  createItem,
  createRecommendResponse,
  defaultCrops,
  setupRecommendationsTest,
} from '../utils/recommendations'

describe('App recommendations / 地域変更と競合制御', () => {
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    ;({ useRecommendationsSpy } = await setupRecommendationsTest())
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
  })

  it('地域選択と週入力でAPIが手動フェッチされる', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week, options) => {
      void week
      void options
      return createRecommendResponse({
        region,
        items: [
          createItem({
            crop: region === 'temperate' ? '春菊' : 'にんじん',
          }),
        ],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()

    const select = screen.getByLabelText('地域')
    const weekInput = screen.getByLabelText('週')
    await user.selectOptions(select, '寒冷地')
    await user.clear(weekInput)
    await user.type(weekInput, '2024-W32')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'cold',
        '2024-W32',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
    expect(saveRegion).toHaveBeenLastCalledWith('cold')
    expect(screen.getByText('にんじん')).toBeInTheDocument()
  })

  it('地域変更で即時フェッチされテーブルが更新される', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week, options) => {
      void week
      void options
      return createRecommendResponse({
        region,
        items: [
          createItem({
            crop: region === 'temperate' ? '春菊' : 'にんじん',
          }),
        ],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(
        1,
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })

    expect(screen.getByText('春菊')).toBeInTheDocument()

    const select = screen.getByLabelText('地域')
    await user.selectOptions(select, '寒冷地')

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(
        2,
        'cold',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const coldRow = rows.find((row) => within(row).queryByText('にんじん'))
    expect(coldRow).toBeDefined()
    expect(within(rows[0]!).queryByText('春菊')).not.toBeInTheDocument()
  })
})
