import { describe, expect, it, vi } from 'vitest'

import type { RecommendResponse } from '../../types'
import type { RecommendResponseWithFallback } from '../api'
import { createApiTestContext } from './apiTestContext'

type FetchRecommendations = (typeof import('../api'))['fetchRecommendations']
type PostRefresh = (typeof import('../api'))['postRefresh']

describe('fetchRecommendations', () => {
  const context = createApiTestContext()
  let fetchRecommendations: FetchRecommendations
  let postRefresh: PostRefresh

  const loadFetchRecommendations = async () => {
    ;({ fetchRecommendations, postRefresh } = await context.loadApiModule())
  }

  const installCryptoMock = (sequence: readonly string[]) => {
    const randomUUID = vi.fn<() => string>()
    if (sequence.length === 0) {
      randomUUID.mockImplementation(() => 'random-id')
    } else {
      for (const value of sequence) {
        randomUUID.mockImplementationOnce(() => value)
      }
      randomUUID.mockImplementation(() => sequence[sequence.length - 1] ?? 'random-id')
    }
    vi.stubGlobal('crypto', { randomUUID })
    return randomUUID
  }

  const createLocalStorageMock = () => {
    const store = new Map<string, string>()
    return {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key)
      }),
    }
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

  it('x-request-id ヘッダーを送信する', async () => {
    installCryptoMock(['request-id-1'])

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
    await fetchRecommendations('temperate', '2024-W30', {
      marketScope: 'national',
      category: 'leaf',
    })

    const call = context.fetchMock.mock.calls[0]
    if (!call) {
      throw new Error('fetch が呼び出されていません')
    }
    const headers = new Headers(call[1]?.headers as HeadersInit)
    expect(headers.get('x-request-id')).toBe('request-id-1')
  })

  it('postRefresh は Idempotency-Key を保持して送信する', async () => {
    const randomUUID = installCryptoMock(['idempotency-key-1', 'request-id-1', 'request-id-2'])
    const localStorageMock = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)

    const payload = { state: 'running' as const }
    context.fetchMock
      .mockImplementationOnce(
        async () =>
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      )
      .mockImplementationOnce(
        async () =>
          new Response(null, {
            status: 204,
            headers: { 'Content-Type': 'application/json' },
          }),
      )

    await loadFetchRecommendations()
    await postRefresh({})
    await postRefresh({ retry: true })

    expect(randomUUID).toHaveBeenCalledTimes(3)

    const firstCall = context.fetchMock.mock.calls[0]
    const secondCall = context.fetchMock.mock.calls[1]
    if (!firstCall || !secondCall) {
      throw new Error('fetch が呼び出されていません')
    }
    const firstHeaders = new Headers(firstCall[1]?.headers as HeadersInit)
    const secondHeaders = new Headers(secondCall[1]?.headers as HeadersInit)
    expect(firstHeaders.get('Idempotency-Key')).toBe('idempotency-key-1')
    expect(secondHeaders.get('Idempotency-Key')).toBe('idempotency-key-1')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'planting-planner:refresh-idempotency-key',
      'idempotency-key-1',
    )
  })
})
