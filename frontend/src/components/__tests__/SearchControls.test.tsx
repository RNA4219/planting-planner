import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SearchControls } from '../SearchControls'
import {
  toMarketScopeOption,
  type MarketScopeDefinition,
  type MarketScopeOption,
} from '../../constants/marketScopes'

const { fetchMarketsMock } = vi.hoisted(() => ({
  fetchMarketsMock: vi.fn<
    () => Promise<{ markets: MarketScopeOption[]; generated_at: string }>
  >(),
}))

vi.mock('../../lib/api', () => ({
  fetchMarkets: fetchMarketsMock,
}))

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <SearchControls {...props} />
    </QueryClientProvider>,
  )

  return { ...result, queryClient }
}

describe('SearchControls', () => {
  afterEach(() => {
    fetchMarketsMock.mockReset()
  })

  it('週入力の inputMode が text または未指定で、pattern が YYYY-Www を維持する', () => {
    const { queryClient } = renderSearchControls()

    const weekInput = screen.getByLabelText('週') as HTMLInputElement

    expect(weekInput).toHaveAttribute('pattern', '\\d{4}-W\\d{2}')

    const inputMode = weekInput.getAttribute('inputmode')
    expect(inputMode === null || inputMode === 'text').toBe(true)

    queryClient.clear()
  })

  it('市場リストを React Query のレスポンスに合わせて描画する', async () => {
    const definitions: MarketScopeDefinition[] = [
      {
        scope: 'national',
        displayName: '全国平均（API）',
        theme: { token: 'api-national', hex: '#123456', text: '#FFFFFF' },
      },
      {
        scope: 'city:fukuoka',
        displayName: '福岡市中央卸売（API）',
        theme: { token: 'api-fukuoka', hex: '#654321', text: '#FFFFFF' },
      },
    ]
    const markets = definitions.map(toMarketScopeOption)
    fetchMarketsMock.mockResolvedValue({
      markets,
      generated_at: '2024-05-01T00:00:00Z',
    })

    const { queryClient } = renderSearchControls()

    const marketSelects = screen.getAllByLabelText('市場')
    const marketSelect = marketSelects.at(-1)
    if (!marketSelect) {
      throw new Error('市場セレクトが見つかりません')
    }

    await waitFor(() => {
      expect(fetchMarketsMock).toHaveBeenCalledTimes(1)
      expect(within(marketSelect).getAllByRole('option')).toHaveLength(markets.length)
    })

    const optionElements = within(marketSelect).getAllByRole('option')
    optionElements.forEach((element, index) => {
      expect(element).toHaveTextContent(markets[index]!.label)
      expect(element).toHaveValue(markets[index]!.value)
    })

    queryClient.clear()
  })

  it('市場のテーマに合わせてセレクトのクラスを切り替える', async () => {
    const markets = [toMarketScopeOption({
      scope: 'city:fukuoka',
      displayName: '福岡市中央卸売（API）',
      theme: { token: 'market-fukuoka', hex: '#654321', text: '#FFFFFF' },
    })]
    fetchMarketsMock.mockResolvedValue({ markets, generated_at: '2024-05-01T00:00:00Z' })

    const { queryClient } = renderSearchControls({ ...createProps(), marketScope: 'city:fukuoka' as const })
    const marketSelect = screen.getAllByLabelText('市場').at(-1)!
    await waitFor(() => {
      expect(fetchMarketsMock).toHaveBeenCalledTimes(1)
      expect(marketSelect).toHaveClass('bg-market-fukuoka')
      expect(marketSelect).toHaveClass('text-market-fukuoka')
    })
    queryClient.clear()
  })

  it('テーマ情報がない場合はスコープに応じたフォールバックを適用する', async () => {
    fetchMarketsMock.mockResolvedValue({
      markets: [{
        scope: 'city:fukuoka',
        displayName: '福岡市中央卸売（API）',
        theme: undefined,
        value: 'city:fukuoka' as const,
        label: '福岡市中央卸売（API）',
      }],
      generated_at: '2024-05-01T00:00:00Z',
    })

    const { queryClient } = renderSearchControls({ ...createProps(), marketScope: 'city:fukuoka' as const })
    const marketSelect = screen.getAllByLabelText('市場').at(-1)!
    await waitFor(() => {
      expect(fetchMarketsMock).toHaveBeenCalledTimes(1)
      expect(marketSelect).toHaveClass('bg-market-city')
      expect(marketSelect).toHaveClass('text-market-city')
    })
    queryClient.clear()
  })
})
