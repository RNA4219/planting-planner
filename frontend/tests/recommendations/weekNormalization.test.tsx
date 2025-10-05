import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance } from 'vitest'

import {
  fetchCrops,
  fetchRecommendations,
  renderApp,
} from '../utils/renderApp'
import {
  createItem,
  createRecommendResponse,
  defaultCrops,
  setupRecommendationsTest,
} from '../utils/recommendations'

describe('App recommendations / 週入力正規化', () => {
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    ;({ useRecommendationsSpy } = await setupRecommendationsTest())
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
  })

  it('週番号が先に来る形式を 2024-W24 に整形して送信する', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week) => {
      const resolvedWeek = week ?? '2024-W30'
      return createRecommendResponse({
        week: resolvedWeek,
        region,
        items: [createItem({ crop: '春菊' })],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W30')
    })

    const weekInput = screen.getByLabelText('週')
    await user.clear(weekInput)
    await user.type(weekInput, 'W24-2024')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W24')
    })
  })

  it('英語表現が含まれる形式を 2024-W24 に整形して送信する', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week) => {
      const resolvedWeek = week ?? '2024-W30'
      return createRecommendResponse({
        week: resolvedWeek,
        region,
        items: [createItem({ crop: '春菊' })],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W30')
    })

    const weekInput = screen.getByLabelText('週')
    await user.clear(weekInput)
    await user.type(weekInput, 'Week 24 2024')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W24')
    })
  })

  it('和文日付を 2024-W27 に整形して送信する', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week) => {
      const resolvedWeek = week ?? '2024-W30'
      return createRecommendResponse({
        week: resolvedWeek,
        region,
        items: [createItem({ crop: '春菊' })],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W30')
    })

    const weekInput = screen.getByLabelText('週')
    await user.clear(weekInput)
    await user.type(weekInput, '2024年7月1日')
    expect(weekInput).toHaveValue('2024年7月1日')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W27')
    })
  })

  it('週番号が1桁の場合もゼロ埋めして送信する', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week) => {
      const resolvedWeek = week ?? '2024-W30'
      return createRecommendResponse({
        week: resolvedWeek,
        region,
        items: [createItem({ crop: '春菊' })],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W30')
    })

    const weekInput = screen.getByLabelText('週')
    await user.clear(weekInput)
    await user.type(weekInput, 'W6 2024')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W06')
    })
  })
})
