import '@testing-library/jest-dom/vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  recommendationControllerMocks,
  resetRecommendationControllerMocks,
} from '../../utils/recommendations'

const fetchQueryMock = vi.fn()
const flushSpy = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      fetchQuery: fetchQueryMock,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    }),
  }
})
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>()
  const actualFlushSync = actual.flushSync
  return {
    ...actual,
    flushSync: (...args: Parameters<typeof actualFlushSync>) => {
      flushSpy(...args)
      return actualFlushSync(...args)
    },
  }
})
import type { RecommendationItem } from '../../utils/recommendations'
import { useRecommendationLoader } from '../../../src/hooks/useRecommendationLoader'

describe('hooks / useRecommendationLoader', () => {
  const { fetcherMock } = recommendationControllerMocks

  beforeEach(() => {
    resetRecommendationControllerMocks()
    fetchQueryMock.mockReset()
    fetchQueryMock.mockImplementation(async (options: unknown) => {
      if (typeof options === 'function') {
        return options()
      }
      const typed = options as { queryFn: () => Promise<unknown> }
      return typed.queryFn()
    })
  })

  it('normalizes week input before requesting recommendations', async () => {
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W30', items: [] },
      isMarketFallback: false,
    })
    const { result } = renderHook(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalled()
    })

    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W24', items: [] },
      isMarketFallback: false,
    })

    await act(async () => {
      await result.current.requestRecommendations('2024/6/12')
    })

    expect(fetcherMock).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'temperate',
        week: '2024-W24',
        marketScope: 'national',
        category: 'leaf',
      }),
    )
    expect(result.current.activeWeek).toBe('2024-W24')
    expect(result.current.currentWeek).toBe('2024-W24')
  })

  it('retains cached items when fetcher rejects', async () => {
    const initialItem: RecommendationItem = {
      crop: '春菊',
      sowing_week: '2024-W30',
      harvest_week: '2024-W35',
      source: 'local-db',
      growth_days: 40,
    }
    fetcherMock.mockResolvedValueOnce({
      result: { week: '2024-W30', items: [initialItem] },
      isMarketFallback: false,
    })
    fetcherMock.mockRejectedValueOnce(new Error('network error'))

    const { result } = renderHook(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1)
    })

    await act(async () => {
      await result.current.requestRecommendations('2024-W31')
    })

    expect(result.current.items).toEqual([initialItem])
    expect(result.current.activeWeek).toBe('2024-W30')
  })

  it('tracks selected market/category and uses them in the cache key', async () => {
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W30', items: [] },
      isMarketFallback: false,
    })

    const { result } = renderHook(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await waitFor(() => {
      expect(fetchQueryMock).toHaveBeenCalled()
    })

    const [initialOptions] = fetchQueryMock.mock.calls[0] as [{ queryKey: unknown[] }]
    expect(initialOptions.queryKey).toEqual([
      'recommendations',
      'temperate',
      'national',
      'leaf',
      expect.any(String),
    ])
    expect(result.current.selectedMarket).toBe('national')
    expect(result.current.selectedCategory).toBe('leaf')

    fetchQueryMock.mockClear()
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W31', items: [] },
      isMarketFallback: false,
    })

    await act(async () => {
      await result.current.requestRecommendations('2024-W31', {
        marketScopeOverride: 'city:kyoto',
        categoryOverride: 'root',
      })
    })

    const [overrideOptions] = fetchQueryMock.mock.calls[0] as [{ queryKey: unknown[] }]
    expect(overrideOptions.queryKey).toEqual([
      'recommendations',
      'temperate',
      'city:kyoto',
      'root',
      '2024-W31',
    ])
    expect(result.current.selectedMarket).toBe('city:kyoto')
    expect(result.current.selectedCategory).toBe('root')
  })

  it('does not rely on flushSync when applying fetched results', async () => {
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W30', items: [] },
      isMarketFallback: false,
    })

    const { result } = renderHook(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await waitFor(() => {
      expect(result.current.currentWeek).toBe('2024-W30')
    })

    expect(flushSpy).not.toHaveBeenCalled()
  })
})
