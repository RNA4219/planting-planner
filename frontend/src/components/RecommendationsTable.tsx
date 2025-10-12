import { type ReactNode } from 'react'

import { FavStar } from './FavStar'
import type { RecommendationRow } from '../hooks/useRecommendations'
import type { Region } from '../types'

const REGION_LABEL: Record<Region, string> = {
  cold: '寒冷地',
  temperate: '温暖地',
  warm: '暖地',
}

interface RecommendationsTableProps {
  region: Region
  displayWeek: string
  rows: RecommendationRow[]
  selectedCropId: number | null
  onSelect: (cropId: number | null) => void
  onToggleFavorite: (cropId?: number) => void
  isFavorite: (cropId?: number) => boolean
  headerSlot?: ReactNode
}

export const RecommendationsTable = ({
  region,
  displayWeek,
  rows,
  selectedCropId,
  onSelect,
  onToggleFavorite,
  isFavorite,
  headerSlot,
}: RecommendationsTableProps) => {
  return (
    <section className="recommend">
      <div className="recommend__header">
        <div className="recommend__meta">
          <span>対象地域: {REGION_LABEL[region]}</span>
          <span>基準週: {displayWeek}</span>
        </div>
        {headerSlot}
      </div>
      <table className="recommend__table">
        <thead>
          <tr>
            <th scope="col">作物</th>
            <th scope="col">播種週</th>
            <th scope="col">収穫週</th>
            <th scope="col">情報源</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const isSelected = item.cropId !== undefined && item.cropId === selectedCropId
            return (
              <tr
                key={item.rowKey}
                className={`recommend__row${isSelected ? ' recommend__row--selected' : ''}`}
                onClick={() => onSelect(item.cropId ?? null)}
                tabIndex={0}
                role="row"
                aria-selected={isSelected}
                onKeyDown={(event) => {
                  if (event.defaultPrevented) {
                    return
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    onSelect(item.cropId ?? null)
                  } else if (event.key === ' ') {
                    event.preventDefault()
                    onToggleFavorite(item.cropId)
                  }
                }}
              >
                <td>
                  <div className="recommend__crop">
                    <FavStar
                      active={isFavorite(item.cropId)}
                      cropName={item.crop}
                      onToggle={() => onToggleFavorite(item.cropId)}
                    />
                    <span>{item.crop}</span>
                  </div>
                </td>
                <td>{item.sowingWeekLabel}</td>
                <td>{item.harvestWeekLabel}</td>
                <td>{item.source}</td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="recommend__empty">
                推奨データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

RecommendationsTable.displayName = 'RecommendationsTable'
