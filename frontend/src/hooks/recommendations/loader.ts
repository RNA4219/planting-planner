import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'

import type { CropCategory, MarketScope, RecommendationItem, Region } from '../../types'
import { DEFAULT_ACTIVE_WEEK, DEFAULT_WEEK } from '../../utils/recommendations'
import * as weekModule from '../../lib/week'
import { track } from '../../lib/telemetry'

import { useRecommendationFetcher, type RecommendationFetchResult } from '../recommendationFetcher'
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
  isMarketFallback: boolean
  loadError: RecommendationLoadError | null
  requestRecommendations: (
    inputWeek: string,
    options?: RequestOptions,
  ) => Promise<void>
}

export type RecommendationLoadError = 'recommendations-unavailable'

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
  const [isMarketFallback, setIsMarketFallback] = useState(false)
  const [loadError, setLoadError] = useState<RecommendationLoadError | null>(null)
  const currentWeekRef = useRef<string>(DEFAULT_WEEK)
  const initialFetchRef = useRef(false)
  const trackerRef = useRef<RequestMeta>({
    id: 0,
    region,
    week: DEFAULT_WEEK,
    marketScope,
    category,
  })
  const settledRef = useRef<RequestMeta>(trackerRef.current)
  const fetchRecommendations = useRecommendationFetcher()
  const queryClient = useQueryClient()
  const lastSuccessfulResultRef = useRef<RecommendationFetchResult | null>(null)
  const applyWeek = useCallback(
    (weekValue: string, nextItems: RecommendationItem[]) => {
      currentWeekRef.current = weekValue
      flushSync(() => {
        setItems(nextItems)
        setActiveWeek(weekValue)
      })
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
      const queryKey = [
        'recommendations',
        targetRegion,
        targetMarketScope,
        targetCategory,
        normalizedWeek,
      ] as const
      const previousResult = queryClient.getQueryData<RecommendationFetchResult>(queryKey)
      try {
        const result = await queryClient.fetchQuery<RecommendationFetchResult>({
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
        if (requestMeta.id < settledRef.current.id) {
          return
        }
        setIsMarketFallback(result.isMarketFallback)
        setLoadError(null)
        if (!result.result) {
          lastSuccessfulResultRef.current = result
          applyWeek(normalizedWeek, [])
          settledRef.current = requestMeta
          return
        }
        const resolvedWeek = normalizeIsoWeek(result.result.week, normalizedWeek)
        applyWeek(resolvedWeek, result.result.items)
        lastSuccessfulResultRef.current = result
        settledRef.current = requestMeta
      } catch {
        if (requestMeta.id < settledRef.current.id) {
          return
        }
        const cached =
          queryClient.getQueryData<RecommendationFetchResult>(queryKey) ??
          previousResult ??
          lastSuccessfulResultRef.current
        if (cached?.result) {
          setIsMarketFallback(cached.isMarketFallback)
          setLoadError(null)
          const resolvedWeek = normalizeIsoWeek(cached.result.week, normalizedWeek)
          void track('prefetch.hit', {
            region: targetRegion,
            marketScope: targetMarketScope,
            category: targetCategory,
            requestedWeek: normalizedWeek,
            resolvedWeek,
            isMarketFallback: cached.isMarketFallback,
            itemsCount: cached.result.items.length,
          })
          applyWeek(resolvedWeek, cached.result.items)
          settledRef.current = requestMeta
          return
        }
        setIsMarketFallback(false)
        setLoadError('recommendations-unavailable')
        void track('prefetch.miss', {
          region: targetRegion,
          marketScope: targetMarketScope,
          category: targetCategory,
          requestedWeek: normalizedWeek,
          resolvedWeek: normalizedWeek,
          isMarketFallback: false,
          itemsCount: 0,
        })
        applyWeek(normalizedWeek, [])
        settledRef.current = requestMeta
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
    isMarketFallback,
    loadError,
    requestRecommendations,
  }
}
