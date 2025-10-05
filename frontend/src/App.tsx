
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PriceChartSection } from './components/PriceChartSection'
import { RecommendationsTable } from './components/RecommendationsTable'
import { SearchControls } from './components/SearchControls'
import { useFavorites } from './components/FavStar'
import { loadRegion } from './lib/storage'
import { useRecommendations } from './hooks/useRecommendations'
import { useRefreshStatus } from './hooks/useRefreshStatus'
import type { Region } from './types'

import './App.css'
const TOAST_DURATION_MS = 5000

export const App = () => {
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null)
  const toastTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const handledSuccessToastIds = useRef(new Set<string>())
  const [priceChartResetKey, setPriceChartResetKey] = useState(0)
  const { isRefreshing, pendingToasts, startRefresh, dismissToast } = useRefreshStatus()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const [searchKeyword, setSearchKeyword] = useState('')

  const initialRegionRef = useRef<Region>(loadRegion())

  const recommendations = useRecommendations({ favorites, initialRegion: initialRegionRef.current })
  const { region, setRegion, queryWeek, setQueryWeek, currentWeek, displayWeek, sortedRows, handleSubmit } =
    recommendations
  const fallbackReloadCurrentWeek = useCallback(() => {
    const fakeEvent = {
      preventDefault: () => {},
      currentTarget: {
        elements: {
          namedItem: (name: string) => {
            if (name === 'week') {
              return { value: currentWeek }
            }
            if (name === 'region') {
              return { value: region }
            }
            return null
          },
        },
      },
    } as unknown as FormEvent<HTMLFormElement>
    handleSubmit(fakeEvent)
  }, [currentWeek, handleSubmit, region])
  const reloadCurrentWeek =
    (recommendations as typeof recommendations & { reloadCurrentWeek?: () => Promise<void> }).reloadCurrentWeek ??
    fallbackReloadCurrentWeek

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

  useEffect(() => {
    const pendingIds = new Set(pendingToasts.map((toast) => toast.id))
    toastTimersRef.current.forEach((timer, id) => {
      if (!pendingIds.has(id)) {
        clearTimeout(timer)
        toastTimersRef.current.delete(id)
      }
    })
    pendingToasts.forEach((toast) => {
      if (toastTimersRef.current.has(toast.id)) {
        return
      }
      const timer = setTimeout(() => {
        dismissToast(toast.id)
        toastTimersRef.current.delete(toast.id)
      }, TOAST_DURATION_MS)
      toastTimersRef.current.set(toast.id, timer)
    })
  }, [dismissToast, pendingToasts])

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => {
        clearTimeout(timer)
      })
      toastTimersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    pendingToasts.forEach((toast) => {
      if (toast.variant !== 'success') {
        return
      }
      if (handledSuccessToastIds.current.has(toast.id)) {
        return
      }
      handledSuccessToastIds.current.add(toast.id)
      void reloadCurrentWeek()
      if (selectedCropId !== null) {
        setPriceChartResetKey((prev) => prev + 1)
      }
    })
  }, [pendingToasts, reloadCurrentWeek, selectedCropId])

  const handleRefresh = useCallback(async () => {
    await startRefresh()
  }, [startRefresh])

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
          refreshing={isRefreshing}
        />
      </header>
      <main className="app__main">
        {pendingToasts.length > 0 && (
          <div className="toast-stack" aria-live="assertive" aria-atomic="true">
            {pendingToasts.map((toast) => (
              <div key={toast.id} className={`toast toast--${toast.variant}`} role="alert">
                <p>{toast.message}</p>
                {toast.detail && <p>{toast.detail}</p>}
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
        <PriceChartSection key={priceChartResetKey} selectedCropId={selectedCropId} />
      </main>
    </div>
  )
}

export default App
