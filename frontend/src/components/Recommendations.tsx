import { ChangeEvent, FormEvent } from 'react'

import type { RecommendationRow, Region } from '../types'
import { FavStar } from './FavStar'
import { RegionSelect } from './RegionSelect'

interface RefreshControlsProps {
  queryWeek: string
  currentWeek: string
  onWeekChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRefresh: () => Promise<void> | void
  refreshing: boolean
  onRegionChange: (region: Region) => void
}

export const RefreshControls = ({
  queryWeek,
  currentWeek,
  onWeekChange,
  onSubmit,
  onRefresh,
  refreshing,
  onRegionChange,
}: RefreshControlsProps) => {
  return (
    <form className="app__controls" onSubmit={onSubmit}>
      <RegionSelect onChange={onRegionChange} />
      <label className="app__week" htmlFor="week-input">
        週
        <input
          id="week-input"
          name="week"
          type="text"
          value={queryWeek}
          onChange={onWeekChange}
          placeholder={currentWeek}
          pattern="\d{4}-W\d{2}"
          inputMode="numeric"
        />
      </label>
      <button type="submit">この条件で見る</button>
      <button className="app__refresh" type="button" onClick={() => void onRefresh()} disabled={refreshing}>
        更新
      </button>
    </form>
  )
}

interface RefreshMessageProps {
  message: string
  failed: boolean
}

export const RefreshMessage = ({ message, failed }: RefreshMessageProps) => {
  const className = `app__refresh-message${failed ? ' app__refresh-message--error' : ''}`
  return (
    <div className={className} role={failed ? 'alert' : 'status'}>
      {message}
    </div>
  )
}

interface RecommendationTableProps {
  rows: RecommendationRow[]
  selectedCropId: number | null
  onSelect: (cropId: number | null) => void
  isFavorite: (cropId: number | undefined) => boolean
  toggleFavorite: (cropId: number | undefined) => void
}

export const RecommendationTable = ({
  rows,
  selectedCropId,
  onSelect,
  isFavorite,
  toggleFavorite,
}: RecommendationTableProps) => {
  return (
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
            >
              <td>
                <div className="recommend__crop">
                  <FavStar
                    active={isFavorite(item.cropId)}
                    cropName={item.crop}
                    onToggle={() => toggleFavorite(item.cropId)}
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
  )
}
