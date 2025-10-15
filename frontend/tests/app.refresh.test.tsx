import '@testing-library/jest-dom/vitest'
import { fireEvent, screen, within } from '@testing-library/react'
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
import { TOAST_MESSAGES } from '../src/constants/messages'
import type { ServiceWorkerClientEvent } from '../src/lib/swClient'

const swListeners = new Set<(event: ServiceWorkerClientEvent) => void>()
let swSnapshot = {
  waiting: null as ServiceWorker | null,
  isOffline: false,
  lastSyncAt: null as string | null,
}
const skipWaitingMock = vi.fn()

vi.mock('../src/lib/swClient', () => ({
  registerServiceWorker: vi.fn(),
  subscribe: vi.fn((listener: (event: ServiceWorkerClientEvent) => void) => {
    swListeners.add(listener)
    return () => {
      swListeners.delete(listener)
    }
  }),
  getSnapshot: vi.fn(() => swSnapshot),
  isForceUpdateEnabled: vi.fn(() => false),
  skipWaiting: (...args: unknown[]) => {
    skipWaitingMock(...args)
  },
  setLastSync: vi.fn((value: string | null) => {
    swSnapshot = { ...swSnapshot, lastSyncAt: value }
    swListeners.forEach((listener) =>
      listener({ type: 'last-sync', lastSyncAt: value }),
    )
  }),
}))

vi.mock('../src/lib/telemetry', () => ({
  sendTelemetry: vi.fn(),
}))

const emitSwEvent = (event: ServiceWorkerClientEvent) => {
  if (event.type === 'waiting') {
    swSnapshot = { ...swSnapshot, waiting: event.registration.waiting }
  }
  if (event.type === 'waiting-cleared') {
    swSnapshot = { ...swSnapshot, waiting: null }
  }
  if (event.type === 'offline') {
    swSnapshot = { ...swSnapshot, isOffline: event.isOffline }
  }
  if (event.type === 'last-sync') {
    swSnapshot = { ...swSnapshot, lastSyncAt: event.lastSyncAt }
  }
  swListeners.forEach((listener) => listener(event))
}

describe('App refresh workflow', () => {
  beforeEach(() => {
    resetAppSpies()
    swListeners.clear()
    skipWaitingMock.mockReset()
    swSnapshot = {
      waiting: null,
      isOffline: false,
      lastSyncAt: null,
    }
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
    expect(swSnapshot.lastSyncAt).toBe('2024-01-01T00:10:00Z')
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

  test('Service Worker 更新トーストで「今すぐ更新」を押下すると skipWaiting が呼ばれる', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    })
    fetchCrops.mockResolvedValue([])
    swSnapshot = {
      ...swSnapshot,
      waiting: {
        postMessage: vi.fn(),
      } as unknown as ServiceWorker,
    }

    await renderApp()

    const updateToast = await screen.findByText(TOAST_MESSAGES.serviceWorkerUpdateAvailable)
    const updateToastContainer = updateToast.closest('[data-testid="toast"]')
    expect(updateToastContainer).not.toBeNull()
    const updateNowButton = await within(updateToastContainer as Element).findByRole(
      'button',
      { name: TOAST_MESSAGES.serviceWorkerUpdateNow },
    )
    await fireEvent.click(updateNowButton)

    expect(skipWaitingMock).toHaveBeenCalledTimes(1)
  })

  test('オフライン時にバナーとステータスバーを表示し telemetry を送出する', async () => {
    const telemetryModule = await import('../src/lib/telemetry')
    const sendTelemetryMock = vi.mocked(telemetryModule.sendTelemetry)
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    })
    fetchCrops.mockResolvedValue([])

    await renderApp()

    emitSwEvent({ type: 'last-sync', lastSyncAt: '2024-03-04T05:06:07Z' })
    emitSwEvent({ type: 'offline', isOffline: true })

    const banner = await screen.findByTestId('offline-status-banner')
    expect(banner).toHaveTextContent('オフラインで表示しています')
    expect(banner).toHaveTextContent('最終同期: 2024/03/04 05:06')

    const statusBars = screen.getAllByTestId('app-status-bar')
    const latestStatusBar = statusBars[statusBars.length - 1]
    expect(latestStatusBar).toHaveTextContent('オフライン')
    expect(latestStatusBar).toHaveTextContent('最終同期: 2024/03/04 05:06')

    expect(sendTelemetryMock).toHaveBeenCalledWith('offline.banner_shown', {
      lastSyncAt: '2024-03-04T05:06:07Z',
    })
  })
})
