import { vi } from 'vitest'

import type { FavoritesStorage, Region, RegionStorage } from '../../../src/types'

export type StorageState = FavoritesStorage & RegionStorage

export const storageState: StorageState = {
  region: 'temperate',
  favorites: [],
}

export const loadRegion = vi.fn<() => Region>(() => storageState.region)

export const saveRegion = vi.fn<(next: Region) => void>((next) => {
  storageState.region = next
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
}))

export const resetStorageMocks = () => {
  storageState.region = 'temperate'
  storageState.favorites = []
  loadRegion.mockClear()
  saveRegion.mockClear()
  loadFavorites.mockClear()
  saveFavorites.mockClear()
}
