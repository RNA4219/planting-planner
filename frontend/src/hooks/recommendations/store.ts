import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import type { CropCategory, MarketScope, Region } from '../../types'
import {
  loadMarketScope,
  loadRegion,
  loadSelectedCategory,
  saveMarketScope,
  saveRegion,
  saveSelectedCategory,
} from '../../lib/storage'

type RecommendationsStoreState = {
  region: Region
  selectedMarket: MarketScope
  selectedCategory: CropCategory
}

type RecommendationsStoreActions = {
  setRegion: (region: Region) => void
  setSelectedMarket: (market: MarketScope) => void
  setSelectedCategory: (category: CropCategory) => void
  hydrate: (options: {
    region?: Region
    marketScope?: MarketScope
    category?: CropCategory
  }) => void
  reset: () => void
}

export type RecommendationsStore = RecommendationsStoreState & RecommendationsStoreActions

const createInitialState = (): RecommendationsStoreState => ({
  region: loadRegion(),
  selectedMarket: loadMarketScope(),
  selectedCategory: loadSelectedCategory(),
})

export const recommendationsStore = createStore<RecommendationsStore>((set, get) => ({
  ...createInitialState(),
  setRegion: (next) => {
    if (get().region === next) {
      return
    }
    saveRegion(next)
    set({ region: next })
  },
  setSelectedMarket: (next) => {
    if (get().selectedMarket === next) {
      return
    }
    saveMarketScope(next)
    set({ selectedMarket: next })
  },
  setSelectedCategory: (next) => {
    if (get().selectedCategory === next) {
      return
    }
    saveSelectedCategory(next)
    set({ selectedCategory: next })
  },
  hydrate: ({ region, marketScope, category }) => {
    if (region !== undefined) {
      get().setRegion(region)
    }
    if (marketScope !== undefined) {
      get().setSelectedMarket(marketScope)
    }
    if (category !== undefined) {
      get().setSelectedCategory(category)
    }
  },
  reset: () => {
    const initial = createInitialState()
    set(initial)
  },
}))

export const useRecommendationsStore = <T>(selector: (store: RecommendationsStore) => T): T =>
  useStore(recommendationsStore, selector)

export const resetRecommendationsStore = (): void => {
  recommendationsStore.getState().reset()
}
