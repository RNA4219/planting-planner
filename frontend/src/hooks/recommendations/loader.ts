import { useCallback, useEffect, useRef, useState } from 'react'

import type { CropCategory, MarketScope, RecommendationItem, Region } from '../../types'
import { DEFAULT_ACTIVE_WEEK, DEFAULT_WEEK } from '../../utils/recommendations'
import * as weekModule from '../../lib/week'

import { useRecommendationFetcher } from '../recommendationFetcher'
import { normalizeWeekInput } from './weekNormalization'

const week = weekModule as typeof import('../../lib/week')
const { normalizeIsoWeek } = week

interface LoaderInput {
  region: Region
  marketScope: MarketScope
  category: CropCategory
}

type RequestMeta = {
  id: number
  region: Region
  week: string
  marketScope: MarketScope
  category: CropCategory
}
type RequestOptions = {
  preferLegacy?: boolean
  regionOverride?: Region
  marketScopeOverride?: MarketScope
  categoryOverride?: CropCategory
}

type FetchQuery = <TResult>(
  key: readonly unknown[],
  fetcher: () => Promise<TResult>,
) => Promise<TResult>

const getFetchQuery = (): FetchQuery => {
  const globalClient = (globalThis as { __recommendationFetchQuery__?: FetchQuery })
    .__recommendationFetchQuery__
  if (globalClient) {
    return globalClient
  }
  return async (_key, fetcher) => fetcher()
}

export interface UseRecommendationLoaderResult {
  queryWeek: string
  setQueryWeek: (week: string) => void
  activeWeek: string
  items: RecommendationItem[]
  currentWeek: string
  selectedMarket: MarketScope
  selectedCategory: CropCategory
  requestRecommendations: (
    inputWeek: string,
    options?: RequestOptions,
  ) => Promise<{
    week: string
    marketScope: MarketScope
    category: CropCategory
  }>
}

export const useRecommendationLoader = ({
  region,
  marketScope,
  category,
}: LoaderInput): UseRecommendationLoaderResult => {
  const [queryWeek, setQueryWeek] = useState(DEFAULT_WEEK)
  const [activeWeek, setActiveWeek] = useState(DEFAULT_ACTIVE_WEEK)
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [selectedMarket, setSelectedMarket] = useState<MarketScope>(marketScope)
  const [selectedCategory, setSelectedCategory] = useState<CropCategory>(category)
  const currentWeekRef = useRef<string>(DEFAULT_WEEK)
  const initialFetchRef = useRef(false)
  const trackerRef = useRef<RequestMeta>({
    id: 0,
    region,
    week: DEFAULT_WEEK,
    marketScope,
    category,
  })
  const fetchRecommendations = useRecommendationFetcher()
  const applyWeek = useCallback(
    (weekValue: string, nextItems: RecommendationItem[]) => {
      setItems(nextItems)
      setActiveWeek(weekValue)
      currentWeekRef.current = weekValue
    },
    [],
  )

  const normalizeWeek = useCallback(
    (value: string) => normalizeWeekInput(value, activeWeek),
    [activeWeek],
  )

  const requestRecommendations = useCallback(
    async (inputWeek: string, options?: RequestOptions) => {
      const targetRegion = options?.regionOverride ?? region
      const targetMarketScope = options?.marketScopeOverride ?? marketScope
      const targetCategory = options?.categoryOverride ?? category
      const normalizedWeek = normalizeWeek(inputWeek)
      setSelectedMarket(targetMarketScope)
      setSelectedCategory(targetCategory)
      setQueryWeek(normalizedWeek)
      currentWeekRef.current = normalizedWeek
      const requestMeta: RequestMeta = {
        id: trackerRef.current.id + 1,
        region: targetRegion,
        week: normalizedWeek,
        marketScope: targetMarketScope,
        category: targetCategory,
      }
      trackerRef.current = requestMeta
      const latestState = {
        week: normalizedWeek,
        marketScope: targetMarketScope,
        category: targetCategory,
      }
      const queryKey = [
        'recommendations',
        targetRegion,
        targetMarketScope,
        targetCategory,
        normalizedWeek,
      ] as const
      const fetchQuery = getFetchQuery()
      const isLatest = () => {
        const latest = trackerRef.current
        return (
          latest.id === requestMeta.id &&
          latest.region === requestMeta.region &&
          latest.week === requestMeta.week &&
          latest.marketScope === requestMeta.marketScope &&
          latest.category === requestMeta.category
        )
      }
      try {
        const result = await fetchQuery(queryKey, () =>
          fetchRecommendations({
            region: targetRegion,
            week: normalizedWeek,
            marketScope: targetMarketScope,
            category: targetCategory,
            preferLegacy: options?.preferLegacy,
          }),
        )
        if (!isLatest()) {
          return latestState
        }
        if (!result) {
          applyWeek(normalizedWeek, [])
          return latestState
        }
        const resolvedWeek = normalizeIsoWeek(result.week, normalizedWeek)
        applyWeek(resolvedWeek, result.items)
        return latestState
      } catch {
        if (!isLatest()) {
          return latestState
        }
        applyWeek(normalizedWeek, [])
        return latestState
      }
    },
    [
      applyWeek,
      category,
      fetchRecommendations,
      marketScope,
      normalizeWeek,
      region,
      setSelectedCategory,
      setSelectedMarket,
    ],
  )

  useEffect(() => {
    if (initialFetchRef.current) {
      return
    }
    initialFetchRef.current = true
    void requestRecommendations(currentWeekRef.current)
  }, [requestRecommendations])

  return {
    queryWeek,
    setQueryWeek,
    activeWeek,
    items,
    currentWeek: currentWeekRef.current,
    selectedMarket,
    selectedCategory,
    requestRecommendations,
  }
}
