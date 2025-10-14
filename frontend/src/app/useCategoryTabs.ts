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
  const mapped = categories
    .map((category) => {
      if (!isCropCategory(category.category)) {
        return null
      }
      return { key: category.category, label: category.displayName }
    })
    .filter((category): category is CategoryTabDefinition => category !== null)
  if (mapped.length > 0) {
    return mapped
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
