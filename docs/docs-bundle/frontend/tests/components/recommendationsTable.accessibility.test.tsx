import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import { RecommendationsTable } from '../../src/components/RecommendationsTable'
import type { RecommendationRow } from '../../src/hooks/recommendations/controller'

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['markets'], {
    markets: [],
    generated_at: '1970-01-01T00:00:00Z',
  })
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
  return { ...result, queryClient }
}

const createRows = (): RecommendationRow[] => [
  {
    crop: '春菊',
    sowing_week: '2024-W30',
    harvest_week: '2024-W35',
    source: 'local-db',
    growth_days: 42,
    rowKey: '春菊-2024-W30-2024-W35',
    sowingWeekLabel: '2024-W30',
    harvestWeekLabel: '2024-W35',
    cropId: 1,
    category: 'leaf',
  },
]

describe('RecommendationsTable', () => {
  afterEach(() => {
    cleanup()
  })

  test('テーブルには地域と基準週の説明が付与される', () => {
    const { queryClient } = renderWithQueryClient(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W30"
        rows={createRows()}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        marketScope="national"
      />,
    )

    expect(
      screen.getByRole('table', {
        name: '温暖地向けの推奨一覧（基準週: 2024-W30）',
      }),
    ).toBeInTheDocument()
    queryClient.clear()
  })

  test('市場スコープに応じたテーマクラスが付与される', () => {
    const { queryClient } = renderWithQueryClient(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W30"
        rows={createRows()}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        marketScope="city:tokyo"
      />,
    )

    const cards = screen.getAllByTestId('recommendation-card')
    expect(cards).not.toHaveLength(0)
    for (const card of cards) {
      expect(card).toHaveClass('card-market')
      expect(card).toHaveClass('bg-market-city')
    }
    queryClient.clear()
  })
})
