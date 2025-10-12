
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

const MARKET_OPTIONS: ReadonlyArray<{ value: MarketScope; label: string }> = [
  { value: 'national', label: '全国' },
  { value: 'city:tokyo', label: '東京都' },
  { value: 'city:osaka', label: '大阪市' },
]

const CATEGORY_TABS: ReadonlyArray<{ value: CropCategory; label: string }> = [
  { value: 'leaf', label: '葉菜' },
  { value: 'root', label: '根菜' },
  { value: 'flower', label: '花き' },
]

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
    setMarketScope,
    selectedMarket,
    category,
    setCategory,
    selectedCategory,
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
    (event: ChangeEvent<HTMLSelectElement>) => {
      setMarketScope(event.target.value as MarketScope)
    },
    [setMarketScope],
  )

  const handleCategoryClick = useCallback(
    (next: CropCategory) => {
      setCategory(next)
    },
    [setCategory],
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
        <label className="market-select">
          <span className="market-select__label">市場</span>
          <select
            aria-label="市場"
            className="market-select__select"
            value={selectedMarket}
            onChange={handleMarketScopeChange}
          >
            {MARKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
        <ToastStack toasts={pendingToasts} onDismiss={dismissToast} />
        <div role="tablist" aria-label="カテゴリ">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={selectedCategory === tab.value}
              onClick={() => {
                handleCategoryClick(tab.value)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
