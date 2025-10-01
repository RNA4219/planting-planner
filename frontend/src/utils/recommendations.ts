import * as weekModule from '../lib/week'
import type { RecommendResponse, RecommendationItem } from '../types'

const week = weekModule as typeof import('../lib/week') & {
  currentIsoWeek?: () => string
}

const { compareIsoWeek, formatIsoWeek, normalizeIsoWeek } = week

export type RecommendationRow = RecommendationItem & {
  cropId?: number
  rowKey: string
  sowingWeekLabel: string
  harvestWeekLabel: string
}

export const resolveCurrentWeek = (): string => {
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

export const DEFAULT_WEEK = resolveCurrentWeek()
export const DEFAULT_ACTIVE_WEEK = normalizeIsoWeek(DEFAULT_WEEK)

export interface NormalizeRecommendationResult {
  week: string
  items: RecommendationItem[]
}

export const normalizeRecommendationResponse = (
  response: RecommendResponse,
  fallbackWeek: string,
): NormalizeRecommendationResult => {
  const weekValue = normalizeIsoWeek(response.week, fallbackWeek)
  const normalizedItems = response.items.map<RecommendationItem>((item) => ({
    ...item,
    sowing_week: normalizeIsoWeek(item.sowing_week),
    harvest_week: normalizeIsoWeek(item.harvest_week),
  }))
  return {
    week: weekValue,
    items: normalizedItems,
  }
}

interface BuildRecommendationRowsArgs {
  items: RecommendationItem[]
  favorites: readonly number[]
  cropIndex: Map<string, number>
}

export const buildRecommendationRows = ({
  items,
  favorites,
  cropIndex,
}: BuildRecommendationRowsArgs): RecommendationRow[] => {
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
}

export const formatWeekLabel = (value: string): string => formatIsoWeek(value)
