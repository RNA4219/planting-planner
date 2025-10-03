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
      <button
        className="app__refresh"
        type="button"
        onClick={() => {
          void onRefresh()
        }}
        disabled={refreshing}
      >
        更新
      </button>
    </form>
  )
}

SearchControls.displayName = 'SearchControls'
