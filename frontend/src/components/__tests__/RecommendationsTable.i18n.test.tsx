import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { RecommendationsTable } from '../RecommendationsTable'
import type { RecommendationRow } from '../../hooks/recommendations/controller'
import type { MarketScopeOption } from '../../constants/marketScopes'

const renderWithQueryClient = (
  ui: ReactElement,
  options?: { setup?: (client: QueryClient) => void },
) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  client.setQueryData(['markets'], { markets: [], generated_at: '1970-01-01T00:00:00Z' })
  options?.setup?.(client)
  return { ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>), queryClient: client }
}

describe('RecommendationsTable (i18n)', () => {
  afterEach(cleanup)

  const baseRow: RecommendationRow = {
    crop: 'Tomato',
    cropId: 1,
    category: 'leaf',
    growth_days: 70,
    sowing_week: '2024-W10',
    harvest_week: '2024-W20',
    sowingWeekLabel: '2024-W10',
    harvestWeekLabel: '2024-W20',
    source: '全国平均',
    rowKey: 'Tomato-2024-W10-2024-W20',
  }

  it('地域と基準週のラベルを日本語で表示する', async () => {
    const markets: readonly MarketScopeOption[] = [
      {
        scope: 'city:tokyo',
        displayName: '東京都中央卸売',
        theme: { token: 'market-city', hex: '#2563eb', text: '#f8fafc' },
        categories: [{ category: 'leaf', displayName: '葉菜類（東京）' }],
        value: 'city:tokyo',
        label: '東京都中央卸売',
      },
    ]

    const { queryClient } = renderWithQueryClient(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W10"
        rows={[baseRow]}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        marketScope="city:tokyo"
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

    expect(
      screen.getByRole('table', {
        name: '温暖地向けの推奨一覧（基準週: 2024-W10）',
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('対象地域: 温暖地')).toBeInTheDocument()
    expect(screen.getByText('基準週: 2024-W10')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ: 葉菜類（東京）')).toBeInTheDocument()

    queryClient.clear()
  })
})
