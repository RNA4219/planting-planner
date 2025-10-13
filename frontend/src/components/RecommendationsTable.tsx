import { type KeyboardEvent, type ReactNode } from 'react'

import { FavStar } from './FavStar'
import type { RecommendationRow } from '../hooks/useRecommendations'
import type { CropCategory, MarketScope, Region } from '../types'

const REGION_LABEL: Record<Region, string> = {
  cold: '寒冷地',
  temperate: '温暖地',
  warm: '暖地',
}

const CATEGORY_LABELS: Record<CropCategory, string> = {
  leaf: '葉菜類',
  root: '根菜類',
  flower: '花き',
}

const resolveMarketScopeTheme = (marketScope: MarketScope): string => {
  if (marketScope === 'national') {
    return 'bg-market-national border-market-national'
  }
  if (marketScope.startsWith('city:')) {
    return 'bg-market-city border-market-city'
  }
  return 'bg-market-neutral border-market-neutral'
}

interface RecommendationsTableProps {
  region: Region
  displayWeek: string
  rows: RecommendationRow[]
  selectedCropId: number | null
  onSelect: (cropId: number | null) => void
  onToggleFavorite: (cropId?: number) => void
  isFavorite: (cropId?: number) => boolean
  marketScope: MarketScope
  headerSlot?: ReactNode
  isLoading?: boolean
}

export const RecommendationsTable = ({
  region,
  displayWeek,
  rows,
  selectedCropId,
  onSelect,
  onToggleFavorite,
  isFavorite,
  marketScope,
  headerSlot,
  isLoading = false,
}: RecommendationsTableProps) => {
  const listLabel = `${REGION_LABEL[region]}向けの推奨一覧（基準週: ${displayWeek}）`

  const handleInteractiveKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    cropId?: number,
  ) => {
    if (event.defaultPrevented) {
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      onSelect(cropId ?? null)
    } else if (event.key === ' ') {
      event.preventDefault()
      onToggleFavorite(cropId)
    }
  }

  return (
    <section className="space-y-4" aria-label={listLabel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
          <span>対象地域: {REGION_LABEL[region]}</span>
          <span>基準週: {displayWeek}</span>
        </div>
        {headerSlot}
      </div>
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-dashed border-market-neutral/40 bg-market-neutral/10 p-4"
            >
              <div className="h-4 w-24 rounded-full bg-market-neutral/40" />
              <div className="mt-3 h-3 w-32 rounded-full bg-market-neutral/30" />
              <div className="mt-6 space-y-2">
                <div className="h-3 w-full rounded-full bg-market-neutral/30" />
                <div className="h-3 w-5/6 rounded-full bg-market-neutral/20" />
              </div>
            </div>
          ))}
          <span className="sr-only">読み込み中</span>
        </div>
      ) : rows.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-market-neutral/40 bg-market-neutral/10 p-8 text-center text-sm text-slate-500"
        >
          <span className="font-semibold text-slate-600">推奨データがありません</span>
          <span>市場やカテゴリを変更して再度お試しください。</span>
        </div>
      ) : (
        <table className="w-full border-separate border-spacing-4" aria-label={listLabel}>
          <thead className="sr-only">
            <tr>
              <th scope="col">作物</th>
              <th scope="col">期間</th>
              <th scope="col">情報源</th>
            </tr>
          </thead>
          <tbody className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((item) => {
              const isSelected = item.cropId !== undefined && item.cropId === selectedCropId
              return (
                <tr
                  key={item.rowKey}
                  data-testid="recommendation-card"
                  tabIndex={0}
                  aria-selected={isSelected}
                  data-state={isSelected ? 'selected' : undefined}
                  className={`card-market ${resolveMarketScopeTheme(marketScope)} ${
                    isSelected ? 'ring-2 ring-market-accent' : 'ring-0'
                  }`}
                  onClick={() => onSelect(item.cropId ?? null)}
                  onKeyDown={(event) => handleInteractiveKeyDown(event, item.cropId)}
                >
                  <td className="flex items-start justify-between gap-3 align-top">
                    <div className="flex items-start gap-2">
                      <FavStar
                        active={isFavorite(item.cropId)}
                        cropName={item.crop}
                        onToggle={() => onToggleFavorite(item.cropId)}
                      />
                      <span className="text-sm font-semibold text-slate-700">{item.crop}</span>
                    </div>
                    {item.category ? (
                      <span className="text-xs text-slate-500">
                        カテゴリ: {CATEGORY_LABELS[item.category]}
                      </span>
                    ) : null}
                  </td>
                  <td className="grid grid-cols-2 gap-2 text-xs text-slate-600 align-top">
                    <div>
                      <p className="font-medium text-slate-500">播種週</p>
                      <p className="text-sm text-slate-700">{item.sowingWeekLabel}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-500">収穫週</p>
                      <p className="text-sm text-slate-700">{item.harvestWeekLabel}</p>
                    </div>
                  </td>
                  <td className="text-xs text-slate-600 align-top">
                    <p className="font-medium text-slate-500">情報源</p>
                    <p className="text-sm text-slate-700">{item.source}</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

RecommendationsTable.displayName = 'RecommendationsTable'
