import '@testing-library/jest-dom/vitest'
import { act, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppContent } from '../../App'
import {
  useRecommendations,
  type UseRecommendationsResult,
} from '../../hooks/recommendations/controller'
import { useAppNotifications } from '../useAppNotifications'
import { useWeather } from '../../hooks/weather/useWeather'

const createMockWeatherResult = () => ({
  latest: null,
  previous: null,
  isLoading: false,
  error: null,
  nextRetryAt: null,
  refresh: vi.fn(),
})

const createMockRecommendationsResult = (): UseRecommendationsResult => ({
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
})

const createMockAppNotificationsResult = () => ({
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
})

vi.mock('../../hooks/recommendations/controller', () => ({
  __esModule: true,
  useRecommendations: vi.fn(),
}))

vi.mock('../useAppNotifications', () => ({
  __esModule: true,
  useAppNotifications: vi.fn(),
}))

vi.mock('../../hooks/weather/useWeather', () => ({
  __esModule: true,
  useWeather: vi.fn(),
}))

describe('AppContent accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockUseRecommendations = vi.mocked(useRecommendations)
    const mockUseAppNotifications = vi.mocked(useAppNotifications)
    const mockUseWeather = vi.mocked(useWeather)

    mockUseRecommendations.mockReturnValue(createMockRecommendationsResult())
    mockUseAppNotifications.mockReturnValue(createMockAppNotificationsResult())
    mockUseWeather.mockReturnValue(createMockWeatherResult())
  })

  it('useRecommendations が未設定でも安全に描画できる', () => {
    const queryClient = new QueryClient()

    const renderApp = () =>
      render(
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>,
      )

    expect(() => {
      const view = renderApp()
      view.unmount()
      queryClient.clear()
    }).not.toThrow()
  })

  it('リンクされたタブパネルと価格チャート領域を描画する', () => {
    const mockUseRecommendations = vi.mocked(useRecommendations)
    const mockUseAppNotifications = vi.mocked(useAppNotifications)
    const mockUseWeather = vi.mocked(useWeather)

    const recommendationsResult = createMockRecommendationsResult()
    const notificationsResult = createMockAppNotificationsResult()

    mockUseRecommendations.mockReturnValue(recommendationsResult)
    mockUseAppNotifications.mockReturnValue(notificationsResult)
    mockUseWeather.mockReturnValue(createMockWeatherResult())

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

    const recommendationsResult = createMockRecommendationsResult()
    const notificationsResult = createMockAppNotificationsResult()

    mockUseRecommendations.mockReturnValue(recommendationsResult)
    mockUseAppNotifications.mockReturnValue(notificationsResult)
    mockUseWeather.mockReturnValue(createMockWeatherResult())

    const originalIdle = globalThis as {
      requestIdleCallback?: typeof window.requestIdleCallback
      cancelIdleCallback?: typeof window.cancelIdleCallback
    }
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

    ;(
      globalThis as {
        requestIdleCallback?: typeof window.requestIdleCallback
        cancelIdleCallback?: typeof window.cancelIdleCallback
      }
    ).requestIdleCallback = idleStub
    ;(
      globalThis as {
        requestIdleCallback?: typeof window.requestIdleCallback
        cancelIdleCallback?: typeof window.cancelIdleCallback
      }
    ).cancelIdleCallback = cancelIdleStub

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

    const weatherRegions = await screen.findAllByRole('region', { name: '天気' })
    expect(weatherRegions).not.toHaveLength(0)

    const weatherRegion = weatherRegions.find((region) =>
      within(region).queryByTestId('weather-latest'),
    )

    expect(weatherRegion).toBeDefined()
    expect(screen.queryByRole('status', { name: '天気' })).not.toBeInTheDocument()

    queryClient.clear()
    ;(
      globalThis as {
        requestIdleCallback?: typeof window.requestIdleCallback
        cancelIdleCallback?: typeof window.cancelIdleCallback
      }
    ).requestIdleCallback = originalIdle.requestIdleCallback
    ;(
      globalThis as {
        requestIdleCallback?: typeof window.requestIdleCallback
        cancelIdleCallback?: typeof window.cancelIdleCallback
      }
    ).cancelIdleCallback = originalIdle.cancelIdleCallback
  })
})
