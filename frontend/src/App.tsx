
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AppScreen } from './app/AppScreen'
import { useAppNotifications } from './app/useAppNotifications'
import { useCategoryTabs } from './app/useCategoryTabs'
import { CategoryTabs } from './components/CategoryTabs'
import { PriceChartSection } from './components/PriceChartSection'
import { RecommendationsTable } from './components/RecommendationsTable'
import { SearchControls } from './components/SearchControls'
import { useFavorites } from './components/FavStar'
import { ToastStack } from './components/ToastStack'
import { loadRegion, loadMarketScope, loadSelectedCategory } from './lib/storage'
import { useRecommendations } from './hooks/recommendations/controller'
import type { CropCategory, MarketScope, Region } from './types'
import { APP_TEXT } from './constants/messages'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

export const AppContent = () => {
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
    setCategory,
    category,
    setMarketScope,
    selectedMarket,
    selectedCategory,
    queryWeek,
    setQueryWeek,
    currentWeek,
    displayWeek,
    sortedRows,
    handleSubmit,
    reloadCurrentWeek,
    isMarketFallback,
  } = useRecommendations({
    favorites,
    initialRegion: initialRegionRef.current,
    initialMarketScope: initialMarketScopeRef.current,
    initialCategory: initialCategoryRef.current,
  })
  const { resolveCategoriesForScope, ensureValidCategory, handleMarketsUpdate } =
    useCategoryTabs()
  const { isRefreshing, startRefresh, combinedToasts, handleToastDismiss, fallbackNotice } =
    useAppNotifications({ reloadCurrentWeek, isMarketFallback })

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
      const validCategory = ensureValidCategory(next, category)
      setSelectedCropId(null)
      if (validCategory !== category) {
        setCategory(validCategory)
      }
      setMarketScope(next)
    },
    [category, ensureValidCategory, setCategory, setMarketScope, setSelectedCropId],
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

  const activeCategoryTabId = useMemo(
    () => `category-tab-${selectedCategory}`,
    [selectedCategory],
  )

  const recommendationsTabpanelId = 'recommendations-tabpanel'
  useEffect(() => {
    setSelectedCropId((prev) => (prev === null ? prev : null))
  }, [category, marketScope, region, setSelectedCropId])

  useEffect(() => {
    const validCategory = ensureValidCategory(marketScope, category)
    if (validCategory !== category) {
      setCategory(validCategory)
    }
  }, [category, ensureValidCategory, marketScope, setCategory])

  return (
    <AppScreen
      title={APP_TEXT.title}
      searchControls={
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
          onMarketsUpdate={handleMarketsUpdate}
        />
      }
      toastStack={<ToastStack toasts={combinedToasts} onDismiss={handleToastDismiss} />}
      fallbackNotice={fallbackNotice}
      recommendationsTable={
        <RecommendationsTable
          region={region}
          displayWeek={displayWeek}
          rows={filteredRows}
          selectedCropId={selectedCropId}
          onSelect={setSelectedCropId}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          marketScope={selectedMarket}
          headerSlot={
            <CategoryTabs
              category={category}
              categories={resolveCategoriesForScope(marketScope)}
              onChange={setCategory}
              controlsId={recommendationsTabpanelId}
            />
          }
          tabpanelId={recommendationsTabpanelId}
          labelledById={activeCategoryTabId}
        />
      }
      priceChartSection={
        <PriceChartSection selectedCropId={selectedCropId} marketScope={selectedMarket} />
      }
    />
  )
}

export const App = () => {
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    return () => {
      queryClient.clear()
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
