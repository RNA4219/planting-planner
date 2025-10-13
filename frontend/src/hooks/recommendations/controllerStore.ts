import { useMemo, useSyncExternalStore } from 'react'

import { saveMarketScope, saveSelectedCategory } from '../../lib/storage'
import type { CropCategory, MarketScope, Region } from '../../types'
import type { UseRecommendationLoaderResult } from './loader'

type Listener = () => void

type RequestRecommendations = UseRecommendationLoaderResult['requestRecommendations']

export interface RecommendationsControllerState {
  readonly region: Region
  readonly marketScope: MarketScope
  readonly category: CropCategory
}

interface CreateRecommendationsControllerStoreOptions {
  readonly initialRegion: Region
  readonly initialMarketScope: MarketScope
  readonly initialCategory: CropCategory
}

interface LatestSnapshot {
  region: Region
  marketScope: MarketScope
  category: CropCategory
  week: string
}

interface RecommendationsControllerActions {
  setRegion: (next: Region) => void
  setMarketScope: (next: MarketScope) => void
  setCategory: (next: CropCategory) => void
  syncInitialRegion: (next?: Region) => void
  syncInitialMarketScope: (next?: MarketScope) => void
  syncInitialCategory: (next?: CropCategory) => void
  updateLatestRegion: (next: Region) => void
  updateLatestMarketScope: (next: MarketScope) => void
  updateLatestCategory: (next: CropCategory) => void
  updateLatestWeek: (next: string) => void
  updateRequest: (next: RequestRecommendations) => void
  markRegionFetchSkip: (region: Region) => void
  handleRegionEffect: (currentWeek: string) => Promise<void> | void
  handleMarketScopeEffect: (currentWeek: string) => Promise<void> | void
  handleCategoryEffect: (currentWeek: string) => Promise<void> | void
  reloadCurrentWeek: () => Promise<void>
}

export interface RecommendationsControllerStore {
  readonly subscribe: (listener: Listener) => () => void
  readonly getSnapshot: () => RecommendationsControllerState
  readonly actions: RecommendationsControllerActions
}

const noopRequest: RequestRecommendations = async () => {}

export const createRecommendationsControllerStore = ({
  initialRegion,
  initialMarketScope,
  initialCategory,
}: CreateRecommendationsControllerStoreOptions): RecommendationsControllerStore => {
  let state: RecommendationsControllerState = {
    region: initialRegion,
    marketScope: initialMarketScope,
    category: initialCategory,
  }
  const listeners = new Set<Listener>()
  let request: RequestRecommendations = noopRequest
  let regionSync = initialRegion
  let marketScopeSync = initialMarketScope
  let categorySync = initialCategory
  let regionFetchSkip: Region | null = null
  let initialRegionValue: Region = initialRegion
  let initialMarketScopeValue: MarketScope = initialMarketScope
  let initialCategoryValue: CropCategory = initialCategory
  const latest: LatestSnapshot = {
    region: initialRegion,
    marketScope: initialMarketScope,
    category: initialCategory,
    week: '',
  }

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  const setState = (next: RecommendationsControllerState) => {
    if (
      next.region === state.region &&
      next.marketScope === state.marketScope &&
      next.category === state.category
    ) {
      return
    }
    state = next
    emit()
  }

  const actions: RecommendationsControllerActions = {
    setRegion: (next) => {
      if (state.region === next) {
        return
      }
      setState({ ...state, region: next })
    },
    setMarketScope: (next) => {
      if (state.marketScope === next) {
        return
      }
      saveMarketScope(next)
      setState({ ...state, marketScope: next })
    },
    setCategory: (next) => {
      if (state.category === next) {
        return
      }
      saveSelectedCategory(next)
      setState({ ...state, category: next })
    },
    syncInitialRegion: (next) => {
      if (next === undefined || next === initialRegionValue) {
        return
      }
      initialRegionValue = next
      actions.setRegion(next)
    },
    syncInitialMarketScope: (next) => {
      if (next === undefined || next === initialMarketScopeValue) {
        return
      }
      initialMarketScopeValue = next
      actions.setMarketScope(next)
    },
    syncInitialCategory: (next) => {
      if (next === undefined || next === initialCategoryValue) {
        return
      }
      initialCategoryValue = next
      actions.setCategory(next)
    },
    updateLatestRegion: (next) => {
      latest.region = next
    },
    updateLatestMarketScope: (next) => {
      latest.marketScope = next
    },
    updateLatestCategory: (next) => {
      latest.category = next
    },
    updateLatestWeek: (next) => {
      latest.week = next
    },
    updateRequest: (next) => {
      request = next
    },
    markRegionFetchSkip: (region) => {
      regionFetchSkip = region
    },
    handleRegionEffect: async (currentWeek) => {
      if (regionSync === state.region) {
        return
      }
      regionSync = state.region
      if (regionFetchSkip === state.region) {
        regionFetchSkip = null
        return
      }
      await request(currentWeek, {
        regionOverride: state.region,
        marketScopeOverride: state.marketScope,
        categoryOverride: state.category,
      })
    },
    handleMarketScopeEffect: async (currentWeek) => {
      if (marketScopeSync === state.marketScope) {
        return
      }
      marketScopeSync = state.marketScope
      await request(currentWeek, {
        regionOverride: state.region,
        marketScopeOverride: state.marketScope,
        categoryOverride: state.category,
      })
    },
    handleCategoryEffect: async (currentWeek) => {
      if (categorySync === state.category) {
        return
      }
      categorySync = state.category
      await request(currentWeek, {
        regionOverride: state.region,
        marketScopeOverride: state.marketScope,
        categoryOverride: state.category,
      })
    },
    reloadCurrentWeek: () => {
      return request(latest.week, {
        regionOverride: latest.region,
        marketScopeOverride: latest.marketScope,
        categoryOverride: latest.category,
      })
    },
  }

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return {
    subscribe,
    getSnapshot: () => state,
    actions,
  }
}

export const useRecommendationsControllerStore = (
  options: CreateRecommendationsControllerStoreOptions,
) => {
  const { initialRegion, initialMarketScope, initialCategory } = options
  const store = useMemo(
    () =>
      createRecommendationsControllerStore({
        initialRegion,
        initialMarketScope,
        initialCategory,
      }),
    [],
  )
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return { store, state }
}
