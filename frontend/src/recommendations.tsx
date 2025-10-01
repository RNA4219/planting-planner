import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FavStar } from './components/FavStar'
import * as apiModule from './lib/api'
import * as weekModule from './lib/week'
import type { Crop, RecommendResponse, RecommendationItem, Region } from './types'

type RecommendationRow = RecommendationItem & { cropId?: number }

type WeekModule = typeof import('./lib/week') & {
  currentIsoWeek?: () => string
}

type LegacyFetchRecommend = (input: { region: Region; week?: string }) => Promise<RecommendResponse>

const week = weekModule as WeekModule
const api = apiModule as typeof import('./lib/api') & { fetchRecommend?: LegacyFetchRecommend }

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

interface UseRecommendationsOptions {
  favorites: readonly number[]
}

interface UseRecommendationsResult {
  region: Region
  setRegion: (region: Region) => void
  queryWeek: string
  setQueryWeek: (week: string) => void
  currentWeek: string
  displayWeek: string
  sortedRows: RecommendationRow[]
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export const useRecommendations = ({ favorites }: UseRecommendationsOptions): UseRecommendationsResult => {
  const [region, setRegion] = useState<Region>('temperate')
  const [queryWeek, setQueryWeek] = useState(DEFAULT_WEEK)
  const [activeWeek, setActiveWeek] = useState(DEFAULT_ACTIVE_WEEK)
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const currentWeekRef = useRef<string>(DEFAULT_WEEK)
  const initialFetchRef = useRef(false)

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

  const cropIndex = useMemo(() => {
    const map = new Map<string, number>()
    crops.forEach((crop) => {
      map.set(crop.name, crop.id)
    })
    return map
  }, [crops])

  const sortedRows = useMemo<RecommendationRow[]>(() => {
    const favoriteSet = new Set(favorites)
    return items
      .map((item) => ({
        ...item,
        cropId: cropIndex.get(item.crop),
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

  const requestRecommendations = useCallback(
    async (targetRegion: Region, inputWeek: string, options?: { preferLegacy?: boolean }) => {
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

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void requestRecommendations(region, queryWeek)
    },
    [queryWeek, region, requestRecommendations],
  )

  useEffect(() => {
    if (initialFetchRef.current) {
      return
    }
    initialFetchRef.current = true
    void requestRecommendations(region, currentWeekRef.current, { preferLegacy: true })
  }, [region, requestRecommendations])

  const displayWeek = useMemo(() => formatIsoWeek(activeWeek), [activeWeek])

  return {
    region,
    setRegion,
    queryWeek,
    setQueryWeek,
    currentWeek: currentWeekRef.current,
    displayWeek,
    sortedRows,
    handleSubmit,
  }
}

interface RecommendationsTableProps {
  rows: RecommendationRow[]
  isFavorite: (cropId?: number) => boolean
  onToggleFavorite: (cropId?: number) => void
}

export const RecommendationsTable = ({ rows, isFavorite, onToggleFavorite }: RecommendationsTableProps) => (
  <table className="recommend__table">
    <thead>
      <tr>
        <th scope="col">作物</th>
        <th scope="col">播種週</th>
        <th scope="col">収穫週</th>
        <th scope="col">情報源</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((item) => (
        <tr key={`${item.crop}-${item.sowing_week}-${item.harvest_week}`}>
          <td>
            <div className="recommend__crop">
              <FavStar
                active={isFavorite(item.cropId)}
                cropName={item.crop}
                onToggle={() => onToggleFavorite(item.cropId)}
              />
              <span>{item.crop}</span>
            </div>
          </td>
          <td>{formatIsoWeek(item.sowing_week)}</td>
          <td>{formatIsoWeek(item.harvest_week)}</td>
          <td>{item.source}</td>
        </tr>
      ))}
      {rows.length === 0 && (
        <tr>
          <td colSpan={4} className="recommend__empty">
            推奨データがありません
          </td>
        </tr>
      )}
    </tbody>
  </table>
)

export type { RecommendationRow }
