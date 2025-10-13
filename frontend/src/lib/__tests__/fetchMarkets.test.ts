import { describe, expect, it } from 'vitest'

import {
  fromMarketScopeApiDefinition,
  toMarketScopeOption,
  type MarketScopeApiDefinition,
} from '../../constants/marketScopes'
import { createApiTestContext } from './apiTestContext'

type FetchMarkets = typeof import('../api')['fetchMarkets']

describe('fetchMarkets', () => {
  const context = createApiTestContext()
  let fetchMarkets: FetchMarkets

  const loadFetchMarkets = async () => {
    ;({ fetchMarkets } = await context.loadApiModule())
  }

  it('markets エンドポイントのレスポンスを返す', async () => {
    const payload: { markets: MarketScopeApiDefinition[]; generated_at: string } = {
      markets: [
        {
          scope: 'national',
          display_name: '全国平均（API）',
          theme: { token: 'api-national', hex_color: '#123456', text_color: '#FFFFFF' },
        },
        {
          scope: 'city:fukuoka',
          display_name: '福岡市中央卸売（API）',
          theme: { token: 'api-fukuoka', hex_color: '#654321', text_color: '#FFFFFF' },
        },
      ],
      generated_at: '2024-05-01T00:00:00Z',
    }
    context.fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchMarkets()
    const result = await fetchMarkets()

    expect(context.fetchMock).toHaveBeenCalledWith('/api/markets', {
      headers: { 'Content-Type': 'application/json' },
    })
    expect(result).toEqual({
      generated_at: payload.generated_at,
      markets: payload.markets
        .map(fromMarketScopeApiDefinition)
        .map(toMarketScopeOption),
    })
  })

  it('503 の場合は利用不可メッセージで例外を投げる', async () => {
    context.fetchMock.mockResolvedValue(
      new Response('', { status: 503, statusText: 'Service Unavailable' }),
    )

    await loadFetchMarkets()

    await expect(fetchMarkets()).rejects.toThrow('市場一覧 API は現在利用できません (503)')
  })
})
