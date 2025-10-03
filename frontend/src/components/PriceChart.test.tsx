import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PriceChart } from './PriceChart'

type FetchPrice = typeof import('../lib/api')['fetchPrice']
type FetchPriceMock = ReturnType<typeof vi.fn<FetchPrice>>

const fetchPrice = vi.hoisted(() => vi.fn<FetchPrice>()) as FetchPriceMock

vi.mock('../lib/api', () => ({
  fetchPrice,
}))

describe('PriceChart', () => {
  beforeEach(() => {
    fetchPrice.mockReset()
  })

  it('作物選択直後は価格データ未取得メッセージを表示しない', async () => {
    fetchPrice.mockReturnValue(new Promise(() => {}) as ReturnType<FetchPrice>)

    render(<PriceChart cropId={1} />)

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalledWith(1, undefined, undefined)
    })

    expect(screen.queryByText('価格データがありません。')).not.toBeInTheDocument()
    expect(screen.getByText('価格データを読み込み中です…')).toBeInTheDocument()
  })
})
