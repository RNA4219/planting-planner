import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { render, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./components/SearchControls', () => ({
  __esModule: true,
  SearchControls: () => null,
}))

vi.mock('./components/PriceChartSection', () => ({
  __esModule: true,
  PriceChartSection: () => null,
}))

vi.mock('./components/ToastStack', () => ({
  __esModule: true,
  ToastStack: () => null,
}))

vi.mock('./components/RecommendationsTable', () => ({
  __esModule: true,
  RecommendationsTable: ({ headerSlot, tabpanelId }: { headerSlot?: ReactNode; tabpanelId?: string }) => (
    <div data-testid="recommendations-table" id={tabpanelId}>
      {headerSlot}
    </div>
  ),
}))

vi.mock('./components/FavStar', () => ({
  __esModule: true,
  useFavorites: () => ({
    favorites: [],
    toggleFavorite: vi.fn(),
    isFavorite: vi.fn().mockReturnValue(false),
  }),
}))

vi.mock('./hooks/recommendations/controller', () => ({
  __esModule: true,
  useRecommendations: () => ({
    region: 'temperate',
    setRegion: vi.fn(),
    marketScope: 'national',
    setCategory: vi.fn(),
    category: 'leaf',
    setMarketScope: vi.fn(),
    selectedMarket: 'national',
    selectedCategory: 'leaf',
    queryWeek: '2024-W30',
    setQueryWeek: vi.fn(),
    currentWeek: '2024-W30',
    displayWeek: '2024-W30',
    sortedRows: [],
    handleSubmit: vi.fn(),
    reloadCurrentWeek: vi.fn(),
    isMarketFallback: false,
  }),
}))

vi.mock('./hooks/refresh/controller', () => ({
  __esModule: true,
  useRefreshStatusController: () => ({
    isRefreshing: false,
    startRefresh: vi.fn(),
    pendingToasts: [],
    dismissToast: vi.fn(),
  }),
}))

vi.mock('./lib/storage', () => ({
  __esModule: true,
  loadRegion: () => 'temperate',
  loadMarketScope: () => 'national',
  loadSelectedCategory: () => 'leaf',
}))

describe('AppContent multi-instance accessibility', () => {
  it('それぞれのタブが固有の aria-controls を参照する', async () => {
    const { AppContent } = await import('./App')
    const queryClient = new QueryClient()

    const { getAllByRole } = render(
      <QueryClientProvider client={queryClient}>
        <div>
          <AppContent />
          <AppContent />
        </div>
      </QueryClientProvider>,
    )

    const tablists = getAllByRole('tablist')
    expect(tablists).toHaveLength(2)

    const firstTab = within(tablists[0]!).getAllByRole('tab')[0]!
    const secondTab = within(tablists[1]!).getAllByRole('tab')[0]!

    const firstControls = firstTab.getAttribute('aria-controls')
    const secondControls = secondTab.getAttribute('aria-controls')

    expect(firstControls).toBeTruthy()
    expect(secondControls).toBeTruthy()
    expect(firstControls).not.toBe(secondControls)
  })
})
