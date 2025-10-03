import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecommendResponse } from '../types'

describe('fetchRecommend', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_API_ENDPOINT', '/api')
  })

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch
    } else {
      Reflect.deleteProperty(globalThis, 'fetch')
    }
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('sends request through the request helper with query parameters', async () => {
    const responsePayload: RecommendResponse = {
      week: '2024-W10',
      region: 'temperate',
      items: [],
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => responsePayload,
    })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const apiModule = await import('./api')
    const result = await apiModule.fetchRecommend({ region: 'temperate', week: '2024-W10' })

    expect(result).toEqual(responsePayload)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recommend?region=temperate&week=2024-W10',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('throws when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const apiModule = await import('./api')

    await expect(apiModule.fetchRecommend({ region: 'temperate' })).rejects.toThrow('Internal error')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recommend?region=temperate',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
})

describe('useRecommendationLoader fallback', () => {
  afterEach(() => {
    vi.doUnmock('../lib/api')
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('uses fetchRecommend when fetchRecommendations fails', async () => {
    const fetchCropsMock = vi.fn().mockResolvedValue([])
    const initialResponse: RecommendResponse = {
      week: '2024-W05',
      region: 'temperate',
      items: [],
    }
    const fallbackResponse: RecommendResponse = {
      week: '2024-W11',
      region: 'temperate',
      items: [
        {
          crop: 'Carrot',
          sowing_week: '2024-W10',
          harvest_week: '2024-W20',
          source: 'test',
          growth_days: 70,
        },
      ],
    }
    const fetchRecommendationsMock = vi
      .fn()
      .mockResolvedValueOnce(initialResponse)
      .mockRejectedValueOnce(new Error('fail'))
    const fetchRecommendMock = vi.fn().mockResolvedValue(fallbackResponse)

    vi.doMock('../lib/api', async () => {
      const actual = await vi.importActual<typeof import('./api')>('./api')
      return {
        ...actual,
        fetchCrops: fetchCropsMock,
        fetchRecommendations: fetchRecommendationsMock,
        fetchRecommend: fetchRecommendMock,
      }
    })

    const { useRecommendationLoader } = await import('../hooks/useRecommendations')

    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await waitFor(() => {
      expect(fetchRecommendationsMock).toHaveBeenCalled()
    })

    await act(async () => {
      await result.current.requestRecommendations('2024-W11')
    })

    await waitFor(() => {
      expect(fetchRecommendMock).toHaveBeenCalledWith({ region: 'temperate', week: '2024-W11' })
      expect(result.current.activeWeek).toBe('2024-W11')
      expect(result.current.items).toEqual(fallbackResponse.items)
    })
  })
})
