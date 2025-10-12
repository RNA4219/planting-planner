import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CropCategory, MarketScope, Region } from '../../types'
import { RecommendationRow, buildRecommendationRows, formatWeekLabel } from '../../utils/recommendations'

import { useRecommendationLoader } from './loader'
import { useCropCatalog } from '../useCropCatalog'
import { saveMarketScope, saveSelectedCategory } from '../../lib/storage'

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
}

export const useRecommendations = ({
  favorites,
  initialRegion,
  initialMarketScope,
  initialCategory,
}: UseRecommendationsOptions): UseRecommendationsResult => {
  const initialRegionRef = useRef<Region>(initialRegion ?? 'temperate')
  const [region, setRegion] = useState<Region>(initialRegionRef.current)
  const initialMarketScopeRef = useRef<MarketScope>(initialMarketScope ?? 'national')
  const initialCategoryRef = useRef<CropCategory>(initialCategory ?? 'leaf')
  const [marketScope, setMarketScopeState] = useState<MarketScope>(initialMarketScopeRef.current)
  const [category, setCategoryState] = useState<CropCategory>(initialCategoryRef.current)
  const regionSyncRef = useRef<Region>(initialRegionRef.current)
  const regionFetchSkipRef = useRef<Region | null>(null)
  const marketScopeSyncRef = useRef<MarketScope>(initialMarketScopeRef.current)
  const categorySyncRef = useRef<CropCategory>(initialCategoryRef.current)
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
  } = useRecommendationLoader({ region, marketScope, category })
  const latestRegionRef = useRef(region)
  const latestWeekRef = useRef(currentWeek)
  const latestMarketScopeRef = useRef(marketScope)
  const latestCategoryRef = useRef(category)
  const requestRef = useRef(requestRecommendations)

  useEffect(() => {
    latestRegionRef.current = region
  }, [region])

  useEffect(() => {
    latestMarketScopeRef.current = marketScope
  }, [marketScope])

  useEffect(() => {
    latestCategoryRef.current = category
  }, [category])

  useEffect(() => {
    latestMarketScopeRef.current = selectedMarket
  }, [selectedMarket])

  useEffect(() => {
    latestCategoryRef.current = selectedCategory
  }, [selectedCategory])

  useEffect(() => {
    latestWeekRef.current = currentWeek
  }, [currentWeek])

  useEffect(() => {
    requestRef.current = requestRecommendations
  }, [requestRecommendations])

  const reloadCurrentWeek = useCallback(() => {
    return requestRef.current(latestWeekRef.current, {
      regionOverride: latestRegionRef.current,
      marketScopeOverride: latestMarketScopeRef.current,
      categoryOverride: latestCategoryRef.current,
    })
  }, [])

  const setQueryWeek = useCallback(
    (nextWeek: string) => {
      setRawQueryWeek(nextWeek)
    },
    [setRawQueryWeek],
  )

  const setMarketScope = useCallback(
    (next: MarketScope) => {
      setMarketScopeState((prev) => {
        if (prev === next) {
          return prev
        }
        saveMarketScope(next)
        return next
      })
    },
    [],
  )

  const setCategory = useCallback(
    (next: CropCategory) => {
      setCategoryState((prev) => {
        if (prev === next) {
          return prev
        }
        saveSelectedCategory(next)
        return next
      })
    },
    [],
  )

  useEffect(() => {
    if (initialRegion !== undefined && initialRegion !== initialRegionRef.current) {
      initialRegionRef.current = initialRegion
      setRegion(initialRegion)
    }
  }, [initialRegion, setRegion])

  useEffect(() => {
    if (initialMarketScope !== undefined && initialMarketScope !== initialMarketScopeRef.current) {
      initialMarketScopeRef.current = initialMarketScope
      setMarketScope(initialMarketScope)
    }
  }, [initialMarketScope, setMarketScope])

  useEffect(() => {
    if (initialCategory !== undefined && initialCategory !== initialCategoryRef.current) {
      initialCategoryRef.current = initialCategory
      setCategory(initialCategory)
    }
  }, [initialCategory, setCategory])

  useEffect(() => {
    if (regionSyncRef.current === region) {
      return
    }
    regionSyncRef.current = region
    if (regionFetchSkipRef.current === region) {
      regionFetchSkipRef.current = null
      return
    }
    void requestRecommendations(currentWeek, {
      regionOverride: region,
      marketScopeOverride: marketScope,
      categoryOverride: category,
    })
  }, [category, currentWeek, marketScope, region, requestRecommendations])

  useEffect(() => {
    if (marketScopeSyncRef.current === marketScope) {
      return
    }
    marketScopeSyncRef.current = marketScope
    void requestRecommendations(currentWeek, {
      regionOverride: region,
      marketScopeOverride: marketScope,
      categoryOverride: category,
    })
  }, [category, currentWeek, marketScope, region, requestRecommendations])

  useEffect(() => {
    if (categorySyncRef.current === category) {
      return
    }
    categorySyncRef.current = category
    void requestRecommendations(currentWeek, {
      regionOverride: region,
      marketScopeOverride: marketScope,
      categoryOverride: category,
    })
  }, [category, currentWeek, marketScope, region, requestRecommendations])

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
        setRegion(submittedRegion)
      }
      const regionChanged = submittedRegion !== undefined && submittedRegion !== region
      const targetRegion = submittedRegion ?? region
      const shouldRequest = !regionChanged || submittedWeek !== currentWeek
      if (regionChanged && shouldRequest) {
        regionFetchSkipRef.current = submittedRegion
      }
      if (shouldRequest) {
        void requestRecommendations(submittedWeek, {
          regionOverride: targetRegion,
          marketScopeOverride: marketScope,
          categoryOverride: category,
        })
      }
    },
    [category, currentWeek, marketScope, queryWeek, region, requestRecommendations, setRegion],
  )

  const displayWeek = useMemo(() => formatWeekLabel(activeWeek), [activeWeek])

  return {
    region,
    setRegion,
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
  }
}

export type { RecommendationRow } from '../../utils/recommendations'
export type { RecommendationFetcher } from '../recommendationFetcher'
export { useCropCatalog } from '../useCropCatalog'
export type { CropCatalogEntry, CropCatalogMap, UseCropCatalogResult } from '../useCropCatalog'
export { useRecommendationLoader } from './loader'
export type { UseRecommendationLoaderResult } from './loader'
