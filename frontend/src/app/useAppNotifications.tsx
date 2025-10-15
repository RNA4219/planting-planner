import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { ToastStackItem } from '../components/ToastStack'
import { APP_STATUS_MESSAGES, TOAST_MESSAGES } from '../constants/messages'
import { useRefreshStatusController } from '../hooks/refresh/controller'
import { getSnapshot, subscribe, skipWaiting } from '../lib/swClient'
import { track } from '../lib/telemetry'
import { formatLastSync } from '../utils/formatLastSync'

type UseAppNotificationsArgs = {
  reloadCurrentWeek: () => void | Promise<void>
  isMarketFallback: boolean
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
}: UseAppNotificationsArgs): UseAppNotificationsResult => {
  const { isRefreshing, startRefresh, pendingToasts, dismissToast } = useRefreshStatusController()
  const lastSuccessToastIdRef = useRef<string | null>(null)
  const marketFallbackToastSeqRef = useRef(0)
  const [marketFallbackToasts, setMarketFallbackToasts] = useState<ToastStackItem[]>([])
  const [{ waiting, isOffline, lastSyncAt }, setSwState] = useState(() => getSnapshot())
  const [updateToast, setUpdateToast] = useState<ToastStackItem | null>(null)
  const [suppressUpdateToast, setSuppressUpdateToast] = useState(false)
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
    return subscribe((event) => {
      if (event.type === 'waiting') {
        setSwState((prev) => ({
          ...prev,
          waiting: event.registration.waiting,
        }))
        setSuppressUpdateToast(false)
        return
      }
      if (event.type === 'waiting-cleared') {
        setSwState((prev) => ({ ...prev, waiting: null }))
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
    if (waiting && !suppressUpdateToast) {
      setUpdateToast({
        id: 'service-worker-update',
        variant: 'info',
        message: TOAST_MESSAGES.serviceWorkerUpdateAvailable,
        detail: TOAST_MESSAGES.serviceWorkerUpdateDetail,
        actions: [
          { id: 'update-now', label: TOAST_MESSAGES.serviceWorkerUpdateNow },
          { id: 'dismiss-update', label: TOAST_MESSAGES.serviceWorkerUpdateLater },
        ],
        sticky: true,
      })
      return
    }
    setUpdateToast((prev) => (waiting ? prev : null))
  }, [suppressUpdateToast, waiting])

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
      track('offline.banner_shown', { lastSyncAt })
    }
  }, [isOffline, lastSyncAt, lastSyncDate])

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
      if (updateToast && id === updateToast.id) {
        setSuppressUpdateToast(true)
        setUpdateToast(null)
      }
    },
    [dismissToast, updateToast],
  )

  const combinedToasts = useMemo(
    () => {
      const base = [...pendingToasts, ...marketFallbackToasts]
      if (updateToast) {
        return [updateToast, ...base]
      }
      return base
    },
    [marketFallbackToasts, pendingToasts, updateToast],
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
        if (actionId === 'dismiss-update') {
          setSuppressUpdateToast(true)
          setUpdateToast(null)
        }
        return
      }
    },
    [updateToast],
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
