import '@testing-library/jest-dom/vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  recommendationControllerMocks,
  resetRecommendationControllerMocks,
} from '../../utils/recommendations'

interface FetchQueryCall {
  readonly queryKey: readonly unknown[]
  readonly queryFn: () => Promise<unknown>
}

const fetchQueryMock = vi.fn(async (options: FetchQueryCall) => options.queryFn())

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    fetchQuery: fetchQueryMock,
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}))
import type { RecommendationItem } from '../../utils/recommendations'
import { useRecommendationLoader } from '../../../src/hooks/useRecommendationLoader'

describe('hooks / useRecommendationLoader', () => {
  const { fetcherMock } = recommendationControllerMocks

  beforeEach(() => {
    resetRecommendationControllerMocks()
    fetchQueryMock.mockReset()
    fetchQueryMock.mockImplementation(async (options: FetchQueryCall) => options.queryFn())
  })

  it('normalizes week input before requesting recommendations', async () => {
    fetcherMock.mockResolvedValue({ week: '2024-W30', items: [] })
    const { result } = renderHook(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalled()
    })

    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({ week: '2024-W24', items: [] })

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

  it('falls back to empty items when fetcher rejects', async () => {
    const initialItem: RecommendationItem = {
      crop: '春菊',
      sowing_week: '2024-W30',
      harvest_week: '2024-W35',
      source: 'local-db',
      growth_days: 40,
    }
    fetcherMock.mockResolvedValueOnce({ week: '2024-W30', items: [initialItem] })
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

    expect(result.current.items).toEqual([])
    expect(result.current.activeWeek).toBe('2024-W31')
  })

  it('tracks selected market/category and uses them in the cache key', async () => {
    fetcherMock.mockResolvedValue({ week: '2024-W30', items: [] })

    const { result } = renderHook(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await waitFor(() => {
      expect(fetchQueryMock).toHaveBeenCalled()
    })

    const initialCall = fetchQueryMock.mock.calls[0]?.[0] as FetchQueryCall | undefined
    expect(initialCall?.queryKey).toEqual([
      'recommendations',
      'temperate',
      'national',
      'leaf',
      expect.any(String),
    ])
    expect(result.current.selectedMarket).toBe('national')
    expect(result.current.selectedCategory).toBe('leaf')

    fetchQueryMock.mockClear()
    fetcherMock.mockResolvedValue({ week: '2024-W31', items: [] })

    await act(async () => {
      await result.current.requestRecommendations('2024-W31', {
        marketScopeOverride: 'city:kyoto',
        categoryOverride: 'root',
      })
    })

    const overrideCall = fetchQueryMock.mock.calls[0]?.[0] as FetchQueryCall | undefined
    expect(overrideCall?.queryKey).toEqual([
      'recommendations',
      'temperate',
      'city:kyoto',
      'root',
      '2024-W31',
    ])
    expect(result.current.selectedMarket).toBe('city:kyoto')
    expect(result.current.selectedCategory).toBe('root')
  })
})
