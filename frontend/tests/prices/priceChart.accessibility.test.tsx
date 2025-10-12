import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { PriceChart } from '../../src/components/PriceChart'

type FetchPrice = typeof import('../../src/lib/api')['fetchPrice']

const { fetchPriceMock } = vi.hoisted(() => ({
  fetchPriceMock: vi.fn<FetchPrice>(),
}))

vi.mock('../../src/lib/api', () => ({
  fetchPrice: fetchPriceMock,
}))

describe('PriceChart のアクセシビリティ', () => {
  test('価格チャートの概要説明を figcaption で提供する', async () => {
    fetchPriceMock.mockResolvedValue({
      crop_id: 1,
      crop: 'トマト',
      unit: 'kg',
      source: 'テスト',
      prices: [
        { week: '2024-W01', avg_price: 100 },
        { week: '2024-W02', avg_price: 120 },
      ],
    })

    render(<PriceChart cropId={1} />)

    await screen.findByRole('heading', { name: 'トマト (kg)' })

    const summary = await screen.findByText(
      'トマト (kg) の週平均価格。期間: 2024-W01 〜 2024-W02。データ点数: 2件。'
    )

    expect(summary.tagName.toLowerCase()).toBe('figcaption')
  })
})
