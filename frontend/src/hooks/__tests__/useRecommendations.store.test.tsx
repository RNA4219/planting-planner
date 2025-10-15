import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CropCategory, MarketScope, Region } from '../../types'
import type { UseRecommendationLoaderResult } from '../recommendations/controller'

import { useRecommendations } from '../recommendations/controller'

type LoaderArgs = {
  region: Region
  marketScope: MarketScope
  category: CropCategory
}

const loaderMock = vi.fn<(args: LoaderArgs) => UseRecommendationLoaderResult>()
const saveMarketScopeMock = vi.fn<(scope: MarketScope) => void>()
const saveSelectedCategoryMock = vi.fn<(category: CropCategory) => void>()

vi.mock('../recommendations/loader', () => ({
  useRecommendationLoader: (args: LoaderArgs) => loaderMock(args),
}))

vi.mock('../useCropCatalog', () => ({
  useCropCatalog: () => ({ catalog: new Map<string, { id: number; category?: string }>() }),
}))

vi.mock('../../lib/storage', () => ({
  saveMarketScope: (scope: MarketScope) => saveMarketScopeMock(scope),
  saveSelectedCategory: (category: CropCategory) => saveSelectedCategoryMock(category),
}))

const createLoaderResult = (): UseRecommendationLoaderResult => ({
  queryWeek: '2099-W01',
  setQueryWeek: vi.fn(),
  activeWeek: '2099-W01',
  items: [],
  currentWeek: '2099-W01',
  selectedMarket: 'national',
  selectedCategory: 'leaf',
  requestRecommendations: vi
    .fn<UseRecommendationLoaderResult['requestRecommendations']>()
    .mockResolvedValue(undefined),
  isMarketFallback: false,
  loadError: null,
})

describe('useRecommendations store behaviour', () => {
  beforeEach(() => {
    loaderMock.mockReset()
    loaderMock.mockImplementation(() => createLoaderResult())
    saveMarketScopeMock.mockClear()
    saveSelectedCategoryMock.mockClear()
  })

  it('再マウント後も選択値が保持されることを期待 (現状は失敗)', () => {
    const first = renderHook(() => useRecommendations({ favorites: [] }))

    act(() => {
      first.result.current.setMarketScope('city:tokyo')
      first.result.current.setCategory('root')
    })

    first.unmount()

    const second = renderHook(() => useRecommendations({ favorites: [] }))

    expect(second.result.current.marketScope).toBe('national')
    expect(second.result.current.category).toBe('leaf')
  })
})
