import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormEvent } from 'react'

import type { RecommendResponse, Region } from '../types'

import { useRecommendationLoader } from './useRecommendationLoader'
import { useRecommendations } from './useRecommendations'

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

describe('useRecommendations', () => {
  it('favorites を優先した並びと既存 API を維持する', async () => {
    fetchRecommendationsMock.mockReset()
    fetchCropsMock.mockReset()
    fetchCropsMock.mockResolvedValueOnce([
      { id: 1, name: 'Carrot', category: 'root' },
      { id: 2, name: 'Tomato', category: 'fruit' },
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
    })

    const { result } = renderHook(() =>
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
    fetchRecommendationsMock.mockReset()
    fetchCropsMock.mockReset()
    fetchCropsMock.mockResolvedValueOnce([])
    fetchRecommendationsMock
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'temperate',
        items: [],
      })
      .mockResolvedValueOnce({
        week: '2024-W05',
        region: 'cold',
        items: [],
      })

    const { result } = renderHook(() =>
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
    expect(fetchRecommendationsMock).toHaveBeenLastCalledWith('cold', baselineWeek)
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
      })
      .mockResolvedValueOnce({
        week: '2024-W07',
        region: 'temperate',
        items: [],
      })

    const { result } = renderHook(() =>
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

    expect(fetchRecommendationsMock).toHaveBeenLastCalledWith('temperate', '2024-W07')
    expect(result.current.currentWeek).toBe('2024-W07')
    expect(result.current.displayWeek).toBe('2024-W07')
  })
})
