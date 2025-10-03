import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PriceChart } from './PriceChart'
import { fetchPrice } from '../lib/api'

vi.mock('../lib/api', () => ({
  fetchPrice: vi.fn(),
}))

describe('PriceChart', () => {
  const createDeferred = <T,>() => {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  it('選択直後は未取得メッセージを表示しない', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchPrice>>>()
    vi.mocked(fetchPrice).mockReturnValue(deferred.promise as never)

    render(<PriceChart cropId={1} />)

    expect(screen.queryByText('価格データがありません。')).toBeNull()

    deferred.resolve({ crop_id: 1, crop: 'だみー', unit: 'kg', source: 'test', prices: [] })
    await screen.findByText('価格データがありません。')
  })
})
