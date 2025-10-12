import '@testing-library/jest-dom/vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import type { FormEvent, ReactNode } from 'react'

import {
  recommendationControllerMocks,
  resetRecommendationControllerMocks,
} from '../../utils/recommendations'
import { useRecommendations } from '../../../src/hooks/useRecommendations'

const createQueryClientWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient, children })
}

const renderWithQueryClient = <Result>(callback: () => Result) =>
  renderHook(callback, { wrapper: createQueryClientWrapper() })

describe('hooks / useRecommendations controller', () => {
  const { fetcherMock } = recommendationControllerMocks

  beforeEach(() => {
    resetRecommendationControllerMocks()
  })

  it('updates region via handleSubmit and requests override region', async () => {
    fetcherMock.mockResolvedValue({ week: '2024-W30', items: [] })
    const { result } = renderWithQueryClient(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalledWith(
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({ week: '2024-W32', items: [] })

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
    fetcherMock.mockResolvedValue({ week: '2024-W30', items: [] })

    const { result } = renderWithQueryClient(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate', initialCategory: 'leaf' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalled()
    })

    expect(result.current.selectedMarket).toBe('national')
    expect(result.current.selectedCategory).toBe('leaf')

    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({ week: '2024-W31', items: [] })

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
})
