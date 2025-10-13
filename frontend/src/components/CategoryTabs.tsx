import type { KeyboardEvent } from 'react'

import type { CropCategory } from '../types'

const CATEGORY_LABELS = {
  leaf: '葉菜',
  root: '根菜',
  flower: '花き',
  fruit: '果菜',
} as const satisfies Record<CropCategory, string>

const CATEGORY_ORDER = ['leaf', 'root', 'flower', 'fruit'] as const satisfies readonly CropCategory[]

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
  'rounded-full bg-transparent px-3 py-2 text-sm font-semibold text-market-700 transition-colors duration-200 hover:bg-market-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-400 aria-selected:bg-market-600 aria-selected:text-white'

export const CategoryTabs = ({ category, onChange }: CategoryTabsProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return
    }

    event.preventDefault()

    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = wrapIndex(currentIndex + delta, CATEGORY_ORDER.length)
    const nextCategory = CATEGORY_ORDER[nextIndex]!

    if (nextCategory !== category) {
      onChange(nextCategory)
    }

    const tablist = event.currentTarget.closest('[role="tablist"]')
    const tabs = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[nextIndex]?.focus()
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-market-50 p-1"
      role="tablist"
      aria-label="カテゴリ"
    >
      {CATEGORY_ORDER.map((key, index) => {
        const isActive = key === category
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={TAB_CLASS}
            onClick={() => {
              if (!isActive) {
                onChange(key)
              }
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, index)
            }}
          >
            {CATEGORY_LABELS[key]}
          </button>
        )
      })}
    </div>
  )
}

CategoryTabs.displayName = 'CategoryTabs'
