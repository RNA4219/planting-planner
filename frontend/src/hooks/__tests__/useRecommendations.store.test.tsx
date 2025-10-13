import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CropCategory, MarketScope } from '../../types'

import { useRecommendations } from '../useRecommendations'
import { resetRecommendationsStore } from '../recommendations/store'

type LoaderArgs = {
  region: string
  marketScope: MarketScope
  category: CropCategory
}

type LoaderResult = {
  queryWeek: string
  setQueryWeek: (next: string) => void
  activeWeek: string
  items: []
  currentWeek: string
  selectedMarket: MarketScope
  selectedCategory: CropCategory
  requestRecommendations: (inputWeek: string) => Promise<void>
  isMarketFallback: boolean
}

const {
  loaderMock,
  setQueryWeekMock,
  requestRecommendationsMock,
} = vi.hoisted(() => {
  const setQueryWeekMockImpl = vi.fn<(next: string) => void>()
  const requestRecommendationsMockImpl = vi.fn<LoaderResult['requestRecommendations']>().mockResolvedValue()
  const loaderMockImpl = vi.fn((args: LoaderArgs): LoaderResult => {
    void args
    return {
      queryWeek: '2099-W52',
      setQueryWeek: setQueryWeekMockImpl,
      activeWeek: '2099-W52',
      items: [],
      currentWeek: '2099-W52',
      selectedMarket: 'national',
      selectedCategory: 'leaf',
      requestRecommendations: requestRecommendationsMockImpl,
      isMarketFallback: false,
    }
  })
  return {
    loaderMock: loaderMockImpl,
    setQueryWeekMock: setQueryWeekMockImpl,
    requestRecommendationsMock: requestRecommendationsMockImpl,
  }
})

type CropCatalogResult = {
  catalog: Map<string, { id: number; category?: CropCategory }>
}

vi.mock('../recommendations/loader', () => ({
  useRecommendationLoader: loaderMock,
}))

vi.mock('../useCropCatalog', () => ({
  useCropCatalog: (): CropCatalogResult => ({ catalog: new Map() }),
}))

describe('useRecommendations store integration', () => {
  beforeEach(() => {
    resetRecommendationsStore()
    loaderMock.mockClear()
    setQueryWeekMock.mockClear()
    requestRecommendationsMock.mockClear()
  })

  it('shares market scope and category across multiple hook instances', () => {
    const first = renderHook(() => useRecommendations({ favorites: [] }))

    const fruitCategory: CropCategory = 'fruit'

    act(() => {
      first.result.current.setMarketScope('city:kyoto')
      first.result.current.setCategory(fruitCategory)
    })

    const second = renderHook(() => useRecommendations({ favorites: [] }))

    expect(second.result.current.marketScope).toBe('city:kyoto')
    expect(second.result.current.category).toBe(fruitCategory)

    first.unmount()
    second.unmount()

    const third = renderHook(() => useRecommendations({ favorites: [] }))

    expect(third.result.current.marketScope).toBe('city:kyoto')
    expect(third.result.current.category).toBe(fruitCategory)
  })
})
