import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createDeferred,
  fetchRecommendationsMock,
  resetRecommendationMocks,
} from './useRecommendations.test-helpers'

import type { RecommendResponse } from '../../types'
import { useRecommendationLoader } from '../useRecommendationLoader'

describe('useRecommendationLoader', () => {
  beforeEach(() => {
    resetRecommendationMocks()
    fetchRecommendationsMock.mockImplementationOnce(async () => ({
      week: '2099-W52',
      region: 'temperate',
      items: [],
    }))
    fetchRecommendationsMock.mockImplementation(async () => ({
      week: '2024-W06',
      region: 'temperate',
      items: [],
    }))
  })

  it('requestRecommendations は入力週を ISO 形式に正規化して API へ渡す', async () => {
    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('2024-W6')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith('temperate', '2024-W06')
  })

  it('requestRecommendations は日付形式 (YYYY-MM-DD) を ISO 週へ変換して API へ渡す', async () => {
    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('2024-07-01')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith('temperate', '2024-W27')
  })

  it('requestRecommendations は日付形式 (YYYY/MM/DD) を ISO 週へ変換して API へ渡す', async () => {
    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('2024/07/01')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith('temperate', '2024-W27')
  })

  it('requestRecommendations は 6 桁の数値入力を最終週へクランプして API へ渡す', async () => {
    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('202460')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith('temperate', '2024-W53')
  })

  it('API が不正な週を返した場合でも activeWeek はリクエスト週を保持する', async () => {
    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()
    fetchRecommendationsMock.mockImplementationOnce(async () => ({
      week: 'invalid',
      region: 'temperate',
      items: [],
    }))

    await act(async () => {
      await result.current.requestRecommendations('2024-W10')
    })

    expect(result.current.activeWeek).toBe('2024-W10')
  })

  it('並列実行時に古いリクエスト結果を無視する', async () => {
    const initial = createDeferred<RecommendResponse>()
    const first = createDeferred<RecommendResponse>()
    const second = createDeferred<RecommendResponse>()

    fetchRecommendationsMock.mockReset()
    fetchRecommendationsMock
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const { result } = renderHook(() => useRecommendationLoader('temperate'))

    await act(async () => {
      initial.resolve({
        week: '2024-W05',
        region: 'temperate',
        items: [],
      })
      await initial.promise
    })

    const latestItems = [
      {
        crop: 'latest crop',
        sowing_week: '2024-W02',
        harvest_week: '2024-W12',
        source: 'test',
        growth_days: 60,
      },
    ]

    await act(async () => {
      const pendingFirst = result.current.requestRecommendations('2024-W01')
      const pendingSecond = result.current.requestRecommendations('2024-W02')

      second.resolve({
        week: '2024-W02',
        region: 'temperate',
        items: latestItems,
      })
      await pendingSecond

      first.resolve({
        week: '2024-W01',
        region: 'temperate',
        items: [
          {
            crop: 'stale crop',
            sowing_week: '2024-W01',
            harvest_week: '2024-W11',
            source: 'test',
            growth_days: 55,
          },
        ],
      })
      await pendingFirst
    })

    expect(result.current.activeWeek).toBe('2024-W02')
    expect(result.current.items).toEqual(latestItems)
  })
})
