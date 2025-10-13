import { describe, expect, it } from 'vitest'

import type { PriceSeries } from '../api'
import { createApiTestContext } from './apiTestContext'

type FetchPrice = typeof import('../api')['fetchPrice']

describe('fetchPrice', () => {
  const context = createApiTestContext()
  let fetchPrice: FetchPrice

  const loadFetchPrice = async () => {
    ;({ fetchPrice } = await context.loadApiModule())
  }

  it('marketScope 引数をクエリへ反映する', async () => {
    const payload: PriceSeries = {
      crop_id: 1,
      crop: 'Spinach',
      unit: 'kg',
      source: 'test',
      prices: [],
    }
    context.fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchPrice()
    const result = await fetchPrice(1, undefined, undefined, 'national')

    expect(context.fetchMock).toHaveBeenCalledTimes(1)
    const call = context.fetchMock.mock.calls[0]
    if (!call) {
      throw new Error('fetch が呼び出されていません')
    }
    const requestUrl = new URL(call[0] as string, 'https://dummy')
    expect(requestUrl.pathname).toBe('/api/price')
    expect(requestUrl.searchParams.get('marketScope')).toBe('national')
    expect(result).toEqual({
      series: payload,
      isMarketFallback: false,
    })
  })

  it('fallback ヘッダーが true の場合に isMarketFallback を true として返す', async () => {
    const payload: PriceSeries = {
      crop_id: 1,
      crop: 'Spinach',
      unit: 'kg',
      source: 'test',
      prices: [],
    }
    context.fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json', fallback: 'true' },
      }),
    )

    await loadFetchPrice()
    const result = await fetchPrice(1, undefined, undefined, 'national')

    expect(result).toEqual({
      series: payload,
      isMarketFallback: true,
    })
  })
})
