import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import App from '../src/App'
import { createInteractionsHarness } from './utils/interactionsHarness'
import {
  fetchRecommend,
  fetchRecommendations,
  fetchCrops,
  postRefresh,
  fetchRefreshStatus,
} from './utils/renderApp'

const harness = createInteractionsHarness()

describe('App refresh workflow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('postRefresh 成功後にステータスをポーリングし、成功トーストと reloadCurrentWeek を経て自動クローズする', async () => {
    vi.useFakeTimers()

    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })
    fetchCrops.mockResolvedValue([])

    const reloadCurrentWeek = vi.fn(async () => {})
    harness.useRecommendationsSpy.mockImplementation(() => ({
      region: 'temperate',
      setRegion: vi.fn(),
      queryWeek: '2024-W30',
      setQueryWeek: vi.fn(),
      currentWeek: '2024-W30',
      displayWeek: '2024-W30',
      sortedRows: [],
      handleSubmit: vi.fn(),
      reloadCurrentWeek,
    }))

    postRefresh.mockResolvedValue({ state: 'success' })
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
        finished_at: '2024-01-01T00:10:00Z',
        updated_records: 7,
        last_error: null,
      })

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)

    const refreshButton = await screen.findByRole('button', { name: '更新' })
    await user.click(refreshButton)

    await waitFor(() => {
      expect(postRefresh).toHaveBeenCalledTimes(1)
    })

    const startToast = await screen.findByText('更新を開始しました。進行状況を確認しています…')
    expect(startToast).toBeInTheDocument()

    await waitFor(() => {
      expect(fetchRefreshStatus).toHaveBeenCalledTimes(1)
    })

    await vi.advanceTimersByTimeAsync(1000)

    await waitFor(() => {
      expect(fetchRefreshStatus).toHaveBeenCalledTimes(2)
    })

    const successToast = await screen.findByText('更新が完了しました。7件のデータを更新しました。')
    expect(successToast).toBeInTheDocument()

    await waitFor(() => {
      expect(reloadCurrentWeek).toHaveBeenCalledTimes(1)
    })

    await vi.advanceTimersByTimeAsync(5000)

    await waitFor(() => {
      expect(screen.queryByText('更新が完了しました。7件のデータを更新しました。')).not.toBeInTheDocument()
    })
  })
})
