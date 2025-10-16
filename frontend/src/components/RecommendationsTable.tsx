import { type KeyboardEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import { FavStar } from './FavStar'
import { RECOMMENDATIONS_TABLE_MESSAGES } from '../constants/messages'
import type { RecommendationRow } from '../hooks/recommendations/controller'
import type { CropCategory, MarketScope, Region } from '../types'
import { fetchMarkets } from '../lib/marketMetadata'

const TABLE_MESSAGES = RECOMMENDATIONS_TABLE_MESSAGES
const REGION_LABELS = TABLE_MESSAGES.regionNames
const CATEGORY_LABELS = TABLE_MESSAGES.categoryLabels

const isCropCategory = (value: string): value is CropCategory =>
  Object.hasOwn(CATEGORY_LABELS, value)

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
  tabpanelId?: string
  labelledById?: string
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
  tabpanelId,
  labelledById,
}: RecommendationsTableProps) => {
  const regionLabel = REGION_LABELS[region]
  const listLabel = TABLE_MESSAGES.listLabel(regionLabel, displayWeek)
  const resolvedTabpanelId = tabpanelId ?? 'recommendations-tabpanel'
  const resolvedLabelledById = labelledById ?? undefined

  const { data: marketsResponse } = useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarkets,
  })

  const activeMarketCategories = marketsResponse?.markets
    .find((market) => market.scope === marketScope)
    ?.categories

  const resolveCategoryLabel = (category: CropCategory): string => {
    if (activeMarketCategories) {
      const metadataCategory = activeMarketCategories.find(
        (item): item is { category: CropCategory; displayName: string } =>
          isCropCategory(item.category) && item.category === category,
      )
      if (metadataCategory) {
        return metadataCategory.displayName
      }
    }
    return CATEGORY_LABELS[category]
  }

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
    <section
      id={resolvedTabpanelId}
      role="tabpanel"
      aria-labelledby={resolvedLabelledById}
      className="space-y-4"
      aria-label={listLabel}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
          <span>
            {TABLE_MESSAGES.labels.region}: {regionLabel}
          </span>
          <span>
            {TABLE_MESSAGES.labels.baselineWeek}: {displayWeek}
          </span>
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
          <span className="sr-only">{TABLE_MESSAGES.status.loading}</span>
        </div>
      ) : rows.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-market-neutral/40 bg-market-neutral/10 p-8 text-center text-sm text-slate-500"
        >
          <span className="font-semibold text-slate-600">
            {TABLE_MESSAGES.status.emptyTitle}
          </span>
          <span>{TABLE_MESSAGES.status.emptyDescription}</span>
        </div>
      ) : (
        <table className="w-full border-separate border-spacing-4" aria-label={listLabel}>
          <thead className="sr-only">
            <tr>
              <th scope="col">{TABLE_MESSAGES.tableHeaders.crop}</th>
              <th scope="col">{TABLE_MESSAGES.tableHeaders.period}</th>
              <th scope="col">{TABLE_MESSAGES.tableHeaders.source}</th>
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
                        {TABLE_MESSAGES.labels.category}: {resolveCategoryLabel(item.category)}
                      </span>
                    ) : null}
                  </td>
                  <td className="grid grid-cols-2 gap-2 text-xs text-slate-600 align-top">
                    <div>
                      <p className="font-medium text-slate-500">
                        {TABLE_MESSAGES.labels.sowingWeek}
                      </p>
                      <p className="text-sm text-slate-700">{item.sowingWeekLabel}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-500">
                        {TABLE_MESSAGES.labels.harvestWeek}
                      </p>
                      <p className="text-sm text-slate-700">{item.harvestWeekLabel}</p>
                    </div>
                  </td>
                  <td className="text-xs text-slate-600 align-top">
                    <p className="font-medium text-slate-500">
                      {TABLE_MESSAGES.labels.source}
                    </p>
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
