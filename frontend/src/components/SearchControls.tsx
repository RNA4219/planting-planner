import type { ChangeEvent, FormEvent } from 'react'

import { RegionSelect } from './RegionSelect'
import type { Region } from '../types'

interface SearchControlsProps {
  queryWeek: string
  currentWeek: string
  onWeekChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRegionChange: (region: Region) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRefresh: () => void | Promise<void>
  refreshing: boolean
}

export const SearchControls = ({
  queryWeek,
  currentWeek,
  onWeekChange,
  onRegionChange,
  onSubmit,
  onRefresh,
  refreshing,
}: SearchControlsProps) => {
  return (
    <form className="app__controls" onSubmit={onSubmit} noValidate>
      <RegionSelect onChange={onRegionChange} />
      <div className="app__controls-group">
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
        <div className="app__controls-actions">
          <button type="submit">この条件で見る</button>
          <button
            className={`app__refresh${refreshing ? ' app__refresh--loading' : ''}`}
            type="button"
            onClick={() => {
              void onRefresh()
            }}
            disabled={refreshing}
          >
            {refreshing ? '更新中...' : '更新'}
          </button>
        </div>
      </div>
    </form>
  )
}

SearchControls.displayName = 'SearchControls'
