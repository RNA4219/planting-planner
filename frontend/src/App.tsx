
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PriceChartSection } from './components/PriceChartSection'
import { RecommendationsTable } from './components/RecommendationsTable'
import { SearchControls } from './components/SearchControls'
import { useFavorites } from './components/FavStar'
import { ToastStack } from './components/ToastStack'
import { loadRegion, loadMarketScope, loadSelectedCategory } from './lib/storage'
import { useRecommendations } from './hooks/useRecommendations'
import { useRefreshStatusController } from './hooks/refresh/controller'
import type { CropCategory, MarketScope, Region } from './types'
import { APP_TEXT } from './constants/messages'

import './App.css'

export const App = () => {
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const [searchKeyword, setSearchKeyword] = useState('')

  const initialRegionRef = useRef<Region>(loadRegion())
  const initialMarketScopeRef = useRef<MarketScope>(loadMarketScope())
  const initialCategoryRef = useRef<CropCategory>(loadSelectedCategory())

  const {
    region,
    setRegion,
    marketScope,
    category,
    setMarketScope,
    queryWeek,
    setQueryWeek,
    currentWeek,
    displayWeek,
    sortedRows,
    handleSubmit,
    reloadCurrentWeek,
  } = useRecommendations({
    favorites,
    initialRegion: initialRegionRef.current,
    initialMarketScope: initialMarketScopeRef.current,
    initialCategory: initialCategoryRef.current,
  })
  const { isRefreshing, startRefresh, pendingToasts, dismissToast } = useRefreshStatusController()
  const lastSuccessToastIdRef = useRef<string | null>(null)

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
      setSelectedCropId(null)
      setRegion(next)
    },
    [setRegion, setSelectedCropId],
  )

  const handleMarketScopeChange = useCallback(
    (next: MarketScope) => {
      setSelectedCropId(null)
      setMarketScope(next)
    },
    [setMarketScope, setSelectedCropId],
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

  useEffect(() => {
    setSelectedCropId((prev) => (prev === null ? prev : null))
  }, [category, marketScope, region, setSelectedCropId])

  useEffect(() => {
    const latestSuccess = [...pendingToasts].reverse().find((toast) => toast.variant === 'success')
    if (!latestSuccess) {
      return
    }
    if (lastSuccessToastIdRef.current === latestSuccess.id) {
      return
    }
    lastSuccessToastIdRef.current = latestSuccess.id
    void reloadCurrentWeek()
  }, [pendingToasts, reloadCurrentWeek])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">{APP_TEXT.title}</h1>
        <SearchControls
          queryWeek={queryWeek}
          currentWeek={currentWeek}
          onWeekChange={handleWeekChange}
          onRegionChange={handleRegionChange}
          marketScope={marketScope}
          onMarketScopeChange={handleMarketScopeChange}
          searchKeyword={searchKeyword}
          onSearchChange={handleSearchChange}
          onSubmit={handleSubmit}
          onRefresh={startRefresh}
          refreshing={isRefreshing}
        />
      </header>
      <main className="app__main">
        <ToastStack toasts={pendingToasts} onDismiss={dismissToast} />
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
