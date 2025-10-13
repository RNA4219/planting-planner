import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { renderHookWithQueryClient } from '../../../tests/utils/renderHookWithQueryClient'
import {
  createDeferred,
  fetchCropsMock,
  fetchRecommendationsMock,
  setupFetchQueryMock,
} from '../../../tests/utils/hooks/recommendationLoader'

import { useRecommendationLoader } from '../useRecommendationLoader'

describe('useRecommendationLoader', () => {
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
    setupFetchQueryMock()
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

  it('requestRecommendations は日付形式 (YYYY-MM-DD) を ISO 週へ変換して API へ渡す', async () => {
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

  it('requestRecommendations は日付形式 (YYYY/MM/DD) を ISO 週へ変換して API へ渡す', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('2024/07/01')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith(
      'temperate',
      '2024-W27',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })

  it('requestRecommendations は 6 桁の数値入力を最終週へクランプして API へ渡す', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()

    await act(async () => {
      await result.current.requestRecommendations('202460')
    })

    expect(fetchRecommendationsMock).toHaveBeenCalledWith(
      'temperate',
      '2024-W53',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })

  it('API が不正な週を返した場合でも activeWeek はリクエスト週を保持する', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    fetchRecommendationsMock.mockClear()
    fetchRecommendationsMock.mockImplementationOnce(async () => ({
      week: 'invalid',
      region: 'temperate',
      items: [],
      isMarketFallback: false,
    }))

    await act(async () => {
      await result.current.requestRecommendations('2024-W10')
    })

    expect(result.current.activeWeek).toBe('2024-W10')
  })

  it('並列実行時に古いリクエスト結果を無視する', async () => {
    const initial = createDeferred<Awaited<ReturnType<typeof fetchRecommendationsMock>>>()
    const first = createDeferred<Awaited<ReturnType<typeof fetchRecommendationsMock>>>()
    const second = createDeferred<Awaited<ReturnType<typeof fetchRecommendationsMock>>>()

    fetchRecommendationsMock.mockReset()
    fetchRecommendationsMock
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const { result } = renderHookWithQueryClient(() =>
      useRecommendationLoader({ region: 'temperate', marketScope: 'national', category: 'leaf' }),
    )

    await act(async () => {
      initial.resolve({
        week: '2024-W05',
        region: 'temperate',
        items: [],
        isMarketFallback: false,
      })
      await initial.promise
    })

    await act(async () => {
      const pendingFirst = result.current.requestRecommendations('2024-W06')
      const pendingSecond = result.current.requestRecommendations('2024-W07')

      second.resolve({
        week: '2024-W07',
        region: 'temperate',
        items: [],
        isMarketFallback: false,
      })
      await pendingSecond

      first.resolve({
        week: '2024-W06',
        region: 'temperate',
        items: [],
        isMarketFallback: false,
      })
      await pendingFirst
    })

    expect(result.current.activeWeek).toBe('2024-W07')
  })
})
