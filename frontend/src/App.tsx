
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PriceChartSection } from './components/PriceChartSection'
import { RecommendationsTable } from './components/RecommendationsTable'
import { SearchControls } from './components/SearchControls'
import { useFavorites } from './components/FavStar'
import { ToastStack } from './components/ToastStack'
import { loadRegion } from './lib/storage'
import { useRecommendations } from './hooks/useRecommendations'
import { useRefreshStatus } from './hooks/useRefreshStatus'
import type { Region } from './types'
import { APP_TEXT, TOAST_MESSAGES } from './constants/messages'

import './App.css'

type ToastTone = 'info' | 'success' | 'error'

interface RefreshToast {
  id: number
  message: string
  tone: ToastTone
}

const POLL_INTERVAL_MS = 1000
const TOAST_DURATION_MS = 5000

const useRefreshStatus = () => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toasts, setToasts] = useState<RefreshToast[]>([])
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const nextToastIdRef = useRef(0)

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const removeToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (toast: Omit<RefreshToast, 'id'>) => {
      const id = nextToastIdRef.current++
      setToasts((prev) => [...prev, { ...toast, id }])
      const timer = setTimeout(() => {
        removeToast(id)
      }, TOAST_DURATION_MS)
      toastTimersRef.current.set(id, timer)
    },
    [removeToast],
  )

  const pollStatus = useCallback(async () => {
    let shouldContinue = false
    try {
      const status = await fetchRefreshStatus()
      if (status.state === 'running' || status.state === 'stale') {
        shouldContinue = true
        return
      }
      if (status.state === 'success') {
        pushToast({
          tone: 'success',
          message: TOAST_MESSAGES.refreshSuccess(status.updated_records),
        })
      } else if (status.state === 'failure') {
        const detail = status.last_error ?? TOAST_MESSAGES.refreshStatusUnknownDetail
        pushToast({
          tone: 'error',
          message: TOAST_MESSAGES.refreshFailure(detail),
        })
      } else {
        pushToast({
          tone: 'info',
          message: TOAST_MESSAGES.refreshUnknown,
        })
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      pushToast({
        tone: 'error',
        message: TOAST_MESSAGES.refreshStatusFetchFailure(detail),
      })
    } finally {
      if (shouldContinue) {
        clearPollTimer()
        pollTimerRef.current = setTimeout(() => {
          void pollStatus()
        }, POLL_INTERVAL_MS)
      } else {
        clearPollTimer()
        setIsRefreshing(false)
      }
    }
  }, [clearPollTimer, pushToast])

  const startRefresh = useCallback(async () => {
    if (isRefreshing) {
      return
    }
    setIsRefreshing(true)
    try {
      const response = await postRefresh()
      if (response.state === 'failure') {
        pushToast({ tone: 'error', message: TOAST_MESSAGES.refreshRequestFailure })
        setIsRefreshing(false)
        return
      }
      pushToast({ tone: 'info', message: TOAST_MESSAGES.refreshRequestStarted })
      clearPollTimer()
      void pollStatus()
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      pushToast({
        tone: 'error',
        message: TOAST_MESSAGES.refreshRequestFailureWithDetail(detail),
      })
      setIsRefreshing(false)
    }
  }, [clearPollTimer, isRefreshing, pollStatus, pushToast])

  useEffect(() => {
    return () => {
      clearPollTimer()
      toastTimersRef.current.forEach((timer) => {
        clearTimeout(timer)
      })
      toastTimersRef.current.clear()
    }
  }, [clearPollTimer])

  return { isRefreshing, startRefresh, toasts }
}

export const App = () => {
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const [searchKeyword, setSearchKeyword] = useState('')

  const initialRegionRef = useRef<Region>(loadRegion())

  const {
    region,
    setRegion,
    queryWeek,
    setQueryWeek,
    currentWeek,
    displayWeek,
    sortedRows,
    handleSubmit,
    reloadCurrentWeek,
  } = useRecommendations({ favorites, initialRegion: initialRegionRef.current })
  const { isRefreshing, startRefresh, pendingToasts, dismissToast } = useRefreshStatus({ pollIntervalMs: 1000 })
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
