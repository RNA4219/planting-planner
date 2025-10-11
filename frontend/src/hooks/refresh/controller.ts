import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchRefreshStatus, postRefresh } from '../../lib/api'
import type { RefreshState, RefreshStatusResponse } from '../../types'

import { createRefreshStatusPoller, isTerminalState } from './poller'

export type RefreshToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface RefreshToast {
  readonly id: string
  readonly variant: RefreshToastVariant
  readonly message: string
  readonly detail?: string | null
}

const TOAST_AUTO_DISMISS_MS = 5000
const REFRESH_STARTED_MESSAGE = '更新を開始しました。進行状況を確認しています…'
const STALE_TOAST_MESSAGE = 'データ更新の結果を取得できませんでした'
const FETCH_STATUS_ERROR_MESSAGE = '更新状況の取得に失敗しました'

export interface UseRefreshStatusOptions {
  readonly pollIntervalMs?: number
  readonly timeoutMs?: number
  readonly onSuccess?: () => void
}

export interface UseRefreshStatusResult {
  readonly isRefreshing: boolean
  readonly pendingToasts: ReadonlyArray<RefreshToast>
  readonly startRefresh: () => Promise<void>
  readonly dismissToast: (id: string) => void
}

type ToastPayload = Omit<RefreshToast, 'id'>

const buildStatus = (
  state: RefreshState,
  overrides: Partial<RefreshStatusResponse> = {},
): RefreshStatusResponse => ({
  state,
  started_at: overrides.started_at ?? null,
  finished_at: overrides.finished_at ?? null,
  updated_records: overrides.updated_records ?? 0,
  last_error: overrides.last_error ?? null,
})

const toastFromStatus = (status: RefreshStatusResponse): ToastPayload => {
  if (status.state === 'success') {
    return {
      variant: 'success',
      message: 'データ更新が完了しました',
      detail: `更新件数: ${status.updated_records}`,
    }
  }
  if (status.state === 'failure') {
    return {
      variant: 'error',
      message: 'データ更新に失敗しました',
      detail: status.last_error,
    }
  }
  return {
    variant: 'warning',
    message: 'データ更新の結果を取得できませんでした',
    detail: '更新状況を確認できませんでした。時間をおいて再試行してください。',
  }
}

const createFetchErrorToast = (error: unknown): ToastPayload => ({
  variant: 'error',
  message: '更新状況の取得に失敗しました',
  detail: error instanceof Error ? error.message : String(error),
})

export const useRefreshStatusController = (
  options?: UseRefreshStatusOptions,
): UseRefreshStatusResult => {
  const settings = useMemo(
    () => ({ pollIntervalMs: options?.pollIntervalMs ?? 2000, timeoutMs: options?.timeoutMs ?? 120000 }),
    [options?.pollIntervalMs, options?.timeoutMs],
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pendingToasts, setPendingToasts] = useState<RefreshToast[]>([])
  const active = useRef(false)
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completion = useRef<(() => void) | null>(null)
  const toastSeq = useRef(0)
  const startToastId = useRef<string | null>(null)
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pollerRef = useRef<ReturnType<typeof createRefreshStatusPoller> | null>(null)

  const cancelToastTimer = useCallback((id: string) => {
    const timer = toastTimers.current.get(id)
    if (!timer) return
    clearTimeout(timer)
    toastTimers.current.delete(id)
  }, [])

  const enqueue = useCallback((toast: ToastPayload, options?: { dedupe?: boolean }) => {
    if (options?.dedupe) {
      let insertedId: string | null = null
      setPendingToasts((prev) => {
        const exists = prev.some(
          (entry) =>
            entry.variant === toast.variant &&
            entry.message === toast.message &&
            entry.detail === toast.detail,
        )
        if (exists) {
          return prev
        }
        const id = String(++toastSeq.current)
        insertedId = id
        const timer = setTimeout(() => {
          setPendingToasts((current) => current.filter((entry) => entry.id !== id))
          toastTimers.current.delete(id)
        }, TOAST_AUTO_DISMISS_MS)
        toastTimers.current.set(id, timer)
        return [...prev, { ...toast, id }]
      })
      return insertedId
    }

    const id = String(++toastSeq.current)
    setPendingToasts((prev) => [...prev, { ...toast, id }])
    const timer = setTimeout(() => {
      setPendingToasts((prev) => prev.filter((entry) => entry.id !== id))
      toastTimers.current.delete(id)
    }, TOAST_AUTO_DISMISS_MS)
    toastTimers.current.set(id, timer)
    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    cancelToastTimer(id)
    setPendingToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [cancelToastTimer])

  const clearStartToast = useCallback(() => {
    const id = startToastId.current
    if (!id) return
    startToastId.current = null
    cancelToastTimer(id)
    setPendingToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [cancelToastTimer])

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => {
        clearTimeout(timer)
      })
      toastTimers.current.clear()
    },
    [],
  )

  const clearTimers = useCallback(() => {
    pollerRef.current?.stop()
    pollerRef.current = null
    if (timeoutTimer.current) {
      clearTimeout(timeoutTimer.current)
      timeoutTimer.current = null
    }
  }, [])

  const finish = useCallback(
    (toast?: ToastPayload) => {
      if (!active.current) return
      active.current = false
      clearStartToast()
      clearTimers()
      setIsRefreshing(false)
      completion.current?.()
      completion.current = null
      if (toast) {
        if (toast.variant === 'success') {
          options?.onSuccess?.()
        }
        enqueue(toast, { dedupe: toast.variant === 'warning' })
      }
    },
    [clearStartToast, clearTimers, enqueue, options?.onSuccess],
  )

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => {
        clearTimeout(timer)
      })
      toastTimers.current.clear()
      finish()
    },
    [finish],
  )

  const startRefresh = useCallback(async () => {
    if (active.current) return
    active.current = true
    setIsRefreshing(true)
    const completionPromise = new Promise<void>((resolve) => {
      completion.current = resolve
    })

    pollerRef.current = createRefreshStatusPoller({
      pollIntervalMs: settings.pollIntervalMs,
      fetchStatus: fetchRefreshStatus,
      isActive: () => active.current,
      onTerminal: (status) => {
        finish(toastFromStatus(status))
      },
      onError: (error) => {
        finish(createFetchErrorToast(error))
      },
    })

    timeoutTimer.current = setTimeout(() => {
      finish({ variant: 'warning', message: '更新状況の取得がタイムアウトしました', detail: null })
    }, settings.timeoutMs)

    try {
      const response = await postRefresh()
      if (!active.current) return
      if (isTerminalState(response.state)) {
        finish(toastFromStatus(buildStatus(response.state)))
      } else {
        clearStartToast()
        startToastId.current = enqueue({
          variant: 'info',
          message: REFRESH_STARTED_MESSAGE,
          detail: null,
        })
        void pollerRef.current?.run()
      }
    } catch (error) {
      finish({
        variant: 'error',
        message: '更新リクエストに失敗しました',
        detail: error instanceof Error ? error.message : String(error),
      })
    }

    await completionPromise
  }, [clearStartToast, enqueue, finish, settings.pollIntervalMs, settings.timeoutMs])

  return { isRefreshing, pendingToasts, startRefresh, dismissToast }
}

export const useRefreshStatus = useRefreshStatusController

export type { RefreshStatusResponse }
