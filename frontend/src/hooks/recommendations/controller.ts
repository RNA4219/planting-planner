import { FormEvent, useCallback, useEffect, useMemo } from 'react'

import type { CropCategory, MarketScope, Region } from '../../types'
import { RecommendationRow, buildRecommendationRows, formatWeekLabel } from '../../utils/recommendations'

import { useRecommendationLoader } from './loader'
import { useCropCatalog } from '../useCropCatalog'
import { useRecommendationsControllerStore } from './controllerStore'

export interface UseRecommendationsOptions {
  favorites: readonly number[]
  initialRegion?: Region
  initialMarketScope?: MarketScope
  initialCategory?: CropCategory
}

export interface UseRecommendationsResult {
  region: Region
  setRegion: (region: Region) => void
  marketScope: MarketScope
  setMarketScope: (scope: MarketScope) => void
  selectedMarket: MarketScope
  category: CropCategory
  setCategory: (category: CropCategory) => void
  selectedCategory: CropCategory
  queryWeek: string
  setQueryWeek: (week: string) => void
  currentWeek: string
  displayWeek: string
  sortedRows: RecommendationRow[]
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
  reloadCurrentWeek: () => Promise<void>
  isMarketFallback: boolean
}

export const useRecommendations = ({
  favorites,
  initialRegion,
  initialMarketScope,
  initialCategory,
}: UseRecommendationsOptions): UseRecommendationsResult => {
  const normalizedInitialRegion = initialRegion ?? 'temperate'
  const normalizedInitialMarketScope = initialMarketScope ?? 'national'
  const normalizedInitialCategory = initialCategory ?? 'leaf'
  const {
    store: controllerStore,
    state: { region, marketScope, category },
  } = useRecommendationsControllerStore({
    initialRegion: normalizedInitialRegion,
    initialMarketScope: normalizedInitialMarketScope,
    initialCategory: normalizedInitialCategory,
  })
  const {
    setRegion: setRegionState,
    setMarketScope: setMarketScopeState,
    setCategory: setCategoryState,
    syncInitialRegion,
    syncInitialMarketScope,
    syncInitialCategory,
    updateLatestRegion,
    updateLatestMarketScope,
    updateLatestCategory,
    updateLatestWeek,
    updateRequest,
    markRegionFetchSkip,
    handleRegionEffect,
    handleMarketScopeEffect,
    handleCategoryEffect,
    reloadCurrentWeek,
  } = controllerStore.actions
  const { catalog: cropCatalog } = useCropCatalog()
  const cropIndex = useMemo(() => {
    const map = new Map<string, { id: number; category?: string }>()
    cropCatalog.forEach((entry, cropName) => {
      map.set(cropName, { id: entry.id, category: entry.category })
    })
    return map
  }, [cropCatalog])
  const {
    queryWeek,
    setQueryWeek: setRawQueryWeek,
    activeWeek,
    items,
    currentWeek,
    selectedMarket,
    selectedCategory,
    requestRecommendations,
    isMarketFallback,
  } = useRecommendationLoader({ region, marketScope, category })
  useEffect(() => {
    syncInitialRegion(initialRegion)
  }, [initialRegion, syncInitialRegion])

  useEffect(() => {
    syncInitialMarketScope(initialMarketScope)
  }, [initialMarketScope, syncInitialMarketScope])

  useEffect(() => {
    syncInitialCategory(initialCategory)
  }, [initialCategory, syncInitialCategory])

  useEffect(() => {
    updateLatestRegion(region)
  }, [region, updateLatestRegion])

  useEffect(() => {
    updateLatestMarketScope(marketScope)
  }, [marketScope, updateLatestMarketScope])

  useEffect(() => {
    updateLatestCategory(category)
  }, [category, updateLatestCategory])

  useEffect(() => {
    updateLatestMarketScope(selectedMarket)
  }, [selectedMarket, updateLatestMarketScope])

  useEffect(() => {
    updateLatestCategory(selectedCategory)
  }, [selectedCategory, updateLatestCategory])

  useEffect(() => {
    updateLatestWeek(currentWeek)
  }, [currentWeek, updateLatestWeek])

  useEffect(() => {
    updateRequest(requestRecommendations)
  }, [requestRecommendations, updateRequest])

  useEffect(() => {
    void handleRegionEffect(currentWeek)
  }, [category, currentWeek, handleRegionEffect, marketScope, region])

  useEffect(() => {
    void handleMarketScopeEffect(currentWeek)
  }, [category, currentWeek, handleMarketScopeEffect, marketScope, region])

  useEffect(() => {
    void handleCategoryEffect(currentWeek)
  }, [category, currentWeek, handleCategoryEffect, marketScope, region])

  const setQueryWeek = useCallback(
    (nextWeek: string) => {
      setRawQueryWeek(nextWeek)
    },
    [setRawQueryWeek],
  )

  const setMarketScope = useCallback(
    (next: MarketScope) => {
      setMarketScopeState(next)
    },
    [setMarketScopeState],
  )

  const setCategory = useCallback(
    (next: CropCategory) => {
      setCategoryState(next)
    },
    [setCategoryState],
  )

  const sortedRows = useMemo<RecommendationRow[]>(() => {
    return buildRecommendationRows({ items, favorites, cropIndex })
  }, [items, cropIndex, favorites])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const weekField = form.elements.namedItem('week') as HTMLInputElement | null
      const regionField = form.elements.namedItem('region') as HTMLSelectElement | null
      const submittedWeek = weekField?.value ?? queryWeek
      const submittedRegion = (regionField?.value as Region | undefined) ?? region
      if (submittedRegion && submittedRegion !== region) {
        setRegionState(submittedRegion)
      }
      const regionChanged = submittedRegion !== undefined && submittedRegion !== region
      const targetRegion = submittedRegion ?? region
      const shouldRequest = !regionChanged || submittedWeek !== currentWeek
      if (regionChanged && shouldRequest && submittedRegion) {
        markRegionFetchSkip(submittedRegion)
      }
      if (shouldRequest) {
        void requestRecommendations(submittedWeek, {
          regionOverride: targetRegion,
          marketScopeOverride: marketScope,
          categoryOverride: category,
        })
      }
    },
    [
      category,
      currentWeek,
      markRegionFetchSkip,
      marketScope,
      queryWeek,
      region,
      requestRecommendations,
      setRegionState,
    ],
  )

  const displayWeek = useMemo(() => formatWeekLabel(activeWeek), [activeWeek])

  return {
    region,
    setRegion: setRegionState,
    marketScope,
    setMarketScope,
    selectedMarket,
    category,
    setCategory,
    selectedCategory,
    queryWeek,
    setQueryWeek,
    currentWeek,
    displayWeek,
    sortedRows,
    handleSubmit,
    reloadCurrentWeek,
    isMarketFallback,
  }
}

export type { RecommendationRow } from '../../utils/recommendations'
export type { RecommendationFetcher } from '../recommendationFetcher'
export { useCropCatalog } from '../useCropCatalog'
export type { CropCatalogEntry, CropCatalogMap, UseCropCatalogResult } from '../useCropCatalog'
export { useRecommendationLoader } from './loader'
export type { UseRecommendationLoaderResult } from './loader'
