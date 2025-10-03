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
})
