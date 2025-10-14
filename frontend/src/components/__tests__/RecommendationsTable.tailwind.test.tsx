import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RecommendationsTable } from '../RecommendationsTable'
import type { RecommendationRow } from '../../hooks/recommendations/controller'
import type { MarketScopeOption } from '../../constants/marketScopes'

const renderWithQueryClient = (
  ui: ReactElement,
  options?: { setup?: (client: QueryClient) => void },
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['markets'], {
    markets: [],
    generated_at: '1970-01-01T00:00:00Z',
  })
  options?.setup?.(queryClient)
  return {
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
    queryClient,
  }
}

describe('RecommendationsTable (tailwind layout)', () => {
  afterEach(() => {
    cleanup()
  })

  const baseRow: RecommendationRow = {
    crop: 'Tomato',
    cropId: 1,
    category: 'flower',
    growth_days: 70,
    sowing_week: '2024-W10',
    harvest_week: '2024-W20',
    sowingWeekLabel: '2024-W10',
    harvestWeekLabel: '2024-W20',
    source: '全国平均',
    rowKey: 'Tomato-2024-W10-2024-W20',
  }

  it('ロード中は animate-pulse の Skeleton を表示する', async () => {
    const { container, queryClient } = renderWithQueryClient(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W10"
        rows={[]}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        isLoading
        marketScope="national"
      />,
    )

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent('読み込み中')
    queryClient.clear()
  })

  it('カードが市場テーマ色を反映する', async () => {
    const rows: RecommendationRow[] = [
      baseRow,
      {
        ...baseRow,
        crop: 'Carrot',
        cropId: 2,
        category: 'root',
        rowKey: 'Carrot-2024-W08-2024-W18',
        sowing_week: '2024-W08',
        harvest_week: '2024-W18',
        sowingWeekLabel: '2024-W08',
        harvestWeekLabel: '2024-W18',
        source: '東京都中央卸売',
      },
    ]

    const { queryClient } = renderWithQueryClient(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W10"
        rows={rows}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        marketScope="city:tokyo"
      />,
    )

    const cards = screen.getAllByTestId('recommendation-card')
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card.className).toContain('card-market')
      expect(card.className).toContain('bg-market-city')
    }
    queryClient.clear()
  })

  it('アクセシビリティ属性を維持する', async () => {
    const { queryClient } = renderWithQueryClient(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W10"
        rows={[baseRow]}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        marketScope="national"
      />,
    )

    const tables = screen.getAllByRole('table', {
      name: '温暖地向けの推奨一覧（基準週: 2024-W10）',
    })
    expect(tables).toHaveLength(1)
    const table = tables[0]!
    expect(table).toHaveAttribute(
      'aria-label',
      '温暖地向けの推奨一覧（基準週: 2024-W10）',
    )

    const card = screen.getByTestId('recommendation-card')
    expect(card.tagName).toBe('TR')
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(card).toHaveAttribute('aria-selected', 'false')

    const favoriteButtons = screen.getAllByRole('button', {
      name: 'Tomatoをお気に入りに追加',
    })
    expect(favoriteButtons.length).toBeGreaterThan(0)
    queryClient.clear()
  })

  it('React Query の市場カテゴリメタデータを描画する', async () => {
    const markets: readonly MarketScopeOption[] = [
      {
        scope: 'city:osaka',
        displayName: '大阪市中央卸売（API）',
        theme: { token: 'market-city', hex: '#2563eb', text: '#f8fafc' },
        categories: [
          {
            category: 'leaf',
            displayName: '葉菜類（大阪）',
          },
        ],
        value: 'city:osaka',
        label: '大阪市中央卸売（API）',
      },
    ]

    const { queryClient } = renderWithQueryClient(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W10"
        rows={[
          {
            ...baseRow,
            crop: 'Komatsuna',
            cropId: 3,
            category: 'leaf',
            rowKey: 'Komatsuna-2024-W10-2024-W20',
          },
        ]}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        marketScope="city:osaka"
      />,
      {
        setup: (client) => {
          client.setQueryData(['markets'], {
            markets,
            generated_at: '2024-05-01T00:00:00Z',
          })
        },
      },
    )

    await screen.findByText('カテゴリ: 葉菜類（大阪）')

    queryClient.clear()
  })
})
