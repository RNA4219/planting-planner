import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PriceSeries, RecommendResponse } from '../types'
import type { MarketScopeOption } from '../constants/marketScopes'
import type { RecommendResponseWithFallback } from './api'

type FetchRecommend = typeof import('./api')['fetchRecommend']
type FetchRecommendations = typeof import('./api')['fetchRecommendations']
type FetchPrice = typeof import('./api')['fetchPrice']
type FetchMarkets = typeof import('./api')['fetchMarkets']

let fetchRecommend: FetchRecommend
let fetchRecommendations: FetchRecommendations
let fetchPrice: FetchPrice
let fetchMarkets: FetchMarkets
let apiEndpoint: string

describe('fetchRecommend', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.resetModules()
    apiEndpoint = '/api'
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const loadFetchRecommend = async () => {
    vi.stubEnv('VITE_API_ENDPOINT', apiEndpoint)
    ;({ fetchRecommend } = await import('./api'))
  }

  it('request を通じて /recommend エンドポイントへ GET する', async () => {
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchRecommend()
    const result = await fetchRecommend({ region: 'temperate', week: '2024-W30' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/recommend?region=temperate&week=2024-W30',
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
    expect(result).toEqual(payload)
  })

  it('絶対 URL のエンドポイントでも同一ホストの /recommend へフォールバックする', async () => {
    apiEndpoint = 'https://api.example.com/v1'
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchRecommend()
    const result = await fetchRecommend({ region: 'temperate', week: '2024-W30' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/recommend?region=temperate&week=2024-W30',
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
    expect(result).toEqual(payload)
  })

  it('includePrefix=false でも API エンドポイントのオリジンを維持する', async () => {
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const originalEndpoint = import.meta.env.VITE_API_ENDPOINT
    vi.resetModules()
    ;(import.meta.env as Record<string, string | undefined>).VITE_API_ENDPOINT =
      'https://api.example.com/v1'

    try {
      ;({ fetchRecommend } = await import('./api'))
      const result = await fetchRecommend({ region: 'temperate', week: '2024-W30' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/recommend?region=temperate&week=2024-W30',
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
      expect(result).toEqual(payload)
    } finally {
      vi.resetModules()
      ;(import.meta.env as Record<string, string | undefined>).VITE_API_ENDPOINT =
        originalEndpoint
    }
  })

  it('レスポンスが失敗した場合は例外を送出する', async () => {
    fetchMock.mockResolvedValue(
      new Response('internal error', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    )

    await loadFetchRecommend()
    await expect(fetchRecommend({ region: 'temperate' })).rejects.toThrow(
      'internal error',
    )
  })
})

describe('fetchRecommendations', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.resetModules()
    apiEndpoint = '/api'
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const loadFetchRecommendations = async () => {
    vi.stubEnv('VITE_API_ENDPOINT', apiEndpoint)
    ;({ fetchRecommendations } = await import('./api'))
  }

  it('marketScope クエリを送信する', async () => {
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchRecommendations()
    const result = await fetchRecommendations('temperate', '2024-W30', {
      marketScope: 'national',
      category: 'leaf',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    if (!call) {
      throw new Error('fetch が呼び出されていません')
    }
    const requestUrl = new URL(call[0] as string, 'https://dummy')
    expect(requestUrl.pathname).toBe('/api/recommend')
    expect(requestUrl.searchParams.get('marketScope')).toBe('national')
    expect(requestUrl.searchParams.get('category')).toBe('leaf')
    expect(result).toEqual({ ...payload, isMarketFallback: false })
  })

  it('x-market-fallback ヘッダーが true の場合に isMarketFallback を true として返す', async () => {
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-market-fallback': 'true',
        },
      }),
    )

    await loadFetchRecommendations()
    const result = await fetchRecommendations('temperate', '2024-W30', {
      marketScope: 'national',
      category: 'leaf',
    })

    const expected: RecommendResponseWithFallback = {
      ...payload,
      isMarketFallback: true,
    }
    expect(result).toEqual(expected)
  })
})

describe('fetchPrice', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.resetModules()
    apiEndpoint = '/api'
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const loadFetchPrice = async () => {
    vi.stubEnv('VITE_API_ENDPOINT', apiEndpoint)
    ;({ fetchPrice } = await import('./api'))
  }

  it('marketScope 引数をクエリへ反映する', async () => {
    const payload: PriceSeries = {
      crop_id: 1,
      crop: 'Spinach',
      unit: 'kg',
      source: 'test',
      prices: [],
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchPrice()
    const result = await fetchPrice(1, undefined, undefined, 'national')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    if (!call) {
      throw new Error('fetch が呼び出されていません')
    }
    const requestUrl = new URL(call[0] as string, 'https://dummy')
    expect(requestUrl.pathname).toBe('/api/price')
    expect(requestUrl.searchParams.get('marketScope')).toBe('national')
    expect(result).toEqual(payload)
  })
})

describe('fetchMarkets', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.resetModules()
    apiEndpoint = '/api'
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const loadFetchMarkets = async () => {
    vi.stubEnv('VITE_API_ENDPOINT', apiEndpoint)
    ;({ fetchMarkets } = await import('./api'))
  }

  it('markets エンドポイントのレスポンスを返す', async () => {
    const payload: { markets: MarketScopeOption[]; generated_at: string } = {
      markets: [
        { value: 'national', label: '全国平均（API）' },
        { value: 'city:fukuoka', label: '福岡市中央卸売（API）' },
      ],
      generated_at: '2024-05-01T00:00:00Z',
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchMarkets()
    const result = await fetchMarkets()

    expect(fetchMock).toHaveBeenCalledWith('/api/markets', {
      headers: { 'Content-Type': 'application/json' },
    })
    expect(result).toEqual(payload)
  })

  it('503 の場合は利用不可メッセージで例外を投げる', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { status: 503, statusText: 'Service Unavailable' }),
    )

    await loadFetchMarkets()

    await expect(fetchMarkets()).rejects.toThrow(
      '市場一覧 API は現在利用できません (503)',
    )
  })
})
