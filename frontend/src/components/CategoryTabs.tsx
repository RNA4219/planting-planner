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

export const CategoryTabs = ({ category, onChange }: CategoryTabsProps) => {
  return (
    <div className="category-tabs" role="tablist" aria-label="カテゴリ">
      {CATEGORY_ORDER.map((key) => {
        const isActive = key === category
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`category-tabs__tab${isActive ? ' category-tabs__tab--active' : ''}`}
            onClick={() => {
              if (!isActive) {
                onChange(key)
              }
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
