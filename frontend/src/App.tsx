
import {
  type CSSProperties,
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

const MARKET_FALLBACK_NOTICE_STYLE: CSSProperties = {
  marginBottom: '1rem',
  padding: '0.75rem 1rem',
  borderRadius: '0.75rem',
  border: '1px solid #fed7aa',
  backgroundColor: '#fff7ed',
  color: '#9a3412',
  fontWeight: 600,
}

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

const CATEGORY_LABELS: Record<CropCategory, string> = {
  leaf: '葉菜類',
  root: '根菜類',
  flower: '花き',
}

type CanonicalCategory = CropCategory | 'fruit'

const CATEGORY_ALIASES: Record<string, CanonicalCategory> = {
  leaf: 'leaf',
  '葉菜': 'leaf',
  '葉菜類': 'leaf',
  '葉物': 'leaf',
  root: 'root',
  '根菜': 'root',
  '根菜類': 'root',
  flower: 'flower',
  '花き': 'flower',
  '花き類': 'flower',
  '花': 'flower',
  fruit: 'fruit',
  '果菜': 'fruit',
  '果菜類': 'fruit',
} as const

const resolveCategoryCanonical = (value: string | null | undefined): CanonicalCategory | null => {
  if (!value) {
    return null
  }
  const normalized = value.normalize('NFKC').trim().toLowerCase()
  if (!normalized) {
    return null
  }
  const direct = CATEGORY_ALIASES[normalized]
  if (direct) {
    return direct
  }
  const collapsed = normalized.replace(/\s+/g, '')
  return CATEGORY_ALIASES[collapsed] ?? null
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

  const canonicalSearchKeyword = useMemo(
    () => resolveCategoryCanonical(normalizedSearchKeyword),
    [normalizedSearchKeyword],
  )

  const filteredRows = useMemo(() => {
    if (!normalizedSearchKeyword && !canonicalSearchKeyword) {
      return sortedRows
    }
    return sortedRows.filter((row) => {
      const cropName = row.crop.normalize('NFKC').toLowerCase()
      if (normalizedSearchKeyword && cropName.includes(normalizedSearchKeyword)) {
        return true
      }
      const categoryLabel = row.category ? CATEGORY_LABELS[row.category] : ''
      const normalizedCategoryLabel = categoryLabel.normalize('NFKC').toLowerCase()
      if (
        normalizedSearchKeyword &&
        normalizedCategoryLabel.includes(normalizedSearchKeyword)
      ) {
        return true
      }
      if (!canonicalSearchKeyword) {
        return false
      }
      const rowCanonicalCategory = resolveCategoryCanonical(row.category)
      return rowCanonicalCategory !== null && rowCanonicalCategory === canonicalSearchKeyword
    })
  }, [canonicalSearchKeyword, normalizedSearchKeyword, sortedRows])

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
        <ToastStack toasts={combinedToasts} onDismiss={handleToastDismiss} />
        {isMarketFallback ? (
          <div
            data-testid="market-fallback-notice"
            role="status"
            aria-live="polite"
            style={MARKET_FALLBACK_NOTICE_STYLE}
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
