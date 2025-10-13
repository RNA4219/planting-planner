import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  fetchRecommend,
  fetchRecommendations,
  fetchCrops,
  postRefresh,
  fetchRefreshStatus,
  resetAppSpies,
  renderApp,
} from './utils/renderApp'

describe('App refresh workflow', () => {
  beforeEach(() => {
    resetAppSpies()
  })

  afterEach(() => {
    resetAppSpies()
    vi.useRealTimers()
  })

  test('postRefresh 成功後にステータスをポーリングし、成功トーストと reloadCurrentWeek を経て自動クローズする', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    })
    fetchCrops.mockResolvedValue([])

    const useRecommendationsModule = await import('../src/hooks/recommendations/controller')
    const originalUseRecommendations = useRecommendationsModule.useRecommendations
    const reloadCurrentWeekSpy = vi.fn()
    const useRecommendationsMock = vi
      .spyOn(useRecommendationsModule, 'useRecommendations')
      .mockImplementation((options) => {
        const result = originalUseRecommendations(options)
        return {
          ...result,
          reloadCurrentWeek: async () => {
            reloadCurrentWeekSpy()
            await result.reloadCurrentWeek()
          },
        }
      })

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
        finished_at: '2024-01-01T00:10:00Z',
        updated_records: 7,
        last_error: null,
      })

    await renderApp({ useFakeTimers: true })

    const refreshButton = screen.getByRole('button', { name: '更新' })
    fireEvent.click(refreshButton)
    await Promise.resolve()
    await Promise.resolve()

    expect(postRefresh).toHaveBeenCalledTimes(1)

    const startToast = screen.getByText('更新を開始しました。進行状況を確認しています…')
    expect(startToast).toBeInTheDocument()
    const startToastContainer = startToast.closest('[data-testid="toast"]')
    expect(startToastContainer).not.toBeNull()
    if (startToastContainer) {
      expect(
        Array.from(startToastContainer.classList).some(
          (className) => className === 'toast' || className.startsWith('toast--'),
        ),
      ).toBe(false)
      const stack = startToastContainer.closest('[data-testid="toast-stack"]')
      expect(stack).not.toBeNull()
      if (stack) {
        expect(
          Array.from(stack.classList).some((className) => className.startsWith('toast')),
        ).toBe(false)
      }
    }

    expect(fetchRefreshStatus).toHaveBeenCalledTimes(1)

    expect(screen.queryByText('データ更新が完了しました')).not.toBeInTheDocument()
    expect(screen.queryByText('7件のデータを更新しました。')).not.toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(5000)
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchRefreshStatus).toHaveBeenCalledTimes(2)

    const successMessage = screen.getByText('データ更新が完了しました')
    const successDetail = screen.getByText('7件のデータを更新しました。')
    expect(successMessage).toBeInTheDocument()
    expect(successDetail).toBeInTheDocument()
    const successToast = successMessage.closest('[data-testid="toast"]')
    expect(successToast).not.toBeNull()
    if (successToast) {
      expect(successDetail.closest('[data-testid="toast"]')).toBe(successToast)
      expect(
        Array.from(successToast.classList).some(
          (className) => className === 'toast' || className.startsWith('toast--'),
        ),
      ).toBe(false)
    }

    for (let i = 0; i < 5; i += 1) {
      if (reloadCurrentWeekSpy.mock.calls.length > 0) {
        break
      }
      await Promise.resolve()
    }
    expect(reloadCurrentWeekSpy).toHaveBeenCalledTimes(1)

    useRecommendationsMock.mockRestore()
  })
})
