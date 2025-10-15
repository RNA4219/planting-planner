import { describe, expect, it } from 'vitest'

import {
  fromMarketScopeApiDefinition,
  toMarketScopeOption,
  type MarketScopeApiCategory,
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

    expect(context.fetchMock).toHaveBeenCalledTimes(1)
    const call = context.fetchMock.mock.calls[0]
    if (!call) {
      throw new Error('fetch が呼び出されていません')
    }
    const headers = new Headers(call[1]?.headers as HeadersInit)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('x-request-id')).toBeTruthy()
    expect(result).toEqual({
      generated_at: payload.generated_at,
      markets: payload.markets
        .map(fromMarketScopeApiDefinition)
        .map(toMarketScopeOption),
    })
  })

  it('API メタデータを保持する', async () => {
    type MarketScopeApiDefinitionWithMeta = MarketScopeApiDefinition & {
      readonly timezone: string
      readonly priority: number
      readonly effective_from: string
      readonly categories: readonly MarketScopeApiCategory[]
    }

    const payload: {
      markets: MarketScopeApiDefinitionWithMeta[]
      generated_at: string
    } = {
      markets: [
        {
          scope: 'national',
          display_name: '全国平均（API）',
          theme: { token: 'api-national', hex_color: '#123456', text_color: '#FFFFFF' },
          timezone: 'Asia/Tokyo',
          priority: 10,
          effective_from: '2024-01-01',
          categories: [
            {
              category: 'vegetable',
              display_name: '野菜',
              priority: 1,
              source: 'api',
            },
            {
              category: 'fruit',
              display_name: '果物',
              priority: 2,
              source: 'api',
            },
          ],
        },
        {
          scope: 'city:fukuoka',
          display_name: '福岡市中央卸売（API）',
          theme: { token: 'api-fukuoka', hex_color: '#654321', text_color: '#FFFFFF' },
          timezone: 'Asia/Tokyo',
          priority: 20,
          effective_from: '2024-02-01',
          categories: [
            {
              category: 'vegetable',
              display_name: '野菜',
              priority: 1,
              source: 'api',
            },
          ],
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

    expect(result.markets).toContainEqual(
      expect.objectContaining({
        scope: 'national',
        displayName: '全国平均（API）',
        label: '全国平均（API）',
        value: 'national',
        timezone: 'Asia/Tokyo',
        priority: 10,
        effective_from: '2024-01-01',
        categories: [
          {
            category: 'vegetable',
            displayName: '野菜',
            priority: 1,
            source: 'api',
          },
          {
            category: 'fruit',
            displayName: '果物',
            priority: 2,
            source: 'api',
          },
        ],
      }),
    )
    expect(result.markets).toContainEqual(
      expect.objectContaining({
        scope: 'city:fukuoka',
        displayName: '福岡市中央卸売（API）',
        label: '福岡市中央卸売（API）',
        value: 'city:fukuoka',
        timezone: 'Asia/Tokyo',
        priority: 20,
        effective_from: '2024-02-01',
        categories: [
          {
            category: 'vegetable',
            displayName: '野菜',
            priority: 1,
            source: 'api',
          },
        ],
      }),
    )
  })

  it('503 の場合は利用不可メッセージで例外を投げる', async () => {
    context.fetchMock.mockResolvedValue(
      new Response('', { status: 503, statusText: 'Service Unavailable' }),
    )

    await loadFetchMarkets()

    await expect(fetchMarkets()).rejects.toThrow('市場一覧 API は現在利用できません (503)')
  })
})
