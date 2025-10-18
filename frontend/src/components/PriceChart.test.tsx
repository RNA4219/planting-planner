import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PriceChart } from './PriceChart'

type FetchPrice = (typeof import('../lib/api'))['fetchPrice']
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

    render(<PriceChart cropId={1} />)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledWith(1, undefined, undefined, 'national')
    })

    expect(screen.queryByText('価格データがありません。')).not.toBeInTheDocument()
    expect(screen.getByText('価格データを読み込み中です…')).toBeInTheDocument()
  })

  it('cropId=0 の場合でも価格データを取得しチャート用ラベルを設定する', async () => {
    fetchPrice.mockResolvedValue({
      series: {
        crop_id: 0,
        crop: 'テスト作物',
        unit: 'kg',
        source: 'テスト',
        prices: [
          { week: '2024-W01', avg_price: 100, stddev: null },
          { week: '2024-W02', avg_price: 200, stddev: null },
        ],
      },
      isMarketFallback: false,
    })

    render(<PriceChart cropId={0} />)

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

  it('marketScope が指定されると fetchPrice の第4引数に渡し、変更時に再取得する', async () => {
    fetchPrice.mockResolvedValue({
      series: {
        crop_id: 1,
        crop: 'テスト作物',
        unit: 'kg',
        source: 'テスト',
        prices: [],
      },
      isMarketFallback: false,
    })

    const { rerender } = render(<PriceChart cropId={1} marketScope="national" />)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledTimes(1)
      expect(fetchPrice).toHaveBeenLastCalledWith(1, undefined, undefined, 'national')
    })

    fetchPrice.mockClear()

    fetchPrice.mockResolvedValue({
      series: {
        crop_id: 1,
        crop: 'テスト作物',
        unit: 'kg',
        source: 'テスト',
        prices: [],
      },
      isMarketFallback: false,
    })

    rerender(<PriceChart cropId={1} marketScope="city:tokyo" />)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledTimes(1)
      expect(fetchPrice).toHaveBeenLastCalledWith(1, undefined, undefined, 'city:tokyo')
    })
  })

  it('fallback データを受け取った場合に警告メッセージを表示する', async () => {
    fetchPrice.mockResolvedValue({
      series: {
        crop_id: 1,
        crop: 'テスト作物',
        unit: 'kg',
        source: 'テスト',
        prices: [],
      },
      isMarketFallback: true,
    })

    render(<PriceChart cropId={1} />)

    const warning = await screen.findByText(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )

    expect(warning).toBeVisible()
    expect(warning).toHaveAttribute('role', 'alert')
  })
})
