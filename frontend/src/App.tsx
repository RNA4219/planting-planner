
import { ChangeEvent, useCallback, useRef, useState } from 'react'

import { PriceChartSection } from './components/PriceChartSection'
import { RecommendationsTable } from './components/RecommendationsTable'
import { SearchControls } from './components/SearchControls'
import { useFavorites } from './components/FavStar'
import { postRefresh } from './lib/api'
import { loadRegion } from './lib/storage'
import { useRecommendations } from './hooks/useRecommendations'
import type { Region } from './types'

import './App.css'

export const App = () => {
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()

  const initialRegionRef = useRef<Region>(loadRegion())

  const {
    region,
    setRegion,
    queryWeek,
    setQueryWeek,
    searchQuery,
    setSearchQuery,
    currentWeek,
    displayWeek,
    sortedRows,
    handleSubmit,
  } =
    useRecommendations({ favorites, initialRegion: initialRegionRef.current })

  const handleWeekChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQueryWeek(event.target.value)
    },
    [setQueryWeek],
  )

  const handleRegionChange = useCallback(
    (next: Region) => {
      setRegion(next)
    },
    [setRegion],
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
    },
    [setSearchQuery],
  )

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

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Planting Planner</h1>
        <SearchControls
          queryWeek={queryWeek}
          currentWeek={currentWeek}
          onWeekChange={handleWeekChange}
          onRegionChange={handleRegionChange}
          onSubmit={handleSubmit}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </header>
      <main className="app__main">
        {refreshMessage && (
          <div
            className={`app__refresh-message${refreshFailed ? ' app__refresh-message--error' : ''}`}
            role={refreshFailed ? 'alert' : 'status'}
          >
            {refreshMessage}
          </div>
        )}
        <RecommendationsTable
          region={region}
          displayWeek={displayWeek}
          rows={sortedRows}
          selectedCropId={selectedCropId}
          onSelect={setSelectedCropId}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
        <PriceChartSection selectedCropId={selectedCropId} />
      </main>
    </div>
  )
}

export default App
