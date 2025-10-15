import type { CropCategory, MarketScope, Region } from '../types'

const FAVORITES_KEY = 'plantingPlanner.favorites'
const REGION_KEY = 'plantingPlanner.region'
const MARKET_SCOPE_KEY = 'plantingPlanner.marketScope'
const CATEGORY_KEY = 'plantingPlanner.category'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const memoryStorage = (() => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
})()

const getStorage = (): StorageLike => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return memoryStorage
}

const storage = getStorage()

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = storage.getItem(key)
    if (!raw) {
      return fallback
    }
    const parsed = JSON.parse(raw) as T
    return parsed
  } catch {
    storage.removeItem(key)
    return fallback
  }
}

export const loadFavorites = (): number[] => {
  const favorites = readJson<number[]>(FAVORITES_KEY, [])
  return Array.from(new Set(favorites)).filter((id) => Number.isFinite(id))
}

export const saveFavorites = (favorites: number[]): void => {
  const unique = Array.from(new Set(favorites)).filter((id) => Number.isFinite(id))
  storage.setItem(FAVORITES_KEY, JSON.stringify(unique))
}

const isRegion = (value: unknown): value is Region =>
  value === 'cold' || value === 'temperate' || value === 'warm'

export const loadRegion = (): Region => {
  const raw = storage.getItem(REGION_KEY)
  if (!raw) {
    return 'temperate'
  }
  try {
    const parsed = JSON.parse(raw)
    if (isRegion(parsed)) {
      return parsed
    }
  } catch {
    if (isRegion(raw)) {
      saveRegion(raw)
      return raw
    }
  }
  storage.removeItem(REGION_KEY)
  return 'temperate'
}

export const saveRegion = (region: Region): void => {
  storage.setItem(REGION_KEY, JSON.stringify(region))
}

const isMarketScope = (value: unknown): value is MarketScope => {
  if (value === 'national') {
    return true
  }
  if (typeof value === 'string' && value.startsWith('city:') && value.length > 'city:'.length) {
    return true
  }
  return false
}

export const loadMarketScope = (): MarketScope => {
  const scope = readJson<MarketScope | null>(MARKET_SCOPE_KEY, null)
  if (isMarketScope(scope)) {
    return scope
  }
  return 'national'
}

export const saveMarketScope = (marketScope: MarketScope): void => {
  storage.setItem(MARKET_SCOPE_KEY, JSON.stringify(marketScope))
}

const isCropCategory = (value: unknown): value is CropCategory =>
  value === 'leaf' || value === 'root' || value === 'flower'

export const loadSelectedCategory = (): CropCategory => {
  const category = readJson<unknown>(CATEGORY_KEY, null)
  if (isCropCategory(category)) {
    return category
  }

  if (category === 'fruit') {
    storage.removeItem(CATEGORY_KEY)
  }

  return 'leaf'
}

export const saveSelectedCategory = (category: CropCategory): void => {
  storage.setItem(CATEGORY_KEY, JSON.stringify(category))
}
