import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchRefreshStatus, postRefresh } from '../../lib/api'
import type { RefreshState, RefreshStatusResponse } from '../../types'

import { createRefreshStatusPoller, isTerminalState } from './poller'

export type RefreshToastVariant = 'success' | 'error' | 'warning'

export interface RefreshToast {
  readonly id: string
  readonly variant: RefreshToastVariant
  readonly message: string
  readonly detail?: string | null
}

const TOAST_AUTO_DISMISS_MS = 5000
const STALE_TOAST_MESSAGE = 'データ更新の結果を取得できませんでした'
const FETCH_STATUS_ERROR_MESSAGE = '更新状況の取得に失敗しました'

export interface UseRefreshStatusOptions {
  readonly pollIntervalMs?: number
  readonly timeoutMs?: number
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
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pollerRef = useRef<ReturnType<typeof createRefreshStatusPoller> | null>(null)

  const clearToastTimer = useCallback((id: string) => {
    const timer = toastTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.current.delete(id)
    }
  }, [])

  const registerToastTimer = useCallback((id: string) => {
    clearToastTimer(id)
    const timer = setTimeout(() => {
      clearToastTimer(id)
      setPendingToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, TOAST_AUTO_DISMISS_MS)
    toastTimers.current.set(id, timer)
  }, [clearToastTimer])

  const dismissToast = useCallback(
    (id: string) => {
      clearToastTimer(id)
      setPendingToasts((prev) => prev.filter((toast) => toast.id !== id))
    },
    [clearToastTimer],
  )

  const shouldDeduplicate = useCallback(
    (existing: RefreshToast, toast: ToastPayload): boolean =>
      existing.message === toast.message &&
      ((toast.variant === 'warning' && toast.message === STALE_TOAST_MESSAGE) ||
        (toast.variant === 'error' && toast.message === FETCH_STATUS_ERROR_MESSAGE)),
    [],
  )

  const enqueue = useCallback(
    (toast: ToastPayload) => {
      setPendingToasts((prev) => {
        const duplicate = prev.find((existing) => shouldDeduplicate(existing, toast))
        if (duplicate) {
          registerToastTimer(duplicate.id)
          return prev.map((existing) =>
            existing.id === duplicate.id
              ? { ...existing, detail: toast.detail ?? existing.detail ?? null }
              : existing,
          )
        }
        const id = String(++toastSeq.current)
        registerToastTimer(id)
        return [...prev, { ...toast, id }]
      })
    },
    [registerToastTimer, shouldDeduplicate],
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
      clearTimers()
      setIsRefreshing(false)
      completion.current?.()
      completion.current = null
      if (toast) enqueue(toast)
    },
    [clearTimers, enqueue],
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
  }, [finish, settings.pollIntervalMs, settings.timeoutMs])

  return { isRefreshing, pendingToasts, startRefresh, dismissToast }
}

export const useRefreshStatus = useRefreshStatusController

export type { RefreshStatusResponse }
