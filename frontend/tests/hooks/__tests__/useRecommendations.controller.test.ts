import '@testing-library/jest-dom/vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormEvent } from 'react'

import {
  recommendationControllerMocks,
  resetRecommendationControllerMocks,
} from '../../utils/recommendations'
import {
  saveMarketScope as saveMarketScopeMock,
  saveSelectedCategory as saveSelectedCategoryMock,
} from '../../utils/mocks/storage'
import { useRecommendations } from '../../../src/hooks/recommendations/controller'
import { renderHookWithQueryClient } from '../../utils/renderHookWithQueryClient'

const fetchQueryMock = vi.fn()

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

describe('hooks / useRecommendations controller', () => {
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
    saveMarketScopeMock.mockClear()
    saveSelectedCategoryMock.mockClear()
  })

  it('updates region via handleSubmit and requests override region', async () => {
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W30', items: [] },
      isMarketFallback: false,
    })
    const { result } = renderHook(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalledWith(
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W32', items: [] },
      isMarketFallback: false,
    })

    const event = {
      preventDefault: () => {},
      currentTarget: {
        elements: {
          namedItem: (name: string) => {
            if (name === 'week') {
              return { value: '2024-W31' }
            }
            if (name === 'region') {
              return { value: 'warm' }
            }
            return null
          },
        },
      },
    } as unknown as FormEvent<HTMLFormElement>

    await act(async () => {
      await result.current.handleSubmit(event)
    })

    expect(result.current.region).toBe('warm')
    expect(fetcherMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'warm', week: '2024-W31' }),
    )
  })

  it('exposes selected market/category synced with controller setters', async () => {
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W30', items: [] },
      isMarketFallback: false,
    })

    const { result } = renderHookWithQueryClient(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate', initialCategory: 'leaf' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalled()
    })

    expect(result.current.selectedMarket).toBe('national')
    expect(result.current.selectedCategory).toBe('leaf')

    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W31', items: [] },
      isMarketFallback: false,
    })

    await act(async () => {
      result.current.setMarketScope('city:osaka')
      result.current.setCategory('flower')
    })

    expect(result.current.selectedMarket).toBe('city:osaka')
    expect(result.current.selectedCategory).toBe('flower')

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalledWith(
        expect.objectContaining({ marketScope: 'city:osaka', category: 'flower' }),
      )
    })

    expect(result.current.selectedMarket).toBe('city:osaka')
    expect(result.current.selectedCategory).toBe('flower')
  })

  it('persists controller selections only when they change', async () => {
    fetcherMock.mockResolvedValue({
      result: { week: '2024-W30', items: [] },
      isMarketFallback: false,
    })

    const { result } = renderHookWithQueryClient(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate', initialCategory: 'leaf' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalled()
    })

    await act(async () => {
      result.current.setMarketScope('city:tokyo')
      result.current.setCategory('flower')
    })

    expect(saveMarketScopeMock).toHaveBeenCalledTimes(1)
    expect(saveMarketScopeMock).toHaveBeenCalledWith('city:tokyo')
    expect(saveSelectedCategoryMock).toHaveBeenCalledTimes(1)
    expect(saveSelectedCategoryMock).toHaveBeenCalledWith('flower')

    await act(async () => {
      result.current.setMarketScope('city:tokyo')
      result.current.setCategory('flower')
    })

    expect(saveMarketScopeMock).toHaveBeenCalledTimes(1)
    expect(saveSelectedCategoryMock).toHaveBeenCalledTimes(1)
  })
})
