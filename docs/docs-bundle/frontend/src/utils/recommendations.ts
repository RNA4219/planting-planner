import * as weekModule from '../lib/week'
import type { CropCategory, RecommendResponse, RecommendationItem } from '../types'

const week = weekModule as typeof import('../lib/week') & {
  currentIsoWeek?: () => string
}

const { compareIsoWeek, formatIsoWeek, normalizeIsoWeek } = week

export const isCropCategory = (value: unknown): value is CropCategory =>
  value === 'leaf' || value === 'root' || value === 'flower'

export type RecommendationRow = RecommendationItem & {
  cropId?: number
  category?: CropCategory
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

export type RecommendationSource = 'modern' | 'legacy'

export interface NormalizeRecommendationResult {
  week: string
  items: RecommendationItem[]
  source: RecommendationSource
}

export const normalizeRecommendationResponse = (
  response: RecommendResponse,
  fallbackWeek: string,
  source: RecommendationSource = 'modern',
): NormalizeRecommendationResult => {
  const weekValue = normalizeIsoWeek(response.week, fallbackWeek)
  const normalizedItems = response.items.map<RecommendationItem>((item) => {
    const normalizedSowingWeek = normalizeIsoWeek(item.sowing_week, weekValue)
    const normalizedHarvestWeek = normalizeIsoWeek(item.harvest_week, weekValue)
    return {
      ...item,
      sowing_week: normalizedSowingWeek,
      harvest_week: normalizedHarvestWeek,
    }
  })
  return {
    week: weekValue,
    items: normalizedItems,
    source,
  }
}

interface BuildRecommendationRowsArgs {
  items: RecommendationItem[]
  favorites: readonly number[]
  cropIndex: Map<string, { id: number; category?: CropCategory }>
}

export const buildRecommendationRows = ({
  items,
  favorites,
  cropIndex,
}: BuildRecommendationRowsArgs): RecommendationRow[] => {
  const favoriteSet = new Set(favorites)
  return items
    .map<RecommendationRow>((item) => {
      const catalogEntry = cropIndex.get(item.crop)
      const category = catalogEntry?.category
      return {
        ...item,
        cropId: catalogEntry?.id,
        category: isCropCategory(category) ? category : undefined,
        rowKey: `${item.crop}-${item.sowing_week}-${item.harvest_week}`,
        sowingWeekLabel: formatIsoWeek(item.sowing_week),
        harvestWeekLabel: formatIsoWeek(item.harvest_week),
      }
    })
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
