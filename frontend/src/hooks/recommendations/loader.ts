import { useCallback, useEffect, useRef, useState } from 'react'

import type { RecommendationItem, Region } from '../../types'
import { DEFAULT_ACTIVE_WEEK, DEFAULT_WEEK } from '../../utils/recommendations'
import * as weekModule from '../../lib/week'

import { useRecommendationFetcher } from '../recommendationFetcher'
import { normalizeWeekInput } from './weekNormalization'

const week = weekModule as typeof import('../../lib/week')
const { normalizeIsoWeek } = week

type RequestMeta = { id: number; region: Region; week: string }
type RequestOptions = { preferLegacy?: boolean; regionOverride?: Region }

export interface UseRecommendationLoaderResult {
  queryWeek: string
  setQueryWeek: (week: string) => void
  activeWeek: string
  items: RecommendationItem[]
  currentWeek: string
  requestRecommendations: (
    inputWeek: string,
    options?: RequestOptions,
  ) => Promise<void>
}

export const useRecommendationLoader = (region: Region): UseRecommendationLoaderResult => {
  const [queryWeek, setQueryWeek] = useState(DEFAULT_WEEK)
  const [activeWeek, setActiveWeek] = useState(DEFAULT_ACTIVE_WEEK)
  const [items, setItems] = useState<RecommendationItem[]>([])
  const currentWeekRef = useRef<string>(DEFAULT_WEEK)
  const initialFetchRef = useRef(false)
  const trackerRef = useRef<RequestMeta>({ id: 0, region, week: DEFAULT_WEEK })
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
      const normalizedWeek = normalizeWeek(inputWeek)
      setQueryWeek(normalizedWeek)
      currentWeekRef.current = normalizedWeek
      const requestMeta: RequestMeta = {
        id: trackerRef.current.id + 1,
        region: targetRegion,
        week: normalizedWeek,
      }
      trackerRef.current = requestMeta
      const isLatest = () => {
        const latest = trackerRef.current
        return latest.id === requestMeta.id && latest.region === requestMeta.region && latest.week === requestMeta.week
      }
      try {
        const result = await fetchRecommendations({
          region: targetRegion,
          week: normalizedWeek,
          preferLegacy: options?.preferLegacy,
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
    [applyWeek, fetchRecommendations, normalizeWeek, region],
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
