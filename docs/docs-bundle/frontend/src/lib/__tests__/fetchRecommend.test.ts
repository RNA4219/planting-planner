import { describe, expect, it, vi } from 'vitest'

import type { RecommendResponse } from '../../types'
import { createApiTestContext } from './apiTestContext'

type FetchRecommend = typeof import('../api')['fetchRecommend']

describe('fetchRecommend', () => {
  const context = createApiTestContext()
  let fetchRecommend: FetchRecommend

  const loadFetchRecommend = async () => {
    ;({ fetchRecommend } = await context.loadApiModule())
  }

  it('request を通じて /recommend エンドポイントへ GET する', async () => {
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    context.fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchRecommend()
    const result = await fetchRecommend({ region: 'temperate', week: '2024-W30' })

    expect(context.fetchMock).toHaveBeenCalledWith(
      '/recommend?region=temperate&week=2024-W30',
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
    expect(result).toEqual(payload)
  })

  it('絶対 URL のエンドポイントでも同一ホストの /recommend へフォールバックする', async () => {
    context.setApiEndpoint('https://api.example.com/v1')
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    context.fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await loadFetchRecommend()
    const result = await fetchRecommend({ region: 'temperate', week: '2024-W30' })

    expect(context.fetchMock).toHaveBeenCalledWith(
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
    context.fetchMock.mockResolvedValue(
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
      ;({ fetchRecommend } = await import('../api'))
      const result = await fetchRecommend({ region: 'temperate', week: '2024-W30' })

      expect(context.fetchMock).toHaveBeenCalledWith(
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
    context.fetchMock.mockResolvedValue(
      new Response('internal error', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    )

    await loadFetchRecommend()

    await expect(fetchRecommend({ region: 'temperate' })).rejects.toThrow('internal error')
  })
})
