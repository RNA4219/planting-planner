import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FormEvent } from 'react'

import { renderHookWithQueryClient } from '../../../tests/utils/renderHookWithQueryClient'
import {
  fetchCropsMock,
  fetchRecommendationsMock,
  setupFetchQueryMock,
} from '../../../tests/utils/hooks/recommendationLoader'

import { useRecommendations } from '../useRecommendations'

describe('useRecommendations', () => {
  beforeEach(() => {
    setupFetchQueryMock()
    fetchRecommendationsMock.mockReset()
    fetchCropsMock.mockReset()
  })

  it('favorites を優先した並びと既存 API を維持する', async () => {
    fetchCropsMock.mockResolvedValueOnce([
      { id: 1, name: 'Carrot', category: 'root' },
      { id: 2, name: 'Tomato', category: 'flower' },
    ])
    fetchRecommendationsMock.mockResolvedValueOnce({
      week: '2024-W05',
      region: 'temperate',
      items: [
        {
          crop: 'Tomato',
          sowing_week: '2024-W06',
          harvest_week: '2024-W16',
          source: 'test',
          growth_days: 70,
        },
        {
          crop: 'Carrot',
          sowing_week: '2024-W04',
          harvest_week: '2024-W14',
          source: 'test',
          growth_days: 60,
        },
      ],
      isMarketFallback: false,
    })

    const { result } = renderHookWithQueryClient(() =>
      useRecommendations({ favorites: [1], initialRegion: 'temperate' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.region).toBe('temperate')
    expect(result.current.currentWeek).toBe('2024-W05')
    expect(result.current.sortedRows.map((row) => row.cropId)).toEqual([1, 2])
    expect(result.current.sortedRows[0]).toMatchObject({
      rowKey: 'Carrot-2024-W04-2024-W14',
      sowingWeekLabel: '2024-W04',
      harvestWeekLabel: '2024-W14',
    })

    await act(async () => {
      result.current.setQueryWeek('2024-W06')
    })

    expect(result.current.queryWeek).toBe('2024-W06')
    expect(typeof result.current.handleSubmit).toBe('function')
  })

  it('setRegion で地域を更新すると現在週のまま再フェッチされる', async () => {
    fetchCropsMock.mockResolvedValueOnce([])
    fetchRecommendationsMock
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'temperate',
        items: [],
        isMarketFallback: false,
      })
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'cold',
        items: [],
        isMarketFallback: false,
      })

    const { result } = renderHookWithQueryClient(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    const initialCall = fetchRecommendationsMock.mock.calls.at(-1)
    expect(initialCall?.[0]).toBe('temperate')
    const baselineWeek = result.current.currentWeek

    await act(async () => {
      result.current.setRegion('cold')
      await Promise.resolve()
    })

    expect(result.current.region).toBe('cold')
    expect(result.current.currentWeek).toBe('2024-W05')
    expect(fetchRecommendationsMock).toHaveBeenLastCalledWith(
      'cold',
      baselineWeek,
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })

  it('reloadCurrentWeek は最後にリクエストした地域・週で再フェッチし参照が安定している', async () => {
    fetchRecommendationsMock.mockReset()
    fetchCropsMock.mockReset()
    fetchCropsMock.mockResolvedValueOnce([])
    fetchRecommendationsMock
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'temperate',
        items: [],
        isMarketFallback: false,
      })
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'cold',
        items: [],
        isMarketFallback: false,
      })
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'cold',
        items: [],
        isMarketFallback: false,
      })

    const { result } = renderHookWithQueryClient(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    const reloadHandle = result.current.reloadCurrentWeek

    await act(async () => {
      result.current.setRegion('cold')
      await Promise.resolve()
    })

    expect(result.current.reloadCurrentWeek).toBe(reloadHandle)
    expect(fetchRecommendationsMock).toHaveBeenLastCalledWith(
      'cold',
      '2024-W05',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await result.current.reloadCurrentWeek()
    })

    expect(fetchRecommendationsMock).toHaveBeenLastCalledWith(
      'cold',
      '2024-W05',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })

  it('handleSubmit で週を変更すると正規化済みの週で再検索される', async () => {
    fetchRecommendationsMock.mockReset()
    fetchCropsMock.mockReset()
    fetchCropsMock.mockResolvedValueOnce([])
    fetchRecommendationsMock
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'temperate',
        items: [],
        isMarketFallback: false,
      })
      .mockResolvedValueOnce({
        week: '2024-W07',
        region: 'temperate',
        items: [],
        isMarketFallback: false,
      })

    const { result } = renderHookWithQueryClient(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    const event = {
      preventDefault: () => {},
      currentTarget: {
        elements: {
          namedItem: (name: string) => {
            if (name === 'week') {
              return { value: '2024-w7' }
            }
            if (name === 'region') {
              return { value: 'temperate' }
            }
            return null
          },
        },
      },
    } as unknown as FormEvent<HTMLFormElement>

    await act(async () => {
      await result.current.handleSubmit(event)
    })

    expect(fetchRecommendationsMock).toHaveBeenLastCalledWith(
      'temperate',
      '2024-W07',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
    expect(result.current.currentWeek).toBe('2024-W07')
    expect(result.current.displayWeek).toBe('2024-W07')
  })

})
