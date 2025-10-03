import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PriceChart } from './PriceChart'
import { fetchPrice } from '../lib/api'

vi.mock('../lib/api', () => ({
  fetchPrice: vi.fn(),
}))

describe('PriceChart', () => {
  it('選択直後は未取得メッセージを表示しない', () => {
    vi.mocked(fetchPrice).mockReturnValue(new Promise(() => {}) as never)

    render(<PriceChart cropId={1} />)

    expect(screen.queryByText('価格データがありません。')).toBeNull()
  })
})
