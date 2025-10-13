import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { RecommendationsTable } from '../RecommendationsTable'
import type { RecommendationRow } from '../../hooks/useRecommendations'

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
    const { container } = render(
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

    render(
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
  })

  it('アクセシビリティ属性を維持する', async () => {
    render(
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
  })
})
