import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecommendResponseWithFallback } from '../../../src/lib/api'
import { useRecommendationLoader } from '../../../src/hooks/useRecommendationLoader'

import {
  createDeferred,
  fetchCropsMock,
  fetchRecommendationsMock,
  setupFetchQueryMock,
} from './helpers'
import { renderHookWithQueryClient } from '../../utils/renderHookWithQueryClient'

const fetchQueryMock = vi.hoisted(() => vi.fn())
const getQueryDataMock = vi.hoisted(() => vi.fn())
const setQueryDataMock = vi.hoisted(() => vi.fn())
const invalidateQueriesMock = vi.hoisted(() => vi.fn())
const trackMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      fetchQuery: fetchQueryMock,
      getQueryData: getQueryDataMock,
      setQueryData: setQueryDataMock,
      invalidateQueries: invalidateQueriesMock,
    }),
  }
})

vi.mock('../../../src/lib/telemetry', () => ({
  track: trackMock,
}))

describe('hooks/useRecommendations/useRecommendationLoader.behavior', () => {
  beforeEach(() => {
    fetchRecommendationsMock.mockReset()
    fetchRecommendationsMock.mockImplementationOnce(async () => ({
      week: '2099-W52',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    }))
    fetchRecommendationsMock.mockImplementation(async () => ({
      week: '2024-W06',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    }))
    fetchCropsMock.mockClear()
    setupFetchQueryMock(fetchQueryMock)
    getQueryDataMock.mockReset()
    setQueryDataMock.mockReset()
    invalidateQueriesMock.mockReset()
    trackMock.mockReset()
  })

  it('requestRecommendations は入力週を ISO 形式に正規化して API へ渡す', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('2024-W6')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith(
      'temperate',
      '2024-W06',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })

  it('日付形式 (YYYY-MM-DD) を ISO 週へ変換して API へ渡す', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('2024-07-01')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith(
      'temperate',
      '2024-W27',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })

  it('並列実行時に古いリクエスト結果を無視する', async () => {
    const initial = createDeferred<RecommendResponseWithFallback>()
    const first = createDeferred<RecommendResponseWithFallback>()
    const second = createDeferred<RecommendResponseWithFallback>()

    fetchRecommendationsMock.mockImplementationOnce(async () => initial.promise)
    fetchRecommendationsMock.mockImplementationOnce(async () => first.promise)
    fetchRecommendationsMock.mockImplementationOnce(async () => second.promise)

    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      const pending = result.current.requestRecommendations('2024-W10')
      const stalled = result.current.requestRecommendations('2024-W11')
      const latest = result.current.requestRecommendations('2024-W12')

      first.resolve({
        week: '2024-W11',
        region: 'temperate',
        items: [
          {
            crop: 'レタス',
            sowing_week: '2024-W08',
            harvest_week: '2024-W12',
            source: 'local-db',
            growth_days: 30,
          },
        ],
        isMarketFallback: false,
      })

      await stalled

      expect(result.current.activeWeek).toBe('2024-W11')
      expect(result.current.items).toHaveLength(1)

      second.resolve({
        week: '2024-W12',
        region: 'temperate',
        items: [
          {
            crop: '水菜',
            sowing_week: '2024-W09',
            harvest_week: '2024-W13',
            source: 'market-db',
            growth_days: 28,
          },
        ],
        isMarketFallback: true,
      })

      await latest

      expect(result.current.activeWeek).toBe('2024-W12')
      expect(result.current.items).toHaveLength(1)

      initial.resolve({
        week: '2024-W10',
        region: 'temperate',
        items: [
          {
            crop: '春菊',
            sowing_week: '2024-W06',
            harvest_week: '2024-W10',
            source: 'unknown',
            growth_days: 45,
          },
        ],
        isMarketFallback: false,
      })

      await pending
    })

    expect(result.current.activeWeek).toBe('2024-W12')
    expect(result.current.items).toHaveLength(1)
  })

  it('ネットワーク失敗時にキャッシュへフォールバックした場合は prefetch.hit を送信する', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    fetchQueryMock.mockImplementationOnce(async () => {
      throw new Error('network-error')
    })

    await act(async () => {
      await result.current.requestRecommendations('2024-W10')
    })

    expect(trackMock).toHaveBeenCalledTimes(1)
    const [event, payload, requestId] = trackMock.mock.calls[0] ?? []
    expect(event).toBe('prefetch.hit')
    expect(payload).toMatchObject({
      region: 'temperate',
      marketScope: 'national',
      category: 'leaf',
      requestedWeek: '2024-W10',
      resolvedWeek: result.current.activeWeek,
      isMarketFallback: false,
      itemsCount: 0,
    })
    expect(requestId).toBe('2')
  })

  it('キャッシュが無く空配列で終了した場合は prefetch.miss を送信する', async () => {
    fetchQueryMock.mockImplementationOnce(async () => {
      throw new Error('network-error')
    })
    getQueryDataMock.mockReturnValueOnce(undefined)

    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(trackMock).toHaveBeenCalledTimes(1)
    const [event, payload, requestId] = trackMock.mock.calls[0] ?? []
    expect(event).toBe('prefetch.miss')
    expect(payload).toMatchObject({
      region: 'temperate',
      marketScope: 'national',
      category: 'leaf',
      requestedWeek: result.current.activeWeek,
      resolvedWeek: result.current.activeWeek,
      isMarketFallback: false,
      itemsCount: 0,
    })
    expect(requestId).toBe('1')
  })
})
