import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchControls } from '../SearchControls'
import { MARKET_SCOPE_OPTIONS, toMarketScopeOption, type MarketScopeDefinition } from '../../constants/marketScopes'
const { fetchMarketsMock } = vi.hoisted(() => ({
  fetchMarketsMock: vi.fn<() => Promise<{ markets: ReturnType<typeof toMarketScopeOption>[]; generated_at: string }>>(),
}))
vi.mock('../../lib/api', () => ({ fetchMarkets: fetchMarketsMock }))
const createProps = () => ({
  queryWeek: '2024-W01',
  currentWeek: '2024-W20',
  onWeekChange: vi.fn(),
  onRegionChange: vi.fn(),
  marketScope: 'national' as const,
  onMarketScopeChange: vi.fn(),
  searchKeyword: 'トマト',
  onSearchChange: vi.fn(),
  onSubmit: vi.fn(),
  onRefresh: vi.fn(),
  refreshing: false,
})

const renderSearchControls = (props = createProps()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <SearchControls {...props} />
      </QueryClientProvider>,
    ),
    queryClient,
  }
}

describe('SearchControls', () => {
  afterEach(() => fetchMarketsMock.mockReset())

  it('週入力の inputMode が text または未指定で、pattern が YYYY-Www を維持する', () => {
    const { queryClient } = renderSearchControls()
    const weekInput = screen.getByLabelText('週') as HTMLInputElement
    expect(weekInput).toHaveAttribute('pattern', '\\d{4}-W\\d{2}')
    const inputMode = weekInput.getAttribute('inputmode')
    expect(inputMode === null || inputMode === 'text').toBe(true)
    queryClient.clear()
  })
  it('市場リストを React Query のレスポンスに合わせる', async () => {
    const definitions: MarketScopeDefinition[] = [
      { scope: 'national', displayName: '全国平均（API）', theme: { token: 'api-national', hex: '#123456', text: '#FFFFFF' } },
      { scope: 'city:fukuoka', displayName: '福岡市中央卸売（API）', theme: { token: 'api-fukuoka', hex: '#654321', text: '#FFFFFF' } },
    ]
    const markets = definitions.map((definition) => toMarketScopeOption(definition))
    fetchMarketsMock.mockResolvedValue({ markets, generated_at: '2024-05-01T00:00:00Z' })
    const props = createProps()
    const { queryClient, rerender } = renderSearchControls(props)
    const select = screen.getAllByRole('combobox', { name: '市場' }).at(-1) as HTMLSelectElement
    await waitFor(() => expect(fetchMarketsMock).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(within(select).getAllByRole('option')).toHaveLength(markets.length)
    })
    const optionElements = within(select).getAllByRole('option')
    expect(optionElements.map((element) => element.textContent)).toEqual(markets.map(({ label }) => label))
    expect(optionElements.map((element) => (element as HTMLOptionElement).value)).toEqual(markets.map(({ value }) => value))
    rerender(
      <QueryClientProvider client={queryClient}>
        <SearchControls {...props} marketScope="city:fukuoka" />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(select.value).toBe('city:fukuoka'))
    queryClient.clear()
  })
  it('React Query 未完了時はフォールバックを描画する', () => {
    fetchMarketsMock.mockReturnValue(new Promise(() => {}))
    const { container, queryClient } = renderSearchControls()
    const select = screen.getAllByRole('combobox', { name: '市場' }).at(-1) as HTMLSelectElement
    const optionElements = within(select).getAllByRole('option')
    expect(optionElements).toHaveLength(MARKET_SCOPE_OPTIONS.length)
    const firstOption = optionElements[0] as HTMLOptionElement
    expect(firstOption.textContent).toBe(MARKET_SCOPE_OPTIONS[0]!.label)
    expect(firstOption.value).toBe(MARKET_SCOPE_OPTIONS[0]!.value)
    expect(select.className).toContain('bg-market-national')
    expect(select).toHaveAttribute('data-theme', 'market-national')
    const forms = container.querySelectorAll('form')
    expect(forms.length).toBeGreaterThan(0)
    const form = forms[forms.length - 1]!
    expect(form).toHaveClass('flex', 'flex-col', 'gap-4')
    expect(form.className).toMatch(/bg-market-|border-market-|text-market-/)
    queryClient.clear()
  })
  it('市場セレクトのテーマがアクティブスコープに追従する', async () => {
    const definitions: MarketScopeDefinition[] = [
      { scope: 'national', displayName: '全国平均（API）', theme: { token: 'api-national', hex: '#123456', text: '#111111' } },
      { scope: 'city:tokyo', displayName: '東京都中央卸売（API）', theme: { token: 'api-tokyo', hex: '#654321', text: '#222222' } },
    ]
    const markets = definitions.map((definition) => toMarketScopeOption(definition))
    fetchMarketsMock.mockResolvedValue({ markets, generated_at: '2024-05-01T00:00:00Z' })
    const props = createProps()
    const { queryClient, rerender } = renderSearchControls(props)
    const select = screen.getAllByRole('combobox', { name: '市場' }).at(-1) as HTMLSelectElement

    await waitFor(() => expect(fetchMarketsMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(select).toHaveAttribute('data-theme', 'market-national'))
    expect(select.className).toContain('bg-market-national')
    expect(select.style.color).toBe('rgb(17, 17, 17)')

    rerender(
      <QueryClientProvider client={queryClient}>
        <SearchControls {...props} marketScope="city:tokyo" />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(select.value).toBe('city:tokyo'))
    await waitFor(() => expect(select).toHaveAttribute('data-theme', 'market-tokyo'))
    expect(select.className).toContain('bg-market-tokyo')
    expect(select.style.color).toBe('rgb(34, 34, 34)')

    queryClient.clear()
  })
})
