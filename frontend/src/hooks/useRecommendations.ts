import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as apiModule from '../lib/api'
import * as weekModule from '../lib/week'
import type { Crop, RecommendResponse, RecommendationItem, Region } from '../types'
import {
  DEFAULT_ACTIVE_WEEK,
  DEFAULT_WEEK,
  RecommendationRow,
  NormalizeRecommendationResult,
  buildRecommendationRows,
  formatWeekLabel,
  normalizeRecommendationResponse,
} from '../utils/recommendations'

const week = weekModule as typeof import('../lib/week')

const api = apiModule as typeof import('../lib/api') & {
  fetchRecommend?: (input: { region: Region; week?: string }) => Promise<RecommendResponse>
}

const { normalizeIsoWeek } = week
const fetchCrops = api.fetchCrops

export interface UseRecommendationsOptions {
  favorites: readonly number[]
  initialRegion?: Region
}

export interface UseRecommendationsResult {
  region: Region
  setRegion: (region: Region) => void
  queryWeek: string
  setQueryWeek: (week: string) => void
  currentWeek: string
  displayWeek: string
  sortedRows: RecommendationRow[]
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
}

interface RecommendationFetchInput {
  region: Region
  week: string
  preferLegacy?: boolean
}

export type RecommendationFetcher = (
  input: RecommendationFetchInput,
) => Promise<NormalizeRecommendationResult | null>

export const useRecommendationFetcher = (): RecommendationFetcher => {
  return useCallback<RecommendationFetcher>(
    async ({ region, week, preferLegacy = false }) => {
      const callModern = async (): Promise<RecommendResponse | undefined> => {
        if (typeof api.fetchRecommendations !== 'function') {
          return undefined
        }
        try {
          return await api.fetchRecommendations(region, week)
        } catch {
          return undefined
        }
      }

      const callLegacy = async (): Promise<RecommendResponse | undefined> => {
        if (typeof api.fetchRecommend !== 'function') {
          return undefined
        }
        try {
          return await api.fetchRecommend({ region, week })
        } catch {
          return undefined
        }
      }

      const primary = preferLegacy ? callLegacy : callModern
      const secondary = preferLegacy ? callModern : callLegacy

      const response = (await primary()) ?? (await secondary())
      if (!response) {
        return null
      }

      return normalizeRecommendationResponse(response, week)
    },
    [],
  )
}

const useCropIndex = (): Map<string, number> => {
  const [crops, setCrops] = useState<Crop[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetchCrops()
        if (active) {
          setCrops(response)
        }
      } catch {
        if (active) {
          setCrops([])
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  return useMemo(() => {
    const map = new Map<string, number>()
    crops.forEach((crop) => {
      map.set(crop.name, crop.id)
    })
    return map
  }, [crops])
}

export interface UseRecommendationLoaderResult {
  queryWeek: string
  setQueryWeek: (week: string) => void
  activeWeek: string
  items: RecommendationItem[]
  currentWeek: string
  requestRecommendations: (inputWeek: string, options?: { preferLegacy?: boolean }) => Promise<void>
}

export const useRecommendationLoader = (region: Region): UseRecommendationLoaderResult => {
  const [queryWeek, setQueryWeek] = useState(DEFAULT_WEEK)
  const [activeWeek, setActiveWeek] = useState(DEFAULT_ACTIVE_WEEK)
  const [items, setItems] = useState<RecommendationItem[]>([])
  const currentWeekRef = useRef<string>(DEFAULT_WEEK)
  const initialFetchRef = useRef(false)
  const regionRef = useRef(region)
  const fetchRecommendationsWithFallback = useRecommendationFetcher()

  useEffect(() => {
    regionRef.current = region
  }, [region])

  const normalizeWeek = useCallback(
    (value: string) => normalizeIsoWeek(value, activeWeek),
    [activeWeek],
  )

  const requestRecommendations = useCallback(
    async (inputWeek: string, options?: { preferLegacy?: boolean }) => {
      const targetRegion = regionRef.current
      const normalizedWeek = normalizeWeek(inputWeek)
      setQueryWeek(normalizedWeek)
      try {
        const result = await fetchRecommendationsWithFallback({
          region: targetRegion,
          week: normalizedWeek,
          preferLegacy: options?.preferLegacy,
        })
        if (!result) {
          setItems([])
          return
        }
        setItems(result.items)
        setActiveWeek(result.week)
      } catch {
        setItems([])
      }
    },
    [fetchRecommendationsWithFallback, normalizeWeek],
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
    requestRecommendations,
  }
}

export const useRecommendations = ({ favorites, initialRegion }: UseRecommendationsOptions): UseRecommendationsResult => {
  const initialRegionRef = useRef<Region>(initialRegion ?? 'temperate')
  const [region, setRegion] = useState<Region>(initialRegionRef.current)
  const cropIndex = useCropIndex()
  const { queryWeek, setQueryWeek: setRawQueryWeek, activeWeek, items, currentWeek, requestRecommendations } =
    useRecommendationLoader(region)

  const setQueryWeek = useCallback(
    (nextWeek: string) => {
      setRawQueryWeek(normalizeIsoWeek(nextWeek, currentWeek))
    },
    [currentWeek, setRawQueryWeek],
  )

  useEffect(() => {
    if (initialRegion !== undefined && initialRegion !== initialRegionRef.current) {
      initialRegionRef.current = initialRegion
      setRegion(initialRegion)
    }
  }, [initialRegion, setRegion])

  const sortedRows = useMemo<RecommendationRow[]>(() => {
    return buildRecommendationRows({ items, favorites, cropIndex })
  }, [items, cropIndex, favorites])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void requestRecommendations(queryWeek)
    },
    [queryWeek, requestRecommendations],
  )

  const displayWeek = useMemo(() => formatWeekLabel(activeWeek), [activeWeek])

  return {
    region,
    setRegion,
    queryWeek,
    setQueryWeek,
    currentWeek,
    displayWeek,
    sortedRows,
    handleSubmit,
  }
}

export type { RecommendationRow } from '../utils/recommendations'
