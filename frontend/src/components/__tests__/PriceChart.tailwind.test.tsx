import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PriceChart } from '../PriceChart'
import type { MarketScope, PriceSeries } from '../../types'

const { fetchPriceMock } = vi.hoisted(() => ({
  fetchPriceMock: vi.fn<
    (cropId: number, from?: string, to?: string, marketScope?: MarketScope) => Promise<PriceSeries>
  >(),
}))

vi.mock('../../lib/api', () => ({ fetchPrice: fetchPriceMock }))

type StatusCase = { name: string; setup: () => void; resolve: () => HTMLElement | Promise<HTMLElement> }

const statusClassList = 'rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600'.split(' ')
const expectStatusClasses = (element: HTMLElement) => statusClassList.forEach((className) => expect(element).toHaveClass(className))

describe('PriceChart (tailwind)', () => {
  afterEach(() => { cleanup(); fetchPriceMock.mockReset() })

  const cases: StatusCase[] = [
    { name: '作物未選択', setup: () => render(<PriceChart cropId={null} marketScope="national" />), resolve: () => screen.getByRole('status') },
    {
      name: '読み込み中',
      setup: () => {
        fetchPriceMock.mockReturnValue(new Promise(() => {}))
        render(<PriceChart cropId={1} marketScope="national" />)
      },
      resolve: () => screen.getByText('価格データを読み込み中です…'),
    },
    {
      name: 'データなし',
      setup: () => {
        const series: PriceSeries = { crop_id: 1, crop: 'トマト', unit: 'kg', source: 'JA', prices: [] }
        fetchPriceMock.mockResolvedValue(series)
        render(<PriceChart cropId={1} marketScope="national" />)
      },
      resolve: () => screen.findByText('価格データがありません。'),
    },
  ]

  it.each(cases)('%sメッセージに Tailwind の枠線と余白クラスを適用する', async ({ setup, resolve }) => {
    setup()
    const element = (await resolve()) as HTMLElement
    expectStatusClasses(element)
  })

  it('価格チャート表示時にラッパーと見出しへ Tailwind クラスを適用する', async () => {
    const series: PriceSeries = {
      crop_id: 1,
      crop: 'トマト',
      unit: 'kg',
      source: 'JA',
      prices: [
        { week: '2024-W01', avg_price: 1200, stddev: null },
        { week: '2024-W02', avg_price: 1100, stddev: null },
      ],
    }

    fetchPriceMock.mockResolvedValue(series)
    render(<PriceChart cropId={1} marketScope="national" />)
    await waitFor(() => expect(fetchPriceMock).toHaveBeenCalled())

    const figure = await screen.findByRole('figure')
    const heading = screen.getByRole('heading', { level: 4, name: 'トマト (kg)' })
    const caption = screen.getByText('トマト (kg) の週平均価格。期間: 2024-W01 〜 2024-W02。データ点数: 2件。')

    ;['rounded-xl', 'border', 'border-slate-200', 'bg-white', 'p-6', 'shadow-sm'].forEach((className) => expect(figure).toHaveClass(className))
    ;['text-base', 'font-semibold', 'text-slate-900'].forEach((className) => expect(heading).toHaveClass(className))
    ;['mt-4', 'text-sm', 'text-slate-600'].forEach((className) => expect(caption).toHaveClass(className))
  })
})
