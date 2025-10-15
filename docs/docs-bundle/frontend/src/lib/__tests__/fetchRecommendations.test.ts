import { describe, expect, it } from 'vitest'

import type { RecommendResponse } from '../../types'
import type { RecommendResponseWithFallback } from '../api'
import { createApiTestContext } from './apiTestContext'

type FetchRecommendations = typeof import('../api')['fetchRecommendations']

describe('fetchRecommendations', () => {
  const context = createApiTestContext()
  let fetchRecommendations: FetchRecommendations

  const loadFetchRecommendations = async () => {
    ;({ fetchRecommendations } = await context.loadApiModule())
  }

  it('marketScope クエリを送信する', async () => {
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

    await loadFetchRecommendations()
    const result = await fetchRecommendations('temperate', '2024-W30', {
      marketScope: 'national',
      category: 'leaf',
    })

    expect(context.fetchMock).toHaveBeenCalledTimes(1)
    const call = context.fetchMock.mock.calls[0]
    if (!call) {
      throw new Error('fetch が呼び出されていません')
    }
    const requestUrl = new URL(call[0] as string, 'https://dummy')
    expect(requestUrl.pathname).toBe('/api/recommend')
    expect(requestUrl.searchParams.get('marketScope')).toBe('national')
    expect(requestUrl.searchParams.get('category')).toBe('leaf')
    expect(result).toEqual({ ...payload, isMarketFallback: false })
  })

  it('fallback ヘッダーが true の場合に isMarketFallback を true として返す', async () => {
    const payload: RecommendResponse = {
      week: '2024-W30',
      region: 'temperate',
      items: [],
    }
    context.fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          fallback: 'true',
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
