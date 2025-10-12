import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PriceChart } from './PriceChart'

type FetchPrice = typeof import('../lib/api')['fetchPrice']
type FetchPriceMock = ReturnType<typeof vi.fn<FetchPrice>>

const fetchPrice = vi.hoisted(() => vi.fn<FetchPrice>()) as FetchPriceMock
const recordLineProps = vi.hoisted(() =>
  vi.fn((props: { data: { labels: string[] } }) => {
    return props
  }),
)

vi.mock('../lib/api', () => ({
  fetchPrice,
}))

vi.mock('react-chartjs-2', () => ({
  Line: (props: { data: { labels: string[] } }) => {
    recordLineProps(props)
    return <div data-testid="price-chart" />
  },
}))

describe('PriceChart', () => {
  beforeEach(() => {
    fetchPrice.mockReset()
    recordLineProps.mockReset()
  })

  it('作物選択直後は価格データ未取得メッセージを表示しない', async () => {
    fetchPrice.mockReturnValue(new Promise(() => {}) as ReturnType<FetchPrice>)

    render(<PriceChart cropId={1} marketScope="national" />)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledWith(1, undefined, undefined, 'national')
    })

    expect(screen.queryByText('価格データがありません。')).not.toBeInTheDocument()
    expect(screen.getByText('価格データを読み込み中です…')).toBeInTheDocument()
  })

  it('cropId=0 の場合でも価格データを取得しチャート用ラベルを設定する', async () => {
    fetchPrice.mockResolvedValue({
      crop_id: 0,
      crop: 'テスト作物',
      unit: 'kg',
      source: 'テスト',
      prices: [
        { week: '2024-W01', avg_price: 100, stddev: null },
        { week: '2024-W02', avg_price: 200, stddev: null },
      ],
    })

    render(<PriceChart cropId={0} marketScope="national" />)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledWith(0, undefined, undefined, 'national')
    })

    await waitFor(() => {
      expect(recordLineProps).toHaveBeenCalled()
      const calls = recordLineProps.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const [lastCall] = calls[calls.length - 1] as [{ data: { labels: string[] } }]
      expect(lastCall.data.labels).toEqual(['2024-W01', '2024-W02'])
    })
  })
})
