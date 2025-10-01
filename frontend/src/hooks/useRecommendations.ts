import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as apiModule from '../lib/api'
import * as weekModule from '../lib/week'
import type { Crop, RecommendResponse, RecommendationItem, Region } from '../types'

const week = weekModule as typeof import('../lib/week') & {
  currentIsoWeek?: () => string
}

const api = apiModule as typeof import('../lib/api') & {
  fetchRecommend?: (input: { region: Region; week?: string }) => Promise<RecommendResponse>
}

const { compareIsoWeek, formatIsoWeek, normalizeIsoWeek } = week
const fetchCrops = api.fetchCrops

const resolveCurrentWeek = (): string => {
  let currentWeekFn: (() => string) | undefined
  try {
    currentWeekFn = week.getCurrentIsoWeek
  } catch {
    currentWeekFn = undefined
  }
  if (typeof currentWeekFn === 'function') {
    return currentWeekFn()
  }

  let legacyWeekFn: (() => string) | undefined
  try {
    legacyWeekFn = week.currentIsoWeek
  } catch {
    legacyWeekFn = undefined
  }
  if (typeof legacyWeekFn === 'function') {
    return legacyWeekFn()
  }

  return week.normalizeIsoWeek(undefined, '1970-W01')
}

const DEFAULT_WEEK = resolveCurrentWeek()
const DEFAULT_ACTIVE_WEEK = normalizeIsoWeek(DEFAULT_WEEK)

export type RecommendationRow = RecommendationItem & {
  cropId?: number
  rowKey: string
  sowingWeekLabel: string
  harvestWeekLabel: string
}

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

interface UseRecommendationLoaderResult {
  queryWeek: string
  setQueryWeek: (week: string) => void
  activeWeek: string
  items: RecommendationItem[]
  currentWeek: string
  requestRecommendations: (inputWeek: string, options?: { preferLegacy?: boolean }) => Promise<void>
}

const useRecommendationLoader = (region: Region): UseRecommendationLoaderResult => {
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
        const resolvedWeek = normalizeIsoWeek(response.week, normalizedWeek)
        const normalizedItems = response.items.map((item) => ({
          ...item,
          sowing_week: normalizeIsoWeek(item.sowing_week),
          harvest_week: normalizeIsoWeek(item.harvest_week),
        }))
        setItems(normalizedItems)
        setActiveWeek(resolvedWeek)
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
    const favoriteSet = new Set(favorites)
    return items
      .map<RecommendationRow>((item) => ({
        ...item,
        cropId: cropIndex.get(item.crop),
        rowKey: `${item.crop}-${item.sowing_week}-${item.harvest_week}`,
        sowingWeekLabel: formatIsoWeek(item.sowing_week),
        harvestWeekLabel: formatIsoWeek(item.harvest_week),
      }))
      .sort((a, b) => {
        const aFav = a.cropId !== undefined && favoriteSet.has(a.cropId) ? 1 : 0
        const bFav = b.cropId !== undefined && favoriteSet.has(b.cropId) ? 1 : 0
        if (aFav !== bFav) {
          return bFav - aFav
        }
        const weekDiff = compareIsoWeek(a.sowing_week, b.sowing_week)
        if (weekDiff !== 0) {
          return weekDiff
        }
        return a.crop.localeCompare(b.crop, 'ja')
      })
  }, [items, cropIndex, favorites])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void requestRecommendations(queryWeek)
    },
    [queryWeek, requestRecommendations],
  )

  const displayWeek = useMemo(() => formatIsoWeek(activeWeek), [activeWeek])

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

export type { UseRecommendationsOptions, UseRecommendationsResult }
