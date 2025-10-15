import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { ToastStackItem } from '../components/ToastStack'
import { APP_STATUS_MESSAGES, TOAST_MESSAGES } from '../constants/messages'
import { useRefreshStatusController } from '../hooks/refresh/controller'
import type { RecommendationLoadError } from '../hooks/recommendations/loader'
import {
  getSnapshot,
  isForceUpdateEnabled,
  subscribe,
  skipWaiting,
} from '../lib/swClient'
import { sendTelemetry } from '../lib/telemetry'
import { formatLastSync } from '../utils/formatLastSync'

type UseAppNotificationsArgs = {
  reloadCurrentWeek: () => void | Promise<void>
  isMarketFallback: boolean
  recommendationError: RecommendationLoadError | null
}

type UseAppNotificationsResult = {
  readonly isRefreshing: boolean
  readonly startRefresh: () => void | Promise<void>
  readonly combinedToasts: readonly ToastStackItem[]
  readonly handleToastDismiss: (id: string) => void
  readonly handleToastAction: (id: string, actionId: string) => void
  readonly fallbackNotice: ReactNode
  readonly offlineBanner: ReactNode | null
  readonly isOffline: boolean
  readonly lastSync: Date | null
}

export const useAppNotifications = ({
  reloadCurrentWeek,
  isMarketFallback,
  recommendationError,
}: UseAppNotificationsArgs): UseAppNotificationsResult => {
  const { isRefreshing, startRefresh, pendingToasts, dismissToast } = useRefreshStatusController()
  const lastSuccessToastIdRef = useRef<string | null>(null)
  const marketFallbackToastSeqRef = useRef(0)
  const [marketFallbackToasts, setMarketFallbackToasts] = useState<ToastStackItem[]>([])
  const recommendationErrorToastSeqRef = useRef(0)
  const [recommendationErrorToasts, setRecommendationErrorToasts] = useState<ToastStackItem[]>([])
  const initialSnapshot = useMemo(() => getSnapshot(), [])
  const [{ waiting, isOffline, lastSyncAt }, setSwState] = useState(initialSnapshot)
  const [updateToast, setUpdateToast] = useState<ToastStackItem | null>(null)
  const [suppressUpdateToast, setSuppressUpdateToast] = useState(false)
  const [forceUpdateRequired, setForceUpdateRequired] = useState(
    () => initialSnapshot.waiting !== null && isForceUpdateEnabled(),
  )
  const [offlineBanner, setOfflineBanner] = useState<ReactNode | null>(null)
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(() =>
    lastSyncAt ? new Date(lastSyncAt) : null,
  )
  const offlineTelemetrySentRef = useRef(false)

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
      marketFallbackToastSeqRef.current = 0
      setMarketFallbackToasts((prev) => (prev.length > 0 ? [] : prev))
      return
    }
    setMarketFallbackToasts((prev) => {
      if (prev.length > 0) {
        return prev
      }
      const id = `market-fallback-${marketFallbackToastSeqRef.current + 1}`
      marketFallbackToastSeqRef.current += 1
      return [
        {
          id,
          variant: 'warning',
          message: TOAST_MESSAGES.recommendationFallbackWarning,
          detail: null,
        },
      ]
    })
  }, [isMarketFallback, marketFallbackToasts.length])

  useEffect(() => {
    if (!recommendationError) {
      setRecommendationErrorToasts((prev) => (prev.length > 0 ? [] : prev))
      return
    }
    if (recommendationError === 'recommendations-unavailable') {
      setRecommendationErrorToasts((prev) => {
        if (prev.length > 0) {
          return prev
        }
        recommendationErrorToastSeqRef.current += 1
        return [
          {
            id: `recommendation-unavailable-${recommendationErrorToastSeqRef.current}`,
            variant: 'error',
            message: TOAST_MESSAGES.recommendationUnavailable,
            detail: null,
          },
        ]
      })
    }
  }, [recommendationError])

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === 'waiting') {
        setSwState((prev) => ({
          ...prev,
          waiting: event.registration.waiting,
        }))
        setForceUpdateRequired(event.forceUpdate)
        setSuppressUpdateToast(false)
        return
      }
      if (event.type === 'waiting-cleared') {
        setSwState((prev) => ({ ...prev, waiting: null }))
        setForceUpdateRequired(false)
        setSuppressUpdateToast(false)
        return
      }
      if (event.type === 'offline') {
        setSwState((prev) => ({ ...prev, isOffline: event.isOffline }))
        return
      }
      if (event.type === 'last-sync') {
        setSwState((prev) => ({ ...prev, lastSyncAt: event.lastSyncAt }))
        setLastSyncDate(event.lastSyncAt ? new Date(event.lastSyncAt) : null)
      }
    })
  }, [])

  useEffect(() => {
    if (lastSyncAt) {
      const parsed = new Date(lastSyncAt)
      setLastSyncDate(Number.isNaN(parsed.getTime()) ? null : parsed)
    }
  }, [lastSyncAt])

  useEffect(() => {
    const shouldShowForced = waiting && forceUpdateRequired
    if (shouldShowForced || (waiting && !suppressUpdateToast)) {
      setUpdateToast({
        id: 'service-worker-update',
        variant: 'info',
        message: TOAST_MESSAGES.serviceWorkerUpdateAvailable,
        detail: TOAST_MESSAGES.serviceWorkerUpdateDetail,
        actions: shouldShowForced
          ? [{ id: 'update-now', label: TOAST_MESSAGES.serviceWorkerUpdateNow }]
          : [
              { id: 'update-now', label: TOAST_MESSAGES.serviceWorkerUpdateNow },
              { id: 'dismiss-update', label: TOAST_MESSAGES.serviceWorkerUpdateLater },
            ],
        sticky: true,
      })
      return
    }
    setUpdateToast((prev) => (waiting ? prev : null))
  }, [forceUpdateRequired, suppressUpdateToast, waiting])

  useEffect(() => {
    if (!isOffline) {
      offlineTelemetrySentRef.current = false
      setOfflineBanner(null)
      return
    }
    const formattedLastSync = formatLastSync(lastSyncDate, APP_STATUS_MESSAGES.offlineBannerLastSyncUnknown)
    setOfflineBanner(
      <div
        data-testid="offline-status-banner"
        role="status"
        aria-live="polite"
        className="flex flex-col gap-1 rounded-2xl border border-market-neutral/40 bg-white/90 px-4 py-3 text-sm text-market-neutral-strong shadow-sm"
      >
        <span className="font-semibold">{APP_STATUS_MESSAGES.offlineBannerTitle}</span>
        <span>{APP_STATUS_MESSAGES.offlineBannerDetail}</span>
        <span className="text-xs text-market-neutral/70">
          {APP_STATUS_MESSAGES.offlineBannerLastSync(formattedLastSync)}
        </span>
      </div>,
    )
    if (!offlineTelemetrySentRef.current) {
      offlineTelemetrySentRef.current = true
      void sendTelemetry('offline.banner_shown', { lastSyncAt })
    }
  }, [isOffline, lastSyncAt, lastSyncDate])

  const handleToastDismiss = useCallback(
    (id: string) => {
      let removed = false
      setRecommendationErrorToasts((prev) => {
        if (!prev.some((toast) => toast.id === id)) {
          return prev
        }
        removed = true
        return prev.filter((toast) => toast.id !== id)
      })
      setMarketFallbackToasts((prev) => {
        if (!prev.some((toast) => toast.id === id)) {
          return prev
        }
        removed = true
        return prev.filter((toast) => toast.id !== id)
      })
      const isUpdateToast = updateToast?.id === id
      if (!removed && !isUpdateToast) {
        dismissToast(id)
      }
      if (isUpdateToast) {
        if (forceUpdateRequired) {
          return
        }
        setSuppressUpdateToast(true)
        setUpdateToast(null)
      }
    },
    [dismissToast, forceUpdateRequired, updateToast],
  )

  const combinedToasts = useMemo(
    () => {
      const base = [...pendingToasts, ...recommendationErrorToasts, ...marketFallbackToasts]
      if (updateToast) {
        return [updateToast, ...base]
      }
      return base
    },
    [marketFallbackToasts, pendingToasts, recommendationErrorToasts, updateToast],
  )

  const fallbackNotice = useMemo(() => {
    if (!isMarketFallback) {
      return null
    }
    return (
      <div
        data-testid="market-fallback-notice"
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-market-warning/50 bg-market-warning/10 px-4 py-3 text-sm font-semibold text-market-warning shadow-sm"
      >
        {TOAST_MESSAGES.recommendationFallbackWarning}
      </div>
    )
  }, [isMarketFallback])

  const handleToastAction = useCallback(
    (id: string, actionId: string) => {
      if (updateToast && id === updateToast.id) {
        if (actionId === 'update-now') {
          skipWaiting()
          setUpdateToast(null)
        }
        if (!forceUpdateRequired && actionId === 'dismiss-update') {
          setSuppressUpdateToast(true)
          setUpdateToast(null)
        }
        return
      }
    },
    [forceUpdateRequired, updateToast],
  )

  return {
    isRefreshing,
    startRefresh,
    combinedToasts,
    handleToastDismiss,
    fallbackNotice,
    handleToastAction,
    offlineBanner,
    isOffline,
    lastSync: lastSyncDate,
  }
}
