import { vi } from 'vitest'

import type { FavoritesStorage, Region, RegionStorage } from '../../../src/types'

type MarketScope = 'domestic' | 'global'
type CropCategory = 'all' | 'leaf' | 'root'

interface MarketScopeStorage {
  marketScope: MarketScope
}

interface CategoryStorage {
  category: CropCategory
}

export type StorageState = FavoritesStorage & RegionStorage & MarketScopeStorage & CategoryStorage

export const storageState: StorageState = {
  region: 'temperate',
  marketScope: 'domestic',
  category: 'all',
  favorites: [],
}

export const loadRegion = vi.fn<() => Region>(() => storageState.region)

export const saveRegion = vi.fn<(next: Region) => void>((next) => {
  storageState.region = next
})

export const loadMarketScope = vi.fn<() => MarketScope>(() => storageState.marketScope)

export const saveMarketScope = vi.fn<(next: MarketScope) => void>((next) => {
  storageState.marketScope = next
})

export const loadCategory = vi.fn<() => CropCategory>(() => storageState.category)

export const saveCategory = vi.fn<(next: CropCategory) => void>((next) => {
  storageState.category = next
})

export const loadFavorites = vi.fn<() => number[]>(() => [...storageState.favorites])

export const saveFavorites = vi.fn<(next: number[]) => void>((next) => {
  storageState.favorites = [...next]
})

vi.mock('../../../src/lib/storage', () => ({
  loadRegion,
  saveRegion,
  loadFavorites,
  saveFavorites,
  loadMarketScope,
  saveMarketScope,
  loadCategory,
  saveCategory,
}))

export const resetStorageMocks = () => {
  storageState.region = 'temperate'
  storageState.marketScope = 'domestic'
  storageState.category = 'all'
  storageState.favorites = []
  loadRegion.mockClear()
  saveRegion.mockClear()
  loadFavorites.mockClear()
  saveFavorites.mockClear()
  loadMarketScope.mockClear()
  saveMarketScope.mockClear()
  loadCategory.mockClear()
  saveCategory.mockClear()
}
