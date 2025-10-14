import { useCallback, useState } from 'react'

import { DEFAULT_CATEGORY_TABS, type CategoryTabDefinition } from '../components/CategoryTabs'
import {
  MARKET_SCOPE_FALLBACK_DEFINITIONS,
  type MarketScopeOption,
} from '../constants/marketScopes'
import type { CropCategory, MarketScope } from '../types'
import { isCropCategory } from '../utils/recommendations'

export type CategoryTabsResolver = (
  scope: MarketScope,
) => readonly CategoryTabDefinition[]

export type CategoryValidator = (
  scope: MarketScope,
  category: CropCategory,
) => CropCategory

export type CategoryTabsUpdater = (
  markets: readonly MarketScopeOption[],
) => void

type CategoryTabsMap = Map<MarketScope, readonly CategoryTabDefinition[]>

export type UseCategoryTabsResult = {
  resolveCategoriesForScope: CategoryTabsResolver
  ensureValidCategory: CategoryValidator
  handleMarketsUpdate: CategoryTabsUpdater
}

const areCategoryTabsEqual = (
  a: readonly CategoryTabDefinition[],
  b: readonly CategoryTabDefinition[],
) =>
  a.length === b.length &&
  a.every((tab, index) => {
    const other = b[index]
    return other !== undefined && other.key === tab.key && other.label === tab.label
  })

const buildCategoryTabsFromMetadata = (
  categories: MarketScopeOption['categories'],
): readonly CategoryTabDefinition[] => {
  if (!categories) {
    return DEFAULT_CATEGORY_TABS
  }
  type CropCategoryEntry = {
    category: NonNullable<MarketScopeOption['categories']>[number] & {
      category: CropCategory
    }
    index: number
  }

  const mapped = categories
    .map((category, index) => ({ category, index }))
    .filter((entry): entry is CropCategoryEntry =>
      isCropCategory(entry.category.category),
    )

  if (mapped.length > 0) {
    const sorted = [...mapped].sort((a, b) => {
      const priorityA = a.category.priority
      const priorityB = b.category.priority
      if (priorityA == null && priorityB == null) {
        return a.index - b.index
      }
      if (priorityA == null) {
        return 1
      }
      if (priorityB == null) {
        return -1
      }
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      return a.index - b.index
    })

    return sorted.map(({ category }) => ({
      key: category.category,
      label: category.displayName,
    }))
  }
  return DEFAULT_CATEGORY_TABS
}

const createInitialCategoryTabsMap = (): CategoryTabsMap => {
  const map: CategoryTabsMap = new Map()
  MARKET_SCOPE_FALLBACK_DEFINITIONS.forEach((definition) => {
    const categories =
      definition.categories && definition.categories.length > 0
        ? definition.categories
        : undefined
    map.set(definition.scope, buildCategoryTabsFromMetadata(categories))
  })
  return map
}

export const useCategoryTabs = (): UseCategoryTabsResult => {
  const [categoryTabsByScope, setCategoryTabsByScope] = useState<CategoryTabsMap>(
    createInitialCategoryTabsMap,
  )

  const resolveCategoriesForScope: CategoryTabsResolver = useCallback(
    (scope) => {
      return categoryTabsByScope.get(scope) ?? DEFAULT_CATEGORY_TABS
    },
    [categoryTabsByScope],
  )

  const ensureValidCategory: CategoryValidator = useCallback(
    (scope, currentCategory) => {
      const tabs = resolveCategoriesForScope(scope)
      if (!tabs.length) {
        return currentCategory
      }
      return tabs.some((tab) => tab.key === currentCategory)
        ? currentCategory
        : tabs[0]!.key
    },
    [resolveCategoriesForScope],
  )

  const handleMarketsUpdate: CategoryTabsUpdater = useCallback((markets) => {
    setCategoryTabsByScope((prev) => {
      let updated = false
      const next = new Map(prev)
      markets.forEach((market) => {
        const tabs = buildCategoryTabsFromMetadata(market.categories)
        const current = next.get(market.scope)
        if (!current || !areCategoryTabsEqual(current, tabs)) {
          next.set(market.scope, tabs)
          updated = true
        }
      })
      return updated ? next : prev
    })
  }, [])

  return { resolveCategoriesForScope, ensureValidCategory, handleMarketsUpdate }
}
