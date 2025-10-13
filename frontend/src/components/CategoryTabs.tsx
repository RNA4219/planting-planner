import type { KeyboardEvent } from 'react'

import type { CropCategory } from '../types'

interface CategoryTabDefinition {
  key: CropCategory
  label: string
}

const CATEGORY_TABS = [
  { key: 'leaf', label: '葉菜' },
  { key: 'root', label: '根菜' },
  { key: 'flower', label: '花き' },
] as const satisfies readonly CategoryTabDefinition[]

interface CategoryTabsProps {
  category: CropCategory
  onChange: (next: CropCategory) => void
}

const wrapIndex = (index: number, length: number) => {
  if (length === 0) {
    return 0
  }
  return (index + length) % length
}

const TAB_CLASS =
  'rounded-full bg-transparent px-3 py-2 text-sm font-semibold text-market-neutral-strong transition-colors duration-200 hover:bg-market-neutral-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-accent aria-selected:bg-market-accent aria-selected:text-white'

export const CategoryTabs = ({ category, onChange }: CategoryTabsProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return
    }

    event.preventDefault()

    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = wrapIndex(currentIndex + delta, CATEGORY_TABS.length)
    const nextTab = CATEGORY_TABS[nextIndex]

    if (nextTab && nextTab.key !== category) {
      onChange(nextTab.key)
    }

    const tablist = event.currentTarget.closest('[role="tablist"]')
    const tabs = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[nextIndex]?.focus()
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-market-neutral-container p-1"
      role="tablist"
      aria-label="カテゴリ"
    >
      {CATEGORY_TABS.map((tab: CategoryTabDefinition, index: number) => {
        const isActive = tab.key === category
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={TAB_CLASS}
            onClick={() => {
              if (!isActive) {
                onChange(tab.key)
              }
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, index)
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
