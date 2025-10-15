import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TOAST_AUTO_DISMISS_MS } from '../../constants/toast'
import { TOAST_MESSAGES } from '../../constants/messages'
import { fetchRefreshStatus, postRefresh } from '../../lib/api'
import type { RefreshStatusResponse } from '../../types'
import { setLastSync } from '../../lib/swClient'

import { createRefreshStatusPoller, isTerminalState } from './poller'

type RefreshLastSyncSnapshot = {
  readonly finished_at: string
  readonly updated_records: number
}

const LAST_SYNC_STORAGE_KEY = 'refresh:lastSync'

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage

const parseLastSync = (value: unknown): RefreshLastSyncSnapshot | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.finished_at !== 'string') return null
  if (typeof record.updated_records !== 'number') return null
  return { finished_at: record.finished_at, updated_records: record.updated_records }
}

const readLastSyncFromStorage = (): RefreshLastSyncSnapshot | null => {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(LAST_SYNC_STORAGE_KEY)
    if (!raw) return null
    return parseLastSync(JSON.parse(raw))
  } catch {
    return null
  }
}

let cachedLastSync: RefreshLastSyncSnapshot | null | undefined

const getCachedLastSync = (): RefreshLastSyncSnapshot | null => {
  if (canUseStorage()) {
    const snapshot = readLastSyncFromStorage()
    cachedLastSync = snapshot
    return snapshot
  }
  if (cachedLastSync === undefined) {
    cachedLastSync = null
  }
  return cachedLastSync
}

const persistLastSync = (snapshot: RefreshLastSyncSnapshot | null): void => {
  cachedLastSync = snapshot
  if (!canUseStorage()) return
  try {
    if (!snapshot) {
      window.localStorage.removeItem(LAST_SYNC_STORAGE_KEY)
    } else {
      window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, JSON.stringify(snapshot))
    }
  } catch {
    // noop
  }
}

type LastSyncSource = Pick<RefreshStatusResponse, 'state'> &
  Partial<Pick<RefreshStatusResponse, 'finished_at' | 'updated_records'>>

const extractLastSync = (status: LastSyncSource): RefreshLastSyncSnapshot | null => {
  if (status.state !== 'success' || !status.finished_at) {
    return null
  }
  return { finished_at: status.finished_at, updated_records: status.updated_records ?? 0 }
}

export type RefreshToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface RefreshToast {
  readonly id: string
  readonly variant: RefreshToastVariant
  readonly message: string
  readonly detail?: string | null
}

export interface UseRefreshStatusOptions {
  readonly pollIntervalMs?: number
  readonly timeoutMs?: number
  readonly onSuccess?: () => void | Promise<void>
}

export interface UseRefreshStatusResult {
  readonly isRefreshing: boolean
  readonly pendingToasts: ReadonlyArray<RefreshToast>
  readonly startRefresh: () => Promise<void>
  readonly dismissToast: (id: string) => void
  readonly lastSync: RefreshLastSyncSnapshot | null
}

type ToastPayload = Omit<RefreshToast, 'id'>

type ToastStatus =
  | RefreshStatusResponse
  | (Pick<RefreshStatusResponse, 'state'> &
      Partial<Pick<RefreshStatusResponse, 'updated_records' | 'last_error' | 'finished_at'>>)

const toastFromStatus = (status: ToastStatus): ToastPayload => {
  if (status.state === 'success') {
    return {
      variant: 'success',
      message: TOAST_MESSAGES.refreshSuccessMessage,
      detail: TOAST_MESSAGES.refreshSuccessDetail(status.updated_records ?? 0),
    }
  }
  if (status.state === 'failure') {
    return {
      variant: 'error',
      message: TOAST_MESSAGES.refreshFailureMessage,
      detail: status.last_error ?? null,
    }
  }
  return {
    variant: 'warning',
    message: TOAST_MESSAGES.refreshUnknown,
    detail: TOAST_MESSAGES.refreshStatusUnknownDetail,
  }
}

const createFetchErrorToast = (error: unknown): ToastPayload => ({
  variant: 'error',
  message: TOAST_MESSAGES.refreshStatusFetchFailureMessage,
  detail: error instanceof Error ? error.message : String(error),
})

export const useRefreshStatusController = (
  options?: UseRefreshStatusOptions,
): UseRefreshStatusResult => {
  const settings = useMemo(
    () => ({ pollIntervalMs: options?.pollIntervalMs ?? 5000, timeoutMs: options?.timeoutMs ?? 120000 }),
    [options?.pollIntervalMs, options?.timeoutMs],
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pendingToasts, setPendingToasts] = useState<RefreshToast[]>([])
  const [lastSync, setLastSync] = useState<RefreshLastSyncSnapshot | null>(() => getCachedLastSync())
  const active = useRef(false)
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completion = useRef<(() => void) | null>(null)
  const toastSeq = useRef(0)
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pollerRef = useRef<ReturnType<typeof createRefreshStatusPoller> | null>(null)

  const cancelToastTimer = useCallback((id: string) => {
    const timer = toastTimers.current.get(id)
    if (!timer) return
    clearTimeout(timer)
    toastTimers.current.delete(id)
  }, [])

  const enqueue = useCallback((toast: ToastPayload) => {
    const id = String(++toastSeq.current)
    setPendingToasts((prev) => [...prev, { ...toast, id }])
    const timer = setTimeout(() => {
      setPendingToasts((prev) => prev.filter((entry) => entry.id !== id))
      toastTimers.current.delete(id)
    }, TOAST_AUTO_DISMISS_MS)
    toastTimers.current.set(id, timer)
  }, [])

  const dismissToast = useCallback((id: string) => {
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
    (toast?: ToastPayload, status?: LastSyncSource) => {
      if (!active.current) return
      active.current = false
      clearTimers()
      setIsRefreshing(false)
      completion.current?.()
      completion.current = null
      if (status) {
        const snapshot = extractLastSync(status)
        if (snapshot) {
          persistLastSync(snapshot)
          setLastSync(snapshot)
        }
      }
      if (toast) {
        if (toast.variant === 'success') {
          setLastSync(new Date().toISOString())
          void Promise.resolve(options?.onSuccess?.()).catch(() => undefined)
        }
        enqueue(toast)
      }
    },
    [clearTimers, enqueue, options?.onSuccess],
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
        finish(toastFromStatus(status), status)
      },
      onError: (error) => {
        finish(createFetchErrorToast(error))
      },
    })

    timeoutTimer.current = setTimeout(() => {
      finish({
        variant: 'warning',
        message: TOAST_MESSAGES.refreshStatusTimeout,
        detail: TOAST_MESSAGES.refreshStatusTimeoutDetail,
      })
    }, settings.timeoutMs)

    try {
      const response = await postRefresh()
      if (!active.current) return
      if (isTerminalState(response.state)) {
        finish(toastFromStatus(response), response)
      } else {
        enqueue({ variant: 'info', message: TOAST_MESSAGES.refreshRequestStarted, detail: null })
        void pollerRef.current?.run()
      }
    } catch (error) {
      finish({
        variant: 'error',
        message: TOAST_MESSAGES.refreshRequestFailure,
        detail: error instanceof Error ? error.message : String(error),
      })
    }

    await completionPromise
  }, [finish, settings.pollIntervalMs, settings.timeoutMs])

  return { isRefreshing, pendingToasts, startRefresh, dismissToast, lastSync }
}

export const useRefreshStatus = useRefreshStatusController

export type { RefreshStatusResponse }
