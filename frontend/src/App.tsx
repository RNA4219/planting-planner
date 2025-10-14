
import { ChangeEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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

type CategoryTabsMap = Map<MarketScope, readonly CategoryTabDefinition[]>

const areCategoryTabsEqual = (
  a: readonly CategoryTabDefinition[],
  b: readonly CategoryTabDefinition[],
) => a.length === b.length && a.every((tab, index) => {
  const other = b[index]
  return other !== undefined && other.key === tab.key && other.label === tab.label
})

const buildCategoryTabsFromMetadata = (
  categories: MarketScopeOption['categories'],
): readonly CategoryTabDefinition[] => {
  if (!categories) {
    return DEFAULT_CATEGORY_TABS
  }
  const mapped = categories
    .map((category) => {
      if (!isCropCategory(category.category)) {
        return null
      }
      return { key: category.category, label: category.displayName }
    })
    .filter((category): category is CategoryTabDefinition => category !== null)
  if (mapped.length > 0) {
    return mapped
  }
  return DEFAULT_CATEGORY_TABS
}

const MARKET_FALLBACK_NOTICE_CLASSNAME =
  'flex items-start gap-3 rounded-2xl border border-market-warning/50 bg-market-warning/10 px-4 py-3 text-sm font-semibold text-market-warning shadow-sm'

const createInitialCategoryTabsMap = (): CategoryTabsMap => {
  const map: CategoryTabsMap = new Map()
  MARKET_SCOPE_FALLBACK_DEFINITIONS.forEach((definition) => {
    const categories =
      definition.categories && definition.categories.length > 0
        ? definition.categories
        : undefined
    map.set(definition.scope, buildCategoryTabsFromMetadata(categories))
  })
  return map
}

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

  const recommendationsTabpanelId = useId()

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
    },
    [dismissToast],
  )

  const combinedToasts = useMemo(
    () => [
      ...pendingToasts,
      ...(isMarketFallback ? [] : marketFallbackToasts),
    ],
    [isMarketFallback, marketFallbackToasts, pendingToasts],
  )

  return (
    <div className="min-h-screen bg-market-neutral-container">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur">
          <h1 className="text-3xl font-bold tracking-tight text-market-neutral-strong sm:text-4xl">
            {APP_TEXT.title}
          </h1>
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
        </header>
        <main className="flex flex-1 flex-col gap-8 pb-12">
          <ToastStack toasts={combinedToasts} onDismiss={handleToastDismiss} />
          {isMarketFallback ? (
            <div
              data-testid="market-fallback-notice"
              role="status"
              aria-live="polite"
              className={MARKET_FALLBACK_NOTICE_CLASSNAME}
            >
              {TOAST_MESSAGES.recommendationFallbackWarning}
            </div>
          ) : null}
          <RecommendationsTable
            region={region}
            displayWeek={displayWeek}
            rows={filteredRows}
            selectedCropId={selectedCropId}
            onSelect={setSelectedCropId}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
            marketScope={selectedMarket}
            headerSlot={(
              <CategoryTabs
                category={category}
                categories={resolveCategoriesForScope(marketScope)}
                onChange={setCategory}
                controlsId={recommendationsTabpanelId}
              />
            )}
            tabpanelId={recommendationsTabpanelId}
            labelledById={`category-tab-${category}`}
          />
          <PriceChartSection
            selectedCropId={selectedCropId}
            marketScope={selectedMarket}
          />
        </main>
      </div>
    </div>
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
