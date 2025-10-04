import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecommendResponse, Region } from '../types'

import { useRecommendationLoader } from './useRecommendations'

type FetchRecommendationsMock = (region: Region, week: string) => Promise<RecommendResponse>

const { fetchCropsMock, fetchRecommendationsMock } = vi.hoisted(() => ({
  fetchCropsMock: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  fetchRecommendationsMock: vi.fn<FetchRecommendationsMock>(),
}))

vi.mock('../lib/api', () => ({
  fetchCrops: fetchCropsMock,
  fetchRecommendations: fetchRecommendationsMock,
}))

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useRecommendationLoader', () => {
  beforeEach(() => {
    fetchRecommendationsMock.mockReset()
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
    fetchCropsMock.mockClear()
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
