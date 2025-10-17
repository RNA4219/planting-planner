import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppContent } from '../../App'
import {
  useRecommendations,
  type UseRecommendationsResult,
} from '../../hooks/recommendations/controller'
import { useAppNotifications } from '../useAppNotifications'
import { useWeather } from '../../hooks/weather/useWeather'

type UseAppNotificationsResult = ReturnType<typeof useAppNotifications>

const createMockWeatherResult = () => ({
  latest: null,
  previous: null,
  isLoading: false,
  error: null,
  nextRetryAt: null,
  refresh: vi.fn(),
})

vi.mock('../../hooks/recommendations/controller', () => ({
  useRecommendations: vi.fn(),
}))

vi.mock('../useAppNotifications', () => ({
  useAppNotifications: vi.fn(),
}))

vi.mock('../../hooks/weather/useWeather', () => ({
  useWeather: vi.fn(),
}))

describe('AppContent accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('リンクされたタブパネルと価格チャート領域を描画する', () => {
    const mockUseRecommendations = vi.mocked(useRecommendations)
    const mockUseAppNotifications = vi.mocked(useAppNotifications)
    const mockUseWeather = vi.mocked(useWeather)

    const recommendationsResult: UseRecommendationsResult = {
      region: 'temperate',
      setRegion: vi.fn(),
      marketScope: 'national',
      setMarketScope: vi.fn(),
      selectedMarket: 'national',
      category: 'leaf',
      setCategory: vi.fn(),
      selectedCategory: 'leaf',
      queryWeek: '2024-W01',
      setQueryWeek: vi.fn(),
      currentWeek: '2024-W01',
      displayWeek: '2024-W01',
      sortedRows: [],
      handleSubmit: vi.fn(),
      reloadCurrentWeek: vi.fn(),
      isMarketFallback: false,
      recommendationError: null,
    }

    const notificationsResult: UseAppNotificationsResult = {
      isRefreshing: false,
      startRefresh: vi.fn(),
      combinedToasts: [],
      handleToastDismiss: vi.fn(),
      handleToastAction: vi.fn(),
      fallbackNotice: null,
      offlineBanner: null,
      isOffline: false,
      lastSync: null,
      notifyShareResult: vi.fn(),
    }

    mockUseRecommendations.mockImplementation(() => recommendationsResult)
    mockUseAppNotifications.mockImplementation(() => notificationsResult)
    mockUseWeather.mockImplementation(() => createMockWeatherResult())

    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    )

    queryClient.clear()

    const tabpanel = screen.getByRole('tabpanel')
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'category-tab-leaf')

    expect(screen.getByRole('heading', { name: '価格推移' })).toBeInTheDocument()
  })

  it('天気タブをアイドル時に遅延ロードする', async () => {
    const mockUseRecommendations = vi.mocked(useRecommendations)
    const mockUseAppNotifications = vi.mocked(useAppNotifications)
    const mockUseWeather = vi.mocked(useWeather)

    const recommendationsResult: UseRecommendationsResult = {
      region: 'temperate',
      setRegion: vi.fn(),
      marketScope: 'national',
      setMarketScope: vi.fn(),
      selectedMarket: 'national',
      category: 'leaf',
      setCategory: vi.fn(),
      selectedCategory: 'leaf',
      queryWeek: '2024-W01',
      setQueryWeek: vi.fn(),
      currentWeek: '2024-W01',
      displayWeek: '2024-W01',
      sortedRows: [],
      handleSubmit: vi.fn(),
      reloadCurrentWeek: vi.fn(),
      isMarketFallback: false,
      recommendationError: null,
    }

    const notificationsResult: UseAppNotificationsResult = {
      isRefreshing: false,
      startRefresh: vi.fn(),
      combinedToasts: [],
      handleToastDismiss: vi.fn(),
      handleToastAction: vi.fn(),
      fallbackNotice: null,
      offlineBanner: null,
      isOffline: false,
      lastSync: null,
      notifyShareResult: vi.fn(),
    }

    mockUseRecommendations.mockImplementation(() => recommendationsResult)
    mockUseAppNotifications.mockImplementation(() => notificationsResult)

    mockUseWeather.mockImplementation(() => createMockWeatherResult())

    const originalIdle = (globalThis as {
      requestIdleCallback?: typeof window.requestIdleCallback
      cancelIdleCallback?: typeof window.cancelIdleCallback
    })
    type IdleQueueEntry = { handle: number; callback: IdleRequestCallback }
    const idleQueue: IdleQueueEntry[] = []
    let handleSequence = 0

    const idleStub = (callback: IdleRequestCallback): number => {
      handleSequence += 1
      idleQueue.push({ handle: handleSequence, callback })
      return handleSequence
    }

    const cancelIdleStub = (handle: number) => {
      const index = idleQueue.findIndex((entry) => entry.handle === handle)
      if (index >= 0) {
        idleQueue.splice(index, 1)
      }
    }

    ;(globalThis as {
      requestIdleCallback?: typeof window.requestIdleCallback
      cancelIdleCallback?: typeof window.cancelIdleCallback
    }).requestIdleCallback = idleStub
    ;(globalThis as {
      requestIdleCallback?: typeof window.requestIdleCallback
      cancelIdleCallback?: typeof window.cancelIdleCallback
    }).cancelIdleCallback = cancelIdleStub

    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>,
    )

    expect(screen.queryAllByRole('status', { name: '天気' })).not.toHaveLength(0)
    expect(screen.queryByRole('region', { name: '天気' })).not.toBeInTheDocument()

    await act(async () => {
      idleQueue.splice(0).forEach(({ callback }) => {
        callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
      })
      await Promise.resolve()
    })

    expect(await screen.findByRole('region', { name: '天気' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: '天気' })).not.toBeInTheDocument()

    queryClient.clear()

    ;(globalThis as {
      requestIdleCallback?: typeof window.requestIdleCallback
      cancelIdleCallback?: typeof window.cancelIdleCallback
    }).requestIdleCallback = originalIdle.requestIdleCallback
    ;(globalThis as {
      requestIdleCallback?: typeof window.requestIdleCallback
      cancelIdleCallback?: typeof window.cancelIdleCallback
    }).cancelIdleCallback = originalIdle.cancelIdleCallback
  })
})
