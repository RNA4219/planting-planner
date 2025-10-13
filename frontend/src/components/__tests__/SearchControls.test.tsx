import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchControls } from '../SearchControls'
import { MARKET_SCOPE_OPTIONS, toMarketScopeOption, type MarketScopeDefinition, type MarketScopeOption } from '../../constants/marketScopes'
type MarketScopeThemeOption = MarketScopeOption & { theme?: string }
const { fetchMarketsMock } = vi.hoisted(() => ({
  fetchMarketsMock: vi.fn<() => Promise<{ markets: MarketScopeThemeOption[]; generated_at: string }>>(),
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
  it('市場リストとテーマクラスを React Query のレスポンスに合わせる', async () => {
    const definitions: MarketScopeDefinition[] = [
      { scope: 'national', displayName: '全国平均（API）', theme: { token: 'api-national', hex: '#123456', text: '#FFFFFF' } },
      { scope: 'city:fukuoka', displayName: '福岡市中央卸売（API）', theme: { token: 'api-fukuoka', hex: '#654321', text: '#FFFFFF' } },
    ]
    const markets = definitions.map((definition) => ({ ...toMarketScopeOption(definition), theme: definition.theme.token })) as MarketScopeThemeOption[]
    fetchMarketsMock.mockResolvedValue({ markets, generated_at: '2024-05-01T00:00:00Z' })
    const props = createProps()
    const { queryClient, rerender } = renderSearchControls(props)
    const select = screen.getByRole('combobox', { name: '市場' })
    await waitFor(() => expect(fetchMarketsMock).toHaveBeenCalledTimes(1))
    const optionElements = within(select).getAllByRole('option')
    expect(optionElements).toHaveLength(markets.length)
    expect(optionElements.map((element) => element.textContent)).toEqual(markets.map(({ label }) => label))
    expect(optionElements.map((element) => (element as HTMLOptionElement).value)).toEqual(markets.map(({ value }) => value))
    expect(select).toHaveClass(`bg-market-${markets[0]!.theme!}`, `text-market-${markets[0]!.theme!}`)
    rerender(
      <QueryClientProvider client={queryClient}>
        <SearchControls {...props} marketScope="city:fukuoka" />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(select).toHaveClass(`bg-market-${markets[1]!.theme!}`, `text-market-${markets[1]!.theme!}`))
    queryClient.clear()
  })
  it('React Query 未完了時はフォールバックを描画し、フォームにレイアウトクラスを適用する', () => {
    fetchMarketsMock.mockReturnValue(new Promise(() => {}))
    const { container, queryClient } = renderSearchControls()
    const select = screen.getByRole('combobox', { name: '市場' })
    const fallbackTheme = MARKET_SCOPE_OPTIONS.find((option) => option.value === createProps().marketScope)?.theme.token
    expect(fallbackTheme).toBeDefined()
    const optionElements = within(select).getAllByRole('option')
    expect(optionElements).toHaveLength(MARKET_SCOPE_OPTIONS.length)
    expect(select).toHaveClass(`bg-market-${fallbackTheme!}`, `text-market-${fallbackTheme!}`)
    const form = container.querySelector('form') as HTMLFormElement
    expect(form.classList).toContain('grid')
    expect(Array.from(form.classList).some((cls) => cls.startsWith('gap-'))).toBe(true)
    expect(form.classList).toContain('items-end')
    queryClient.clear()
  })
})
