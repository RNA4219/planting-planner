
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { CategoryTabs } from './components/CategoryTabs'
import { PriceChartSection } from './components/PriceChartSection'
import { RecommendationsTable } from './components/RecommendationsTable'
import { SearchControls } from './components/SearchControls'
import { useFavorites } from './components/FavStar'
import { ToastStack, type ToastStackItem } from './components/ToastStack'
import { loadRegion, loadMarketScope, loadSelectedCategory } from './lib/storage'
import { useRecommendations } from './hooks/useRecommendations'
import { useRefreshStatusController } from './hooks/refresh/controller'
import type { CropCategory, MarketScope, Region } from './types'
import { APP_TEXT, TOAST_MESSAGES } from './constants/messages'

import './index.css'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
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
  const { isRefreshing, startRefresh, pendingToasts, dismissToast } = useRefreshStatusController()
  const lastSuccessToastIdRef = useRef<string | null>(null)
  const marketFallbackToastSeqRef = useRef(0)
  const [marketFallbackToasts, setMarketFallbackToasts] = useState<ToastStackItem[]>([])

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

  useEffect(() => {
    if (!isMarketFallback) {
      return
    }
    const id = `market-fallback-${marketFallbackToastSeqRef.current + 1}`
    marketFallbackToastSeqRef.current += 1
    setMarketFallbackToasts((prev) => [
      ...prev,
      {
        id,
        variant: 'warning',
        message: TOAST_MESSAGES.recommendationFallbackWarning,
        detail: null,
      },
    ])
  }, [isMarketFallback])

  const handleToastDismiss = useCallback(
    (id: string) => {
      let removed = false
      setMarketFallbackToasts((prev) => {
        if (!prev.some((toast) => toast.id === id)) {
          return prev
        }
        removed = true
        return prev.filter((toast) => toast.id !== id)
      })
      if (!removed) {
        dismissToast(id)
      }
    },
    [dismissToast],
  )

  const combinedToasts = useMemo(
    () => [...pendingToasts, ...marketFallbackToasts],
    [marketFallbackToasts, pendingToasts],
  )

  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-b from-[#f3f8ee] to-white p-6"
      data-testid="app-layout"
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-3xl font-bold text-[#2e7d32]">{APP_TEXT.title}</h1>
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
      <main className="flex flex-col gap-6">
        <ToastStack toasts={combinedToasts} onDismiss={handleToastDismiss} />
        {isMarketFallback ? (
          <div
            data-testid="market-fallback-notice"
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 font-semibold text-orange-800"
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
          headerSlot={<CategoryTabs category={category} onChange={setCategory} />}
        />
        <PriceChartSection
          selectedCropId={selectedCropId}
          marketScope={selectedMarket}
        />
      </main>
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
