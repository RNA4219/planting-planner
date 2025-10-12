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

export const CategoryTabs = ({ category, onChange }: CategoryTabsProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return
    }

    event.preventDefault()

    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = wrapIndex(currentIndex + delta, CATEGORY_ORDER.length)
    const nextCategory = CATEGORY_ORDER[nextIndex] ?? category

    if (nextCategory !== category) {
      onChange(nextCategory)
    }

    const tablist = event.currentTarget.closest('[role="tablist"]')
    const tabs = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[nextIndex]?.focus()
  }

  return (
    <div className="category-tabs" role="tablist" aria-label="カテゴリ">
      {CATEGORY_ORDER.map((key, index) => {
        const isActive = key === category
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`category-tabs__tab${isActive ? ' category-tabs__tab--active' : ''}`}
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
