import { vi } from 'vitest'

import type {
  CategoryStorage,
  CropCategory,
  FavoritesStorage,
  MarketScope,
  MarketScopeStorage,
  Region,
  RegionStorage,
} from '../../../src/types'

export type StorageState = FavoritesStorage & RegionStorage & MarketScopeStorage & CategoryStorage

export const storageState: StorageState = {
  region: 'temperate',
  favorites: [],
  marketScope: 'national',
  category: 'leaf',
}

export const loadRegion = vi.fn<() => Region>(() => storageState.region)

export const saveRegion = vi.fn<(next: Region) => void>((next) => {
  storageState.region = next
})

export const loadMarketScope = vi.fn<() => MarketScope>(() => storageState.marketScope)

export const saveMarketScope = vi.fn<(next: MarketScope) => void>((next) => {
  storageState.marketScope = next
})

export const loadSelectedCategory = vi.fn<() => CropCategory>(() => storageState.category)

export const saveSelectedCategory = vi.fn<(next: CropCategory) => void>((next) => {
  storageState.category = next
})

export const loadFavorites = vi.fn<() => number[]>(() => [...storageState.favorites])

export const saveFavorites = vi.fn<(next: number[]) => void>((next) => {
  storageState.favorites = [...next]
})

vi.mock('../../../src/lib/storage', () => ({
  loadRegion,
  saveRegion,
  loadMarketScope,
  saveMarketScope,
  loadSelectedCategory,
  saveSelectedCategory,
  loadFavorites,
  saveFavorites,
}))

export const resetStorageMocks = () => {
  storageState.region = 'temperate'
  storageState.favorites = []
  storageState.marketScope = 'national'
  storageState.category = 'leaf'
  loadRegion.mockClear()
  saveRegion.mockClear()
  loadMarketScope.mockClear()
  saveMarketScope.mockClear()
  loadSelectedCategory.mockClear()
  saveSelectedCategory.mockClear()
  loadFavorites.mockClear()
  saveFavorites.mockClear()
}
