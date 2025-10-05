import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchCrops,
  fetchRecommend,
  fetchPrice,
  fetchRefreshStatus,
  fetchRecommendations,
  postRefresh,
  renderApp,
  resetAppSpies,
} from '../tests/utils/renderApp'

describe('App refresh', () => {
  beforeEach(() => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('更新ボタンでポーリングが始まりトーストで結果を表示する', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'local-db',
          growth_days: 35,
        },
      ],
    })

    await renderApp()
    vi.useFakeTimers()

    const refreshButton = screen.getByRole('button', { name: '更新' })
    const main = screen.getByRole('main')

    postRefresh.mockResolvedValue({ state: 'running' })
    fetchRefreshStatus
      .mockResolvedValueOnce({
        state: 'running',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: null,
        updated_records: 0,
        last_error: null,
      })
      .mockResolvedValueOnce({
        state: 'success',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T00:00:10Z',
        updated_records: 3,
        last_error: null,
      })
      .mockResolvedValueOnce({
        state: 'failure',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T00:00:05Z',
        updated_records: 0,
        last_error: 'network',
      })

    fireEvent.click(refreshButton)
    expect(refreshButton).toBeDisabled()

    await Promise.resolve()
    expect(fetchRefreshStatus).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2000)
    await Promise.resolve()
    expect(fetchRefreshStatus).toHaveBeenCalledTimes(2)

    const successToasts = within(main).getAllByRole('alert')
    expect(
      successToasts.some(
        (toast) =>
          toast.textContent?.includes('データ更新が完了しました') && toast.textContent?.includes('更新件数: 3'),
      ),
    ).toBe(true)
    expect(refreshButton).not.toBeDisabled()

    await vi.advanceTimersByTimeAsync(5000)
    await Promise.resolve()
    expect(within(main).queryByText(/更新件数: 3/)).not.toBeInTheDocument()

    fireEvent.click(refreshButton)
    expect(refreshButton).toBeDisabled()

    await Promise.resolve()
    expect(fetchRefreshStatus).toHaveBeenCalledTimes(3)

    await Promise.resolve()
    await Promise.resolve()
    const failureToasts = within(main).getAllByRole('alert')
    expect(
      failureToasts.some(
        (toast) =>
          toast.textContent?.includes('データ更新に失敗しました') && toast.textContent?.includes('network'),
      ),
    ).toBe(true)
    expect(refreshButton).not.toBeDisabled()
  })

  it('更新成功時に推薦と価格データを再取得する', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'local-db',
          growth_days: 35,
        },
      ],
    })
    fetchPrice.mockResolvedValue({
      crop_id: 1,
      crop: '春菊',
      unit: 'kg',
      source: 'local-db',
      prices: [],
    })

    await renderApp()

    const refreshButton = screen.getByRole('button', { name: '更新' })
    const main = screen.getByRole('main')
    const recommendationRow = await screen.findByRole('row', { name: /春菊/ })
    fireEvent.click(recommendationRow)
    expect(fetchPrice).toHaveBeenCalledTimes(1)

    vi.useFakeTimers()

    postRefresh.mockResolvedValue({ state: 'running' })
    fetchRefreshStatus
      .mockResolvedValueOnce({
        state: 'running',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: null,
        updated_records: 0,
        last_error: null,
      })
      .mockResolvedValueOnce({
        state: 'success',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T00:00:10Z',
        updated_records: 5,
        last_error: null,
      })

    fireEvent.click(refreshButton)

    await Promise.resolve()
    expect(postRefresh).toHaveBeenCalledTimes(1)
    expect(fetchRefreshStatus).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    await Promise.resolve()
    expect(fetchRefreshStatus).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
    await Promise.resolve()

    await waitFor(() => {
      const totalCalls = fetchRecommendations.mock.calls.length + fetchRecommend.mock.calls.length
      expect(totalCalls).toBeGreaterThanOrEqual(2)
    })

    const toasts = within(main).getAllByRole('alert')
    expect(
      toasts.some(
        (toast) =>
          toast.textContent?.includes('データ更新が完了しました') && toast.textContent?.includes('更新件数: 5'),
      ),
    ).toBe(true)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledTimes(2)
    })
  })
})
