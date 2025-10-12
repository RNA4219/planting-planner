import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { RecommendationsTable } from '../../src/components/RecommendationsTable'
import type { RecommendationRow } from '../../src/hooks/useRecommendations'

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
  test('テーブルには地域と基準週の説明が付与される', () => {
    render(
      <RecommendationsTable
        region="temperate"
        displayWeek="2024-W30"
        rows={createRows()}
        selectedCropId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
      />,
    )

    expect(
      screen.getByRole('table', {
        name: '温暖地向けの推奨一覧（基準週: 2024-W30）',
      }),
    ).toBeInTheDocument()
  })
})
