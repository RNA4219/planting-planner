import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchCrops,
  fetchRecommend,
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

    await Promise.resolve()
    const successMessage = within(main).getByText('データ更新が完了しました')
    const successToast = successMessage.closest('.toast') as HTMLElement | null
    expect(successToast).not.toBeNull()
    const successToastEl = successToast as HTMLElement
    expect(successToastEl).toHaveClass('toast--success')
    expect(successToastEl).toHaveTextContent('更新件数: 3')
    const successCloseButton = within(successToastEl).getByRole('button', { name: '閉じる' })
    fireEvent.click(successCloseButton)
    expect(refreshButton).not.toBeDisabled()

    fireEvent.click(refreshButton)
    expect(refreshButton).toBeDisabled()

    await Promise.resolve()
    expect(fetchRefreshStatus).toHaveBeenCalledTimes(3)

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    const failureMessage = within(main).getByText('データ更新に失敗しました')
    const failureToast = failureMessage.closest('.toast') as HTMLElement | null
    expect(failureToast).not.toBeNull()
    const failureToastEl = failureToast as HTMLElement
    expect(failureToastEl).toHaveClass('toast--error')
    expect(failureToastEl).toHaveTextContent('network')
    expect(within(failureToastEl).getByRole('button', { name: '閉じる' })).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()
  })

  it('stale 応答で警告トーストと閉じるボタンを表示する', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()
    vi.useFakeTimers()

    const refreshButton = screen.getByRole('button', { name: '更新' })
    const main = screen.getByRole('main')

    postRefresh.mockResolvedValue({ state: 'running' })
    fetchRefreshStatus.mockResolvedValueOnce({
      state: 'stale',
      started_at: '2024-01-01T00:00:00Z',
      finished_at: '2024-01-01T00:00:05Z',
      updated_records: 0,
      last_error: null,
    })

    fireEvent.click(refreshButton)
    expect(refreshButton).toBeDisabled()

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    const warningMessage = within(main).getByText('データ更新の結果を取得できませんでした')
    const warningToast = warningMessage.closest('.toast') as HTMLElement | null
    expect(warningToast).not.toBeNull()
    const warningToastEl = warningToast as HTMLElement
    expect(warningToastEl).toHaveClass('toast--warning')
    expect(warningToastEl).toHaveTextContent('時間をおいて再試行してください')
    const closeButton = within(warningToastEl).getByRole('button', { name: '閉じる' })
    fireEvent.click(closeButton)
    expect(refreshButton).not.toBeDisabled()
  })

  it('タイムアウトで警告トーストを表示し閉じることができる', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()
    vi.useFakeTimers()

    const refreshButton = screen.getByRole('button', { name: '更新' })
    const main = screen.getByRole('main')

    postRefresh.mockResolvedValue({ state: 'running' })
    fetchRefreshStatus.mockResolvedValue({
      state: 'running',
      started_at: '2024-01-01T00:00:00Z',
      finished_at: null,
      updated_records: 0,
      last_error: null,
    })

    fireEvent.click(refreshButton)
    expect(refreshButton).toBeDisabled()

    await vi.advanceTimersByTimeAsync(120000)
    await Promise.resolve()

    await Promise.resolve()
    const timeoutMessage = within(main).getByText('更新状況の取得がタイムアウトしました')
    const timeoutToast = timeoutMessage.closest('.toast') as HTMLElement | null
    expect(timeoutToast).not.toBeNull()
    const timeoutToastEl = timeoutToast as HTMLElement
    expect(timeoutToastEl).toHaveClass('toast--warning')
    const closeButton = within(timeoutToastEl).getByRole('button', { name: '閉じる' })
    fireEvent.click(closeButton)
    expect(refreshButton).not.toBeDisabled()
  })
})
