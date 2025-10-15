import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { AppContent } from '../../App'
import {
  useRecommendations,
  type UseRecommendationsResult,
} from '../../hooks/recommendations/controller'
import { useAppNotifications } from '../useAppNotifications'

type UseAppNotificationsResult = ReturnType<typeof useAppNotifications>

vi.mock('../../hooks/recommendations/controller', () => ({
  useRecommendations: vi.fn(),
}))

vi.mock('../useAppNotifications', () => ({
  useAppNotifications: vi.fn(),
}))

describe('AppContent accessibility', () => {
  it('リンクされたタブパネルと価格チャート領域を描画する', () => {
    const mockUseRecommendations = vi.mocked(useRecommendations)
    const mockUseAppNotifications = vi.mocked(useAppNotifications)

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

    mockUseRecommendations.mockReturnValue(recommendationsResult)
    mockUseAppNotifications.mockReturnValue(notificationsResult)

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
})
