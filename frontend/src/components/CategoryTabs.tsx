import type { KeyboardEvent } from 'react'

import type { FeatureFlagConfig } from '../constants/messages'
import type { CropCategory } from '../types'

export interface CategoryTabDefinition {
  key: CropCategory
  label: string
}

type Locale = 'ja' | 'en'

type CategoryTabsDictionary = {
  readonly tablistLabel: string
  readonly tabs: readonly CategoryTabDefinition[]
}

const CATEGORY_TABS_DICTIONARY: Record<Locale, CategoryTabsDictionary> = {
  ja: {
    tablistLabel: 'カテゴリ',
    tabs: [
      { key: 'leaf', label: '葉菜' },
      { key: 'root', label: '根菜' },
      { key: 'flower', label: '花き' },
    ] as const satisfies readonly CategoryTabDefinition[],
  },
  en: {
    tablistLabel: 'Category',
    tabs: [
      { key: 'leaf', label: 'Leafy vegetables' },
      { key: 'root', label: 'Root vegetables' },
      { key: 'flower', label: 'Flower crops' },
    ] as const satisfies readonly CategoryTabDefinition[],
  },
}

export const DEFAULT_CATEGORY_TABS = CATEGORY_TABS_DICTIONARY.ja.tabs

const resolveLocale = (): Locale => {
  if (typeof document === 'undefined') {
    return 'ja'
  }

  const lang = document.documentElement.lang?.toLowerCase() ?? ''

  if (!lang.startsWith('en')) {
    return 'ja'
  }

  const flag = (globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS?.I18N_EN

  if (typeof flag === 'boolean') {
    return flag ? 'en' : 'ja'
  }

  const envFlag = import.meta.env?.VITE_I18N_EN

  if (typeof envFlag === 'string') {
    return envFlag.toLowerCase() === 'true' ? 'en' : 'ja'
  }

  return 'ja'
}

interface CategoryTabsProps {
  category: CropCategory
  categories?: readonly CategoryTabDefinition[]
  onChange: (next: CropCategory) => void
  controlsId?: string
}

const resolveTabId = (key: CropCategory) => `category-tab-${key}`

const wrapIndex = (index: number, length: number) => {
  if (length === 0) {
    return 0
  }
  return (index + length) % length
}

const TAB_CLASS =
  'rounded-full bg-transparent px-3 py-2 text-sm font-semibold text-market-neutral-strong transition-colors duration-200 hover:bg-market-neutral-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-accent aria-selected:bg-market-accent aria-selected:text-white'

export const CategoryTabs = ({ category, categories, onChange, controlsId }: CategoryTabsProps) => {
  const locale = resolveLocale()
  const dictionary = CATEGORY_TABS_DICTIONARY[locale]
  const useDictionaryTabs = categories === undefined || categories === DEFAULT_CATEGORY_TABS
  const tabs: readonly CategoryTabDefinition[] = useDictionaryTabs ? dictionary.tabs : categories

  if (!tabs.length) {
    return null
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
    tabs: readonly CategoryTabDefinition[],
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return
    }

    event.preventDefault()

    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = wrapIndex(currentIndex + delta, tabs.length)
    const nextTab = tabs[nextIndex]

    if (nextTab && nextTab.key !== category) {
      onChange(nextTab.key)
    }

    const tablist = event.currentTarget.closest('[role="tablist"]')
    const tabElements = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabElements?.[nextIndex]?.focus()
  }

  return (
    <div
      className="flex w-full flex-col items-stretch gap-1 rounded-full bg-market-neutral-container p-1 sm:inline-flex sm:flex-row sm:items-center"
      role="tablist"
      aria-label={dictionary.tablistLabel}
      aria-controls={controlsId}
    >
      {tabs.map((tab: CategoryTabDefinition, index: number) => {
        const isActive = tab.key === category
        const tabId = resolveTabId(tab.key)
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={tabId}
            aria-controls={controlsId}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`${TAB_CLASS} w-full sm:w-auto`}
            onClick={() => {
              if (!isActive) {
                onChange(tab.key)
              }
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, index, tabs)
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

CategoryTabs.displayName = 'CategoryTabs'
