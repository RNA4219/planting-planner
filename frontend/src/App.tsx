
import { ChangeEvent, useCallback, useMemo, useRef, useState } from 'react'

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
  const [searchKeyword, setSearchKeyword] = useState('')

  const initialRegionRef = useRef<Region>(loadRegion())

  const { region, setRegion, queryWeek, setQueryWeek, currentWeek, displayWeek, sortedRows, handleSubmit } =
    useRecommendations({ favorites, initialRegion: initialRegionRef.current })

  const handleWeekChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQueryWeek(event.target.value)
    },
    [setQueryWeek],
  )

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(event.target.value)
    },
    [],
  )

  const handleRegionChange = useCallback(
    (next: Region) => {
      setRegion(next)
    },
    [setRegion],
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

  const normalizedSearchKeyword = useMemo(
    () => searchKeyword.normalize('NFKC').trim().toLowerCase(),
    [searchKeyword],
  )

  const filteredRows = useMemo(() => {
    if (!normalizedSearchKeyword) {
      return sortedRows
    }
    return sortedRows.filter((row) => {
      const cropName = row.crop.normalize('NFKC').toLowerCase()
      const category = row.category?.normalize('NFKC').toLowerCase() ?? ''
      return (
        cropName.includes(normalizedSearchKeyword) ||
        category.includes(normalizedSearchKeyword)
      )
    })
  }, [normalizedSearchKeyword, sortedRows])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Planting Planner</h1>
        <SearchControls
          queryWeek={queryWeek}
          currentWeek={currentWeek}
          onWeekChange={handleWeekChange}
          onRegionChange={handleRegionChange}
          searchKeyword={searchKeyword}
          onSearchChange={handleSearchChange}
          onSubmit={handleSubmit}
          onRefresh={handleRefresh}
          refreshing={refreshing}
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
          rows={filteredRows}
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
