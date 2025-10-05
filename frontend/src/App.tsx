
import { ChangeEvent, useCallback, useMemo, useRef, useState } from 'react'

import { PriceChartSection } from './components/PriceChartSection'
import { RecommendationsTable } from './components/RecommendationsTable'
import { SearchControls } from './components/SearchControls'
import { useFavorites } from './components/FavStar'
import { loadRegion } from './lib/storage'
import { useRecommendations } from './hooks/useRecommendations'
import { useRefreshStatus } from './hooks/useRefreshStatus'
import type { Region } from './types'

import './App.css'

export const App = () => {
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null)
  const { isRefreshing, startRefresh, pendingToasts, dismissToast } = useRefreshStatus()
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
          onRefresh={startRefresh}
          refreshing={isRefreshing}
        />
      </header>
      <main className="app__main">
        {pendingToasts.length > 0 && (
          <div className="toast-stack" aria-live="assertive" aria-atomic="true">
            {pendingToasts.map((toast) => (
              <div key={toast.id} className={`toast toast--${toast.variant}`} role="alert">
                <div className="toast__content">
                  <p className="toast__message">{toast.message}</p>
                  {toast.detail ? <p className="toast__detail">{toast.detail}</p> : null}
                </div>
                <button type="button" className="toast__close" onClick={() => dismissToast(toast.id)}>
                  閉じる
                </button>
              </div>
            ))}
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
