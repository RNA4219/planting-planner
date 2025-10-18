import {
  ChangeEvent,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
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
import { isShareSupported, shareCurrentView } from './lib/share'
import { useRecommendations } from './hooks/recommendations/controller'
import { useWeather } from './hooks/weather/useWeather'
import type { CropCategory, MarketScope, Region } from './types'
import { APP_TEXT, TOAST_MESSAGES, WEATHER_MESSAGES } from './constants/messages'
import { getRegionCoordinates } from './constants/weather'
import { isWeatherTabEnabled } from './config/featureFlags'

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

const LazyWeatherTab = lazy(async () => {
  const module = await import('./components/WeatherTab')
  return { default: module.WeatherTab }
})

const scheduleWeatherSection = (task: () => void): (() => void) => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    const handle = globalWithIdle.requestIdleCallback(() => {
      task()
    })
    return () => {
      globalWithIdle.cancelIdleCallback?.(handle)
    }
  }

  const timeout = setTimeout(() => {
    task()
  }, 120)

  return () => {
    clearTimeout(timeout)
  }
}

const WeatherSectionFallback = () => (
  <section
    aria-label={WEATHER_MESSAGES.title}
    className="space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur"
    role="status"
    aria-live="polite"
  >
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <h2 className="text-2xl font-bold text-market-neutral-strong">{WEATHER_MESSAGES.title}</h2>
    </div>
    <p className="text-sm text-market-neutral/70">{WEATHER_MESSAGES.loading}</p>
  </section>
)

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
    recommendationError,
  } = useRecommendations({
    favorites,
    initialRegion: initialRegionRef.current,
    initialMarketScope: initialMarketScopeRef.current,
    initialCategory: initialCategoryRef.current,
  })
  const weatherTabEnabled = isWeatherTabEnabled()
  const regionCoordinates = useMemo(() => getRegionCoordinates(region), [region])
  const {
    latest: weatherLatest,
    previous: weatherPrevious,
    isLoading: isWeatherLoading,
    error: weatherError,
  } = useWeather({
    lat: regionCoordinates?.lat ?? null,
    lon: regionCoordinates?.lon ?? null,
    enabled: weatherTabEnabled,
  })
  const { resolveCategoriesForScope, ensureValidCategory, handleMarketsUpdate } = useCategoryTabs()
  const {
    isRefreshing,
    startRefresh,
    combinedToasts,
    handleToastDismiss,
    handleToastAction,
    fallbackNotice,
    offlineBanner,
    isOffline,
    lastSync,
    notifyShareResult,
  } = useAppNotifications({
    reloadCurrentWeek,
    isMarketFallback,
    recommendationError,
  })

  const handleWeekChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQueryWeek(event.target.value)
    },
    [setQueryWeek],
  )

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value)
  }, [])

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

  const canUseShare = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false
    }
    if (isShareSupported()) {
      return true
    }
    return typeof navigator.clipboard?.writeText === 'function'
  }, [])

  const handleShare = useCallback(async () => {
    const result = await shareCurrentView({
      region,
      marketScope: selectedMarket,
      category,
      week: queryWeek || currentWeek,
    })
    notifyShareResult(result)
  }, [category, currentWeek, notifyShareResult, queryWeek, region, selectedMarket])

  const recommendationsTabpanelId = useId()

  const filteredRows = useMemo(() => {
    if (!normalizedSearchKeyword) {
      return sortedRows
    }
    return sortedRows.filter((row) => {
      const cropName = row.crop.normalize('NFKC').toLowerCase()
      const category = row.category?.normalize('NFKC').toLowerCase() ?? ''
      return (
        cropName.includes(normalizedSearchKeyword) || category.includes(normalizedSearchKeyword)
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

  const activeCategoryTabId = `category-tab-${category}`

  const fallbackNoticeContent =
    fallbackNotice ??
    (isMarketFallback ? (
      <div
        data-testid="market-fallback-notice"
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-market-warning/50 bg-market-warning/10 px-4 py-3 text-sm font-semibold text-market-warning shadow-sm"
      >
        {TOAST_MESSAGES.recommendationFallbackWarning}
      </div>
    ) : null)

  const appVersion = import.meta.env.VITE_APP_VERSION ?? 'dev'
  const [shouldRenderWeatherTab, setShouldRenderWeatherTab] = useState(false)

  useEffect(() => {
    if (!weatherTabEnabled) {
      setShouldRenderWeatherTab(false)
      return
    }

    if (shouldRenderWeatherTab) {
      return
    }

    const cancel = scheduleWeatherSection(() => {
      setShouldRenderWeatherTab(true)
    })

    return () => {
      cancel()
    }
  }, [shouldRenderWeatherTab, weatherTabEnabled])

  const weatherSection = weatherTabEnabled ? (
    shouldRenderWeatherTab ? (
      <Suspense fallback={null}>
        <LazyWeatherTab
          latest={weatherLatest}
          previous={weatherPrevious}
          isLoading={isWeatherLoading}
          error={weatherError}
        />
      </Suspense>
    ) : (
      <WeatherSectionFallback />
    )
  ) : null

  return (
    <AppScreen
      title={APP_TEXT.title}
      status={{ isOffline, lastSync }}
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
          onShare={handleShare}
          isShareSupported={canUseShare}
        />
      }
      toastStack={
        <ToastStack
          toasts={combinedToasts}
          onDismiss={handleToastDismiss}
          onAction={handleToastAction}
        />
      }
      fallbackNotice={fallbackNoticeContent}
      offlineBanner={offlineBanner}
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
      weatherTab={weatherSection}
      appVersion={appVersion}
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
