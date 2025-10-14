import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { ToastStackItem } from '../components/ToastStack'
import { TOAST_MESSAGES } from '../constants/messages'
import { useRefreshStatusController } from '../hooks/refresh/controller'

type UseAppNotificationsArgs = {
  reloadCurrentWeek: () => void | Promise<void>
  isMarketFallback: boolean
}

type UseAppNotificationsResult = {
  readonly isRefreshing: boolean
  readonly startRefresh: () => void | Promise<void>
  readonly combinedToasts: readonly ToastStackItem[]
  readonly handleToastDismiss: (id: string) => void
  readonly fallbackNotice: ReactNode
}

export const useAppNotifications = ({
  reloadCurrentWeek,
  isMarketFallback,
}: UseAppNotificationsArgs): UseAppNotificationsResult => {
  const { isRefreshing, startRefresh, pendingToasts, dismissToast } = useRefreshStatusController()
  const lastSuccessToastIdRef = useRef<string | null>(null)
  const marketFallbackToastSeqRef = useRef(0)
  const [marketFallbackToasts, setMarketFallbackToasts] = useState<ToastStackItem[]>([])

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
      if (marketFallbackToasts.length > 0) {
        setMarketFallbackToasts([])
      }
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
  }, [isMarketFallback, marketFallbackToasts.length])

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
    () => [
      ...pendingToasts,
      ...(isMarketFallback ? [] : marketFallbackToasts),
    ],
    [isMarketFallback, marketFallbackToasts, pendingToasts],
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

  return {
    isRefreshing,
    startRefresh,
    combinedToasts,
    handleToastDismiss,
    fallbackNotice,
  }
}
