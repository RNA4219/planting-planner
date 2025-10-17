import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MarketScopeOption } from '../../constants/marketScopes'

const { fetchMarketsMock } = vi.hoisted(() => ({
  fetchMarketsMock: vi.fn<() => Promise<{ markets: MarketScopeOption[]; generated_at: string }>>(),
}))

const createProps = () => ({
  queryWeek: '2024-W01',
  currentWeek: '2024-W01',
  onWeekChange: vi.fn(),
  onRegionChange: vi.fn(),
  marketScope: 'national' as const,
  onMarketScopeChange: vi.fn(),
  searchKeyword: '',
  onSearchChange: vi.fn(),
  onSubmit: vi.fn(),
  onRefresh: vi.fn(),
  refreshing: false,
})

const renderSearchControls = async (text: { marketLabel: string; marketAriaLabel: string }) => {
  vi.resetModules()
  fetchMarketsMock.mockResolvedValue({ markets: [], generated_at: '2024-01-01T00:00:00Z' })
  vi.doMock('../../lib/marketMetadata', () => ({ fetchMarkets: fetchMarketsMock }))
  vi.doMock('../../constants/messages', async () => {
    const actual = await vi.importActual<typeof import('../../constants/messages')>(
      '../../constants/messages',
    )

    return {
      ...actual,
      SEARCH_CONTROLS_TEXT: {
        ...actual.SEARCH_CONTROLS_TEXT,
        marketLabel: text.marketLabel,
        marketAriaLabel: text.marketAriaLabel,
      },
    }
  })

  const module = await import('../SearchControls')
  const { SearchControls } = module
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <SearchControls {...createProps()} />
      </QueryClientProvider>,
    ),
    queryClient,
  }
}

describe('SearchControls i18n', () => {
  afterEach(() => {
    cleanup()
    fetchMarketsMock.mockReset()
    vi.resetModules()
    vi.unmock('../../constants/messages')
    vi.unmock('../../lib/marketMetadata')
  })

  it('市場ラベルと aria-label が日本語辞書値を表示する', async () => {
    const { queryClient } = await renderSearchControls({ marketLabel: '市場', marketAriaLabel: '市場' })

    expect(screen.getByText('市場')).toBeInTheDocument()
    const select = screen.getByRole('combobox', { name: '市場' })
    expect(select).toHaveAttribute('aria-label', '市場')

    queryClient.clear()
  })

  it('市場ラベルと aria-label が英語辞書値を表示する', async () => {
    const { queryClient } = await renderSearchControls({ marketLabel: 'Market', marketAriaLabel: 'Market' })

    expect(screen.getByText('Market')).toBeInTheDocument()
    const select = screen.getByRole('combobox', { name: 'Market' })
    expect(select).toHaveAttribute('aria-label', 'Market')

    queryClient.clear()
  })
})
