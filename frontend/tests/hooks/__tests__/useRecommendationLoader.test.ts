import '@testing-library/jest-dom/vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  recommendationControllerMocks,
  resetRecommendationControllerMocks,
} from '../../utils/recommendations'
import type { RecommendationItem } from '../../utils/recommendations'
import { useRecommendationLoader } from '../../../src/hooks/useRecommendationLoader'

describe('hooks / useRecommendationLoader', () => {
  const { fetcherMock } = recommendationControllerMocks

  beforeEach(() => {
    resetRecommendationControllerMocks()
  })

  it('normalizes week input before requesting recommendations', async () => {
    fetcherMock.mockResolvedValue({ week: '2024-W30', items: [] })
    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalled()
    })

    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({ week: '2024-W24', items: [] })

    await act(async () => {
      await result.current.requestRecommendations('2024/6/12')
    })

    expect(fetcherMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'temperate', week: '2024-W24' }),
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

    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1)
    })

    await act(async () => {
      await result.current.requestRecommendations('2024-W31')
    })

    expect(result.current.items).toEqual([])
    expect(result.current.activeWeek).toBe('2024-W31')
  })
})
