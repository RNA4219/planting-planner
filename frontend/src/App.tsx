import { ChangeEvent, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useFavorites } from './components/FavStar'
import { PriceChart } from './components/PriceChart'
import { RefreshControls, RefreshMessage, RecommendationTable } from './components/Recommendations'
import { useRecommendations } from './hooks/useRecommendations'
import { postRefresh } from './lib/api'
import { loadRegion } from './lib/storage'
import { normalizeIsoWeek } from './lib/week'
import type { Region } from './types'

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
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const initialRegionSet = useRef(false)

  useLayoutEffect(() => {
    if (initialRegionSet.current) {
      return
    }
    initialRegionSet.current = true
    setRegion(loadRegion())
  }, [setRegion])

  const handleWeekChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQueryWeek(normalizeIsoWeek(event.target.value, currentWeek))
    },
    [setQueryWeek, currentWeek],
  )

  const handleRegionChange = useCallback((next: Region) => {
    setRegion(next)
  }, [setRegion])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setRefreshFailed(false)
    try {
      await postRefresh()
      setRefreshMessage('更新リクエストを受け付けました。自動ステータス更新は未実装です。')
      setRefreshFailed(false)
    } catch {
      setRefreshMessage('更新リクエストに失敗しました。自動ステータス更新は未実装です。')
      setRefreshFailed(true)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const refreshSection = useMemo(() => {
    if (!refreshMessage) {
      return null
    }
    return <RefreshMessage message={refreshMessage} failed={refreshFailed} />
  }, [refreshMessage, refreshFailed])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Planting Planner</h1>
        <RefreshControls
          queryWeek={queryWeek}
          currentWeek={currentWeek}
          onWeekChange={handleWeekChange}
          onSubmit={handleSubmit}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onRegionChange={handleRegionChange}
        />
      </header>
      <main className="app__main">
        {refreshSection}
        <section className="recommend">
          <div className="recommend__meta">
            <span>対象地域: {REGION_LABEL[region]}</span>
            <span>基準週: {displayWeek}</span>
          </div>
          <RecommendationTable
            rows={sortedRows}
            selectedCropId={selectedCropId}
            onSelect={setSelectedCropId}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
          />
        </section>
        <section className="recommend__chart">
          <h2>価格推移</h2>
          <PriceChart cropId={selectedCropId} range={{ from: undefined, to: undefined }} />
          <p className="recommend__chart-hint">作物一覧で行をクリックすると、価格推移が表示されます。</p>
        </section>
      </main>
    </div>
  )
}

export default App
