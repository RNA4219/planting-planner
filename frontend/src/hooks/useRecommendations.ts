import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as apiModule from '../lib/api'
import * as weekModule from '../lib/week'
import type { Crop, RecommendResponse, RecommendationItem, Region } from '../types'
import {
  DEFAULT_ACTIVE_WEEK,
  DEFAULT_WEEK,
  RecommendationRow,
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

  useEffect(() => {
    regionRef.current = region
  }, [region])

  const requestRecommendations = useCallback(
    async (inputWeek: string, options?: { preferLegacy?: boolean }) => {
      const targetRegion = regionRef.current
      const normalizedWeek = normalizeIsoWeek(inputWeek, activeWeek)
      setQueryWeek(normalizedWeek)
      const preferLegacy = options?.preferLegacy ?? false
      try {
        let response: RecommendResponse
        const callModern = async () => {
          if (typeof api.fetchRecommendations === 'function') {
            return api.fetchRecommendations(targetRegion, normalizedWeek)
          }
          throw new Error('missing fetchRecommendations')
        }
        const callLegacy = async () => {
          if (typeof api.fetchRecommend === 'function') {
            return api.fetchRecommend({ region: targetRegion, week: normalizedWeek })
          }
          throw new Error('missing fetchRecommend')
        }

        if (preferLegacy) {
          try {
            response = await callLegacy()
          } catch {
            response = await callModern()
          }
        } else {
          try {
            response = await callModern()
          } catch {
            response = await callLegacy()
          }
        }
        const { week: responseWeek, items: normalizedItems } = normalizeRecommendationResponse(
          response,
          normalizedWeek,
        )
        setItems(normalizedItems)
        setActiveWeek(responseWeek)
      } catch {
        setItems([])
      }
    },
    [activeWeek],
  )

  useEffect(() => {
    if (initialFetchRef.current) {
      return
    }
    initialFetchRef.current = true
    void requestRecommendations(currentWeekRef.current, { preferLegacy: true })
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

export const useRecommendations = ({ favorites }: UseRecommendationsOptions): UseRecommendationsResult => {
  const [region, setRegion] = useState<Region>('temperate')
  const cropIndex = useCropIndex()
  const { queryWeek, setQueryWeek, activeWeek, items, currentWeek, requestRecommendations } =
    useRecommendationLoader(region)

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
