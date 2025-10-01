import { ChangeEvent, useCallback } from 'react'

import { useFavorites } from './components/FavStar'
import { RegionSelect } from './components/RegionSelect'
import { postRefresh } from './lib/api'
import type { Region } from './types'
import { RecommendationsTable, useRecommendations } from './recommendations'
import './App.css'

const REGION_LABEL: Record<Region, string> = {
  cold: '寒冷地',
  temperate: '温暖地',
  warm: '暖地',
}

export const App = () => {
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { region, setRegion, queryWeek, setQueryWeek, currentWeek, displayWeek, sortedRows, handleSubmit } =
    useRecommendations({ favorites })

  const handleRegionChange = useCallback(
    (next: Region) => {
      setRegion(next)
    },
    [setRegion],
  )

  const handleWeekChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQueryWeek(event.target.value)
    },
    [setQueryWeek],
  )

  const handleRefresh = useCallback(() => {
    void postRefresh()
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Planting Planner</h1>
        <form className="app__controls" onSubmit={handleSubmit}>
          <RegionSelect onChange={handleRegionChange} />
          <label className="app__week" htmlFor="week-input">
            週
            <input
              id="week-input"
              name="week"
              type="text"
              value={queryWeek}
              onChange={handleWeekChange}
              placeholder={currentWeek}
              pattern="\d{4}-W\d{2}"
              inputMode="numeric"
            />
          </label>
          <button type="submit">この条件で見る</button>
          <button className="app__refresh" type="button" onClick={handleRefresh}>
            更新
          </button>
        </form>
      </header>
      <main className="app__main">
        <section className="recommend">
          <div className="recommend__meta">
            <span>対象地域: {REGION_LABEL[region]}</span>
            <span>基準週: {displayWeek}</span>
          </div>
          <RecommendationsTable
            rows={sortedRows}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </main>
    </div>
  )
}

export default App
