import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { CropCategory, MarketScope, RecommendationItem, Region } from '../../types'
import {
  DEFAULT_ACTIVE_WEEK,
  DEFAULT_WEEK,
  type NormalizeRecommendationResult,
} from '../../utils/recommendations'
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
  ) => Promise<void>
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
  const queryClient = useQueryClient()
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
      setQueryWeek(normalizedWeek)
      currentWeekRef.current = normalizedWeek
      setSelectedMarket((prev) => (prev === targetMarketScope ? prev : targetMarketScope))
      setSelectedCategory((prev) => (prev === targetCategory ? prev : targetCategory))
      const requestMeta: RequestMeta = {
        id: trackerRef.current.id + 1,
        region: targetRegion,
        week: normalizedWeek,
        marketScope: targetMarketScope,
        category: targetCategory,
      }
      trackerRef.current = requestMeta
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
        const queryKey = [
          'recommendations',
          targetRegion,
          targetMarketScope,
          targetCategory,
          normalizedWeek,
        ] as const
        const result = await queryClient.fetchQuery<NormalizeRecommendationResult | null>({
          queryKey,
          queryFn: () =>
            fetchRecommendations({
              region: targetRegion,
              week: normalizedWeek,
              marketScope: targetMarketScope,
              category: targetCategory,
              preferLegacy: options?.preferLegacy,
            }),
        })
        if (!isLatest()) {
          return
        }
        if (!result) {
          applyWeek(normalizedWeek, [])
          return
        }
        const resolvedWeek = normalizeIsoWeek(result.week, normalizedWeek)
        applyWeek(resolvedWeek, result.items)
      } catch {
        if (!isLatest()) {
          return
        }
        applyWeek(normalizedWeek, [])
      }
    },
    [
      applyWeek,
      category,
      fetchRecommendations,
      marketScope,
      normalizeWeek,
      queryClient,
      region,
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
