import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecommendResponse } from '../types'

type FetchRecommendations = typeof import('./api')['fetchRecommendations']
type FetchPrice = typeof import('./api')['fetchPrice']

type FetchRecommend = typeof import('./api')['fetchRecommend']

let fetchRecommend: FetchRecommend
let fetchRecommendations: FetchRecommendations
let fetchPrice: FetchPrice
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

  it('marketScope クエリを付与する', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [], week: '2024-W30', region: 'temperate' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchRecommendations()
    await fetchRecommendations('temperate', '2024-W30', {
      marketScope: 'city:tokyo',
      category: 'leaf',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('marketScope=city%3Atokyo'),
      expect.any(Object),
    )
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

  it('marketScope クエリを付与する', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchPrice()
    await fetchPrice(1, undefined, undefined, 'national')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('marketScope=national'),
      expect.any(Object),
    )
  })
})
