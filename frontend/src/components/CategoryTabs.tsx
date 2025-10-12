import type { CropCategory } from '../types'

export const CATEGORY_PANEL_ID = 'recommendations-panel' as const
type CategoryTabId = `category-tab-${CropCategory}`

export const getCategoryTabId = (category: CropCategory): CategoryTabId =>
  `category-tab-${category}`

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
  panelId?: string
}

export const CategoryTabs = ({
  category,
  onChange,
  panelId = CATEGORY_PANEL_ID,
}: CategoryTabsProps) => {
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
            id={getCategoryTabId(key)}
            aria-controls={panelId}
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
