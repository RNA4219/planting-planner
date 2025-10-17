import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  const [, setItems] = useState<RecommendationItem[]>([])
  const itemsRef = useRef<RecommendationItem[]>([])
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
  const commitResolverRef = useRef<(() => void) | null>(null)
  const scheduleCommitAwaiter = useCallback(() => {
    if (commitResolverRef.current) {
      const pending = commitResolverRef.current
      commitResolverRef.current = null
      pending()
    }
    let settled = false
    let resolvePromise: (() => void) | null = null
    const promise = new Promise<void>((resolve) => {
      resolvePromise = () => {
        if (settled) {
          return
        }
        settled = true
        commitResolverRef.current = null
        resolve()
      }
      commitResolverRef.current = resolvePromise
    })
    setTimeout(() => {
      if (!settled) {
        resolvePromise?.()
      }
    }, 0)
    return promise
  }, [])
  useLayoutEffect(() => {
    const pending = commitResolverRef.current
    if (pending) {
      commitResolverRef.current = null
      pending()
    }
  })
  const applyWeek = useCallback(
    (weekValue: string, nextItems: RecommendationItem[]) => {
      currentWeekRef.current = weekValue
      itemsRef.current = nextItems
      setItems(nextItems)
      setActiveWeek(weekValue)
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
      setActiveWeek((prev) => (prev === normalizedWeek ? prev : normalizedWeek))
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
        const commitPromise = scheduleCommitAwaiter()
        setIsMarketFallback(result.isMarketFallback)
        setLoadError(null)
        if (!result.result) {
          lastSuccessfulResultRef.current = result
          applyWeek(normalizedWeek, [])
          settledRef.current = requestMeta
          await commitPromise
          return
        }
        const resolvedWeek = normalizeIsoWeek(result.result.week, normalizedWeek)
        applyWeek(resolvedWeek, result.result.items)
        lastSuccessfulResultRef.current = result
        settledRef.current = requestMeta
        await commitPromise
      } catch {
        if (requestMeta.id < settledRef.current.id) {
          return
        }
        const cached =
          queryClient.getQueryData<RecommendationFetchResult>(queryKey) ??
          previousResult ??
          lastSuccessfulResultRef.current
        if (cached?.result) {
          const commitPromise = scheduleCommitAwaiter()
          setIsMarketFallback(cached.isMarketFallback)
          setLoadError(null)
          const resolvedWeek = normalizeIsoWeek(cached.result.week, normalizedWeek)
          void track(
            'prefetch.hit',
            {
              region: targetRegion,
              marketScope: targetMarketScope,
              category: targetCategory,
              requestedWeek: normalizedWeek,
              resolvedWeek,
              isMarketFallback: cached.isMarketFallback,
              itemsCount: cached.result.items.length,
            },
            `${requestMeta.id}`,
          )
          applyWeek(resolvedWeek, cached.result.items)
          settledRef.current = requestMeta
          await commitPromise
          return
        }
        const commitPromise = scheduleCommitAwaiter()
        setIsMarketFallback(false)
        setLoadError('recommendations-unavailable')
        void track(
          'prefetch.miss',
          {
            region: targetRegion,
            marketScope: targetMarketScope,
            category: targetCategory,
            requestedWeek: normalizedWeek,
            resolvedWeek: normalizedWeek,
            isMarketFallback: false,
            itemsCount: 0,
          },
          `${requestMeta.id}`,
        )
        applyWeek(normalizedWeek, [])
        settledRef.current = requestMeta
        await commitPromise
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
    get activeWeek() {
      return currentWeekRef.current
    },
    get items() {
      return itemsRef.current
    },
    currentWeek: currentWeekRef.current,
    selectedMarket,
    selectedCategory,
    isMarketFallback,
    loadError,
    requestRecommendations,
  }
}
